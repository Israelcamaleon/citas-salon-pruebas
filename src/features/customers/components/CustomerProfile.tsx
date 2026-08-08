'use client'
import useSWR from "swr"
import Link from "next/link"
import dayjs from "dayjs"
import { asArray, fetcher } from "@/lib/api"
import { statusChipClass, statusLabel } from "@/lib/bookingStatus"

const SEXO_LABELS: Record<string, string> = { mujer: "Mujer", hombre: "Hombre", otro: "Otro" }

type Customer = { id: number; name: string; phone: string | null; email: string | null; notes: string | null; sexo: string | null }
type Booking = {
  id: number; date: string; status: string | null
  service?: { name: string } | null
  staff?: { name: string } | null
  customerId?: number | null
}
type Card = {
  id: number; balance: number; status: string; serviceUsage: unknown
  program?: { name: string; type: string; config?: Record<string, unknown> | null } | null
}

const CARD_STATUS: Record<string, string> = {
  ACTIVE: "Activa", REDEEMED: "Canjeada", EXPIRED: "Vencida", BLOCKED: "Bloqueada",
}

function cardProgress(card: Card): string {
  const type = card.program?.type
  const cfg = (card.program?.config ?? {}) as Record<string, unknown>
  if (type === "STAMP") {
    const needed = typeof cfg.stampsNeeded === "number" ? cfg.stampsNeeded : null
    return needed ? `${card.balance}/${needed} sellos` : `${card.balance} sellos`
  }
  if (type === "CASHBACK" || type === "PREPAID") return `$${Number(card.balance).toFixed(2)}`
  if (type === "SERVICE") {
    const services = Array.isArray(cfg.services) ? cfg.services as { name?: string; total?: number }[] : []
    const usage = (card.serviceUsage ?? {}) as Record<string, number>
    const total = services.reduce((a, s) => a + (Number(s.total) || 0), 0)
    const usados = services.reduce((a, s) => a + (Number(usage[s.name ?? ""]) || 0), 0)
    return total ? `${usados}/${total} servicios` : `${card.balance} servicios`
  }
  return String(card.balance)
}

export default function CustomerProfile({ customerId, onClose }: { customerId: number; onClose: () => void }) {
  const { data: customer } = useSWR<Customer>(`/api/customers/${customerId}`, fetcher)
  const { data: bookingsData } = useSWR<Booking[]>("/api/bookings", fetcher)
  const { data: cardsData } = useSWR<Card[]>(`/api/loyalty/cards?customerId=${customerId}`, fetcher)

  const citas = asArray<Booking>(bookingsData)
    .filter((b) => b.customerId === customerId)
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
  const tarjetas = asArray<Card>(cardsData)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {!customer ? (
          <div className="text-center text-lh-muted py-8">Cargando…</div>
        ) : (
          <>
            {/* Encabezado */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-lg font-bold leading-tight">{customer.name}</div>
                <div className="text-sm text-lh-muted mt-0.5 flex flex-wrap gap-x-3">
                  {customer.sexo && <span>{SEXO_LABELS[customer.sexo] ?? customer.sexo}</span>}
                  {customer.phone && (
                    <a className="text-lh-accent" href={`tel:${customer.phone}`}>📞 {customer.phone}</a>
                  )}
                  {customer.email && <span>{customer.email}</span>}
                </div>
              </div>
              <button type="button" onClick={onClose} className="text-lh-muted text-xl leading-none px-1" aria-label="Cerrar">✕</button>
            </div>

            {/* Notas */}
            {customer.notes && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                <div className="font-semibold text-amber-800 text-xs mb-1">Notas</div>
                {customer.notes}
              </div>
            )}

            {/* Tarjetas de lealtad */}
            <div>
              <div className="font-semibold text-sm mb-2">Tarjetas de lealtad</div>
              {tarjetas.length === 0 ? (
                <div className="text-sm text-lh-muted">Sin tarjetas todavía.</div>
              ) : (
                <div className="space-y-2">
                  {tarjetas.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div>
                        <div className="font-medium">{c.program?.name ?? "Tarjeta"}</div>
                        <div className="text-xs text-lh-muted">{c.program?.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{cardProgress(c)}</div>
                        <div className="text-xs text-lh-muted">{CARD_STATUS[c.status] ?? c.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de citas */}
            <div>
              <div className="font-semibold text-sm mb-2">Historial de citas</div>
              {citas.length === 0 ? (
                <div className="text-sm text-lh-muted">Sin citas registradas.</div>
              ) : (
                <div className="space-y-2">
                  {citas.slice(0, 15).map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div>
                        <div className="font-medium">{b.service?.name ?? "Servicio"}</div>
                        <div className="text-xs text-lh-muted">
                          {dayjs(b.date).format("DD/MM/YYYY HH:mm")}
                          {b.staff?.name ? ` · Atiende: ${b.staff.name}` : ""}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusChipClass(b.status)}`}>
                        {statusLabel(b.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link href={`/ficha/${customer.id}`} className="btn btn-primary w-full text-center block" onClick={onClose}>
              📋 Ver ficha técnica
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
