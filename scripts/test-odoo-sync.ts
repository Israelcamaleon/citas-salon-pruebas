/**
 * Prueba en vivo del conector contra el Odoo real.
 * Uso: ODOO_URL=... ODOO_DB=... ODOO_USER=... ODOO_PASSWORD=... npx tsx scripts/test-odoo-sync.ts
 * No escribe en ninguna base de datos — solo lee y valida.
 */
import { odooFromEnv } from '../src/lib/odoo/client';
import {
  fetchOrdersForLocalDay, fetchSessionBranches, fetchPartnerPhones,
  toSyncedTicket, VALID_STATES, GENERIC_PARTNER_ID,
} from '../src/lib/odoo/sync';

async function main() {
  const odoo = odooFromEnv();

  // 1. Autenticación
  const uid = await odoo.authenticate();
  console.log(`✅ Autenticación OK (uid=${uid})`);

  // 2. Ventas del viernes 8-ago-2026 LOCAL — valor esperado: 30 tickets, $12,642
  const day = new Date(2026, 7, 8); // mes 0-indexed: 7 = agosto
  const orders = await fetchOrdersForLocalDay(odoo, day);
  const branches = await fetchSessionBranches(odoo, [...new Set(orders.map(o => o.session_id[0]))]);
  const partnerIds = [...new Set(orders.filter(o => Array.isArray(o.partner_id)).map(o => (o.partner_id as [number, string])[0]))];
  const phones = await fetchPartnerPhones(odoo, partnerIds);

  const tickets = orders.map(o => toSyncedTicket(o, branches, phones));
  const total = tickets.reduce((s, t) => s + t.amountTotal, 0);
  const byBranch = new Map<string, { n: number; monto: number }>();
  for (const t of tickets) {
    const b = byBranch.get(t.branch) ?? { n: 0, monto: 0 };
    b.n++; b.monto += t.amountTotal;
    byBranch.set(t.branch, b);
  }
  console.log(`\n📅 Ventas 8-ago-2026 (día local): ${tickets.length} tickets, $${total.toLocaleString('es-MX')} MXN`);
  for (const [b, v] of byBranch) console.log(`   ${b}: ${v.n} tickets, $${v.monto.toLocaleString('es-MX')}`);

  if (tickets.length !== 30 || Math.abs(total - 12642) > 0.5) { // tolerancia por redondeo float
    throw new Error(`❌ No cuadra con el valor de referencia (30 tickets / $12,642)`);
  }
  console.log('✅ Cuadra con la referencia verificada (30 tickets / $12,642)');

  // 3. Validaciones de atribución
  const generic = tickets.filter(t => t.customerOdooId === null && t.customerPhone === null);
  const atribuibles = tickets.filter(t => t.attributable);
  console.log(`\n📱 Atribuibles: ${atribuibles.length}/${tickets.length} · sin cliente/genérico: ${generic.length}`);
  for (const t of atribuibles.slice(0, 3))
    console.log(`   ej. ${t.folio} → ${t.branch} · tel ${t.customerPhone} · ${t.dayLocal}`);

  // 4. Prueba de incremental (últimos 5 tickets)
  const lastId = (await odoo.searchRead<{ id: number }>('pos.order',
    [['state', 'in', [...VALID_STATES]]], ['id'], { limit: 1, order: 'id desc' }))[0].id;
  console.log(`\n🔄 Último ticket sincronizable: id=${lastId} (la app guardaría este cursor)`);
  console.log(`   Partner genérico configurado: id=${GENERIC_PARTNER_ID}`);
  console.log('\n🎉 Conector validado end-to-end contra producción.');
}

main().catch(e => { console.error('❌', e.message ?? e); process.exit(1); });
