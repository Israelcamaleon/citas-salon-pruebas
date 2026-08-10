/**
 * Carga histórica ÚNICA de tickets Odoo → base de datos de pruebas.
 * Se corre desde fuera de Vercel (sin límite de 60s) y escribe directo
 * con la misma lógica que el cron diario, pero en lotes.
 * Uso: npx dotenv -e .env -- npx tsx scripts/backfill-odoo.ts
 */
import { PrismaClient } from "@prisma/client"
import { odooFromEnv } from "../src/lib/odoo/client"
import {
  fetchOrdersSince, fetchSessionBranches, fetchPartnerPhones, toSyncedTicket,
} from "../src/lib/odoo/sync"
import { normalizePhone } from "../src/lib/phone"

// Puerto 5432 (session mode) para evitar conflicto de prepared statements del pooler
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } })

async function customerPhoneMap(): Promise<Map<string, number>> {
  const customers = await prisma.customer.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  })
  const map = new Map<string, number>()
  for (const c of customers) {
    const n = normalizePhone(c.phone)
    if (n && !map.has(n)) map.set(n, c.id)
  }
  return map
}

async function main() {
  const odoo = odooFromEnv()
  const phoneMap = await customerPhoneMap()
  console.log(`Clientes CRM con teléfono: ${phoneMap.size}`)

  let synced = 0
  let linked = 0
  let lastId = 0
  const started = Date.now()

  for await (const page of fetchOrdersSince(odoo, 0)) {
    const branches = await fetchSessionBranches(odoo, [...new Set(page.map(o => o.session_id[0]))])
    const partnerIds = [...new Set(page.filter(o => Array.isArray(o.partner_id)).map(o => (o.partner_id as [number, string])[0]))]
    const phones = await fetchPartnerPhones(odoo, partnerIds)

    const rows = page.map(raw => {
      const t = toSyncedTicket(raw, branches, phones)
      const customerId = t.customerPhone ? phoneMap.get(t.customerPhone) ?? null : null
      if (customerId) linked++
      lastId = Math.max(lastId, t.odooId)
      return {
        odooId: t.odooId,
        folio: t.folio,
        dateUtc: t.dateUtc,
        dayLocal: t.dayLocal,
        amountTotal: t.amountTotal,
        branch: t.branch,
        attributable: t.attributable,
        customerPhone: t.customerPhone,
        odooPartnerId: t.customerOdooId,
        customerId,
      }
    })

    // Lotes de 500 para no saturar el pooler
    for (let i = 0; i < rows.length; i += 500) {
      await prisma.posTicket.createMany({ data: rows.slice(i, i + 500), skipDuplicates: true })
    }

    synced += rows.length
    console.log(`  ${synced} tickets… (último id ${lastId}, ${Math.round((Date.now() - started) / 1000)}s)`)
  }

  await prisma.syncState.upsert({
    where: { id: "odoo" },
    update: { lastOdooId: lastId, lastRunAt: new Date(), lastOkAt: new Date(), lastError: null },
    create: { id: "odoo", lastOdooId: lastId, lastOkAt: new Date() },
  })

  const total = await prisma.posTicket.count()
  console.log(`\n✅ Histórico completo: ${synced} leídos de Odoo, ${total} en BD, ${linked} ligados a clientes CRM. Cursor=${lastId}`)
}

main().catch(e => { console.error("❌", e); process.exit(1) }).finally(() => prisma.$disconnect())
