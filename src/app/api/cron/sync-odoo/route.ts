/**
 * Cron diario: sincronización incremental Odoo → base de datos.
 * Vercel lo llama según vercel.json ("0 8 * * *" = 2 AM Querétaro).
 * Protección: Vercel envía Authorization: Bearer <CRON_SECRET>.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // plan Pro; en Hobby los ~20 tickets diarios caben en 60s (la 1ª corrida histórica es la larga)

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { odooFromEnv } from "@/lib/odoo/client"
import {
  fetchOrdersSince, fetchSessionBranches, fetchPartnerPhones, toSyncedTicket,
} from "@/lib/odoo/sync"
import { normalizePhone } from "@/lib/phone"

/** Mapa teléfono normalizado (10 dígitos) → id de Customer existente en el CRM */
async function customerPhoneMap(): Promise<Map<string, number>> {
  const customers = await prisma.customer.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  })
  const map = new Map<string, number>()
  for (const c of customers) {
    const normalized = normalizePhone(c.phone)
    if (normalized && !map.has(normalized)) map.set(normalized, c.id)
  }
  return map
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const odoo = odooFromEnv()
  const state = await prisma.syncState.upsert({
    where: { id: "odoo" }, update: {}, create: { id: "odoo" },
  })

  let synced = 0
  let linked = 0
  let lastId = state.lastOdooId

  try {
    const phoneMap = await customerPhoneMap()

    for await (const page of fetchOrdersSince(odoo, state.lastOdooId)) {
      const branches = await fetchSessionBranches(odoo, [...new Set(page.map(o => o.session_id[0]))])
      const partnerIds = [...new Set(page.filter(o => Array.isArray(o.partner_id)).map(o => (o.partner_id as [number, string])[0]))]
      const phones = await fetchPartnerPhones(odoo, partnerIds)

      for (const raw of page) {
        const t = toSyncedTicket(raw, branches, phones)

        // Ligar SOLO con clientes ya existentes en el CRM (no crear duplicados)
        const customerId = t.customerPhone ? phoneMap.get(t.customerPhone) ?? null : null
        if (customerId) linked++

        await prisma.posTicket.upsert({
          where: { odooId: t.odooId },
          update: { customerId },
          create: {
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
          },
        })

        lastId = Math.max(lastId, t.odooId)
        synced++
      }
    }

    await prisma.syncState.update({
      where: { id: "odoo" },
      data: { lastOdooId: lastId, lastRunAt: new Date(), lastOkAt: new Date(), lastError: null },
    })

    return NextResponse.json({ ok: true, synced, linked, cursor: lastId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await prisma.syncState.update({
      where: { id: "odoo" }, data: { lastRunAt: new Date(), lastError: msg },
    })
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
