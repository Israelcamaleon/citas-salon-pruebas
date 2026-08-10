/**
 * Lógica de sincronización Odoo → base de datos.
 * TODAS las reglas de negocio verificadas contra el servidor real (10-ago-2026).
 */
import { OdooClient } from './client';
import { normalizePhone } from '../phone';

/** Estados que SÍ son ventas cobradas. Verificado: done 69,215 · paid 99 · invoiced 31 · cancel 3 */
export const VALID_STATES = ['paid', 'done', 'invoiced'] as const;

/** Partner genérico "venta mostrador" (id verificado en producción) → unattributed */
export const GENERIC_PARTNER_ID = 18529;

/** México (Querétaro) es UTC−6 todo el año desde 2022 (sin horario de verano) */
export const TZ_OFFSET_HOURS = Number(process.env.ODOO_TZ_OFFSET_HOURS ?? 6);

// ---------- Zona horaria ----------

/** Odoo guarda date_order en UTC "YYYY-MM-DD HH:MM:SS" → Date local (UTC−6) */
export function odooDateToLocal(dateOrderUtc: string): Date {
  const utcMs = new Date(dateOrderUtc.replace(' ', 'T') + 'Z').getTime();
  return new Date(utcMs - TZ_OFFSET_HOURS * 3600 * 1000);
}

/** El día LOCAL D abarca [D 06:00 UTC, D+1 06:00 UTC) */
export function localDayToUtcWindow(day: Date): { ini: string; fin: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  const ini = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), TZ_OFFSET_HOURS, 0, 0));
  const fin = new Date(ini.getTime() + 24 * 3600 * 1000);
  return { ini: fmt(ini), fin: fmt(fin) };
}

/** YYYY-MM-DD del día local en el que cayó la venta (para agrupar revenue/ROAS) */
export function localDayKey(dateOrderUtc: string): string {
  const d = odooDateToLocal(dateOrderUtc);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------- Sucursales ----------

/**
 * pos.session.config_id viene con sufijo " (no usado)" — verificado en vivo.
 * Existen 4 configs: Zaragoza(1), Terranova(2), Juriquilla(3), Heeler Studio(4).
 * Terranova sin actividad reciente; operación diaria = Zaragoza + Juriquilla.
 */
export function cleanBranchName(configName: string): string {
  // Cualquier sufijo entre paréntesis se quita: " (no usado)", " (98 Recepcion Juriquilla)", etc.
  return configName.replace(/\s*\(.*\)\s*$/, '').trim();
}

// ---------- DTOs ----------

export interface OdooOrder {
  id: number;
  name: string;                    // folio (NO único global; Juriquilla viene "Juruquilla/…")
  date_order: string;              // UTC
  amount_total: number;            // con IVA 16%, MXN
  state: string;
  partner_id: [number, string] | false;
  session_id: [number, string];
  lines: number[];
}

export interface SyncedTicket {
  odooId: number;
  folio: string;
  dateUtc: Date;
  dayLocal: string;                // YYYY-MM-DD local — USAR para ROAS diario
  amountTotal: number;
  branch: string;                  // "Zaragoza" | "Juriquilla" | "Heeler Studio" | "Terranova"
  attributable: boolean;           // false si partner genérico o sin partner
  customerPhone: string | null;    // 10 dígitos normalizados, llave de atribución
  customerOdooId: number | null;
}

// ---------- Consultas ----------

/** Tickets cobrados de un día LOCAL (verificado: 8-ago-2026 → 30 tickets, $12,642) */
export async function fetchOrdersForLocalDay(odoo: OdooClient, day: Date): Promise<OdooOrder[]> {
  const { ini, fin } = localDayToUtcWindow(day);
  return odoo.searchRead<OdooOrder>('pos.order', [
    ['date_order', '>=', ini],
    ['date_order', '<', fin],
    ['state', 'in', [...VALID_STATES]],
  ], ['id', 'name', 'date_order', 'amount_total', 'state', 'partner_id', 'session_id', 'lines'],
    { limit: 1000, order: 'id asc' });
}

/** Sincronización incremental: solo tickets con id > lastSyncedId (los tickets no se editan tras cobrarse) */
export async function* fetchOrdersSince(odoo: OdooClient, lastSyncedId: number) {
  yield* odoo.searchReadPaged<OdooOrder>('pos.order', [
    ['id', '>', lastSyncedId],
    ['state', 'in', [...VALID_STATES]],
  ], ['id', 'name', 'date_order', 'amount_total', 'state', 'partner_id', 'session_id', 'lines'], 2000);
}

/** Mapa sessionId → sucursal limpia */
export async function fetchSessionBranches(odoo: OdooClient, sessionIds: number[]): Promise<Map<number, string>> {
  if (sessionIds.length === 0) return new Map();
  const rows = await odoo.searchRead<{ id: number; config_id: [number, string] }>(
    'pos.session', [['id', 'in', sessionIds]], ['id', 'config_id'], { limit: sessionIds.length });
  return new Map(rows.map(r => [r.id, cleanBranchName(r.config_id[1])]));
}

/** Mapa partnerId → { phone normalizado } */
export async function fetchPartnerPhones(odoo: OdooClient, partnerIds: number[]): Promise<Map<number, string | null>> {
  if (partnerIds.length === 0) return new Map();
  const rows = await odoo.searchRead<{ id: number; phone: string | false; mobile: string | false }>(
    'res.partner', [['id', 'in', partnerIds]], ['id', 'phone', 'mobile'], { limit: partnerIds.length });
  return new Map(rows.map(r => [r.id, normalizePhone(r.mobile || '') ?? normalizePhone(r.phone || '')]));
}

/** Enriquece un ticket crudo con sucursal + teléfono + flags de atribución */
export function toSyncedTicket(
  o: OdooOrder,
  branches: Map<number, string>,
  phones: Map<number, string | null>,
): SyncedTicket {
  const partnerId = Array.isArray(o.partner_id) ? o.partner_id[0] : null;
  const sessionId = o.session_id[0];
  const phone = partnerId ? phones.get(partnerId) ?? null : null;
  const isGeneric = partnerId === GENERIC_PARTNER_ID;
  return {
    odooId: o.id,
    folio: o.name,
    dateUtc: new Date(o.date_order.replace(' ', 'T') + 'Z'),
    dayLocal: localDayKey(o.date_order),
    amountTotal: o.amount_total,
    branch: branches.get(sessionId) ?? 'Desconocida',
    attributable: Boolean(partnerId) && !isGeneric && Boolean(phone),
    customerPhone: phone,
    customerOdooId: isGeneric ? null : partnerId,
  };
}
