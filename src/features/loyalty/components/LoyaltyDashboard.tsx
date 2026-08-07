'use client'

import useSWR from "swr"
import { useState } from "react"
import type { LoyaltyCard, LoyaltySummary } from "@/types/loyalty"
import dayjs from "dayjs"
import { asArray, fetcher } from "@/lib/api"
import { LOYALTY_TYPE_LABELS } from "@/lib/loyalty"

const TX_LABELS: Record<string, string> = {
  STAMP: "Sello",
  SERVICE_USE: "Uso servicio",
  REDEEM: "Canje",
  LOAD: "Recarga",
  CASHBACK_EARN: "Cashback",
  CASHBACK_REDEEM: "Canje cashback",
  DISCOUNT_APPLY: "Descuento",
  COUPON_USE: "Cupón",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  REDEEMED: "Canjeada",
  EXPIRED: "Vencida",
  BLOCKED: "Bloqueada",
}

function progressText(card: LoyaltyCard): string {
  const cfg = card.program?.config
  if (!cfg) return "—"
  switch (cfg.type) {
    case "STAMP":
      return `${card.balance}/${cfg.stampsNeeded} sellos`
    case "SERVICE": {
      const total = cfg.services.reduce((acc, s) => acc + s.total, 0)
      const used = Object.values(card.serviceUsage ?? {}).reduce((acc, n) => acc + n, 0)
      return `${used}/${total} servicios`
    }
    case "GIFT":
    case "PREPAID":
    case "CASHBACK":
      return `$${card.balance} saldo`
    default:
      return "—"
  }
}

export default function LoyaltyDashboard() {
  const { data, isLoading, error } = useSWR<LoyaltySummary>("/api/loyalty/reports/summary", fetcher)
  const { data: cardsData } = useSWR<LoyaltyCard[]>("/api/loyalty/cards", fetcher)
  const recent = asArray<LoyaltySummary["recentTransactions"][number]>(data?.recentTransactions)
  const allCards = asArray<LoyaltyCard>(cardsData)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const q = search.trim().toLowerCase()
  const filteredCards = allCards.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false
    if (!q) return true
    const name = c.customer?.name?.toLowerCase() ?? ""
    const phone = c.customer?.phone ?? ""
    const program = c.program?.name?.toLowerCase() ?? ""
    return name.includes(q) || phone.includes(q) || program.includes(q)
  })

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tarjetas`
      : "/tarjetas"

  function copyQrUrl() {
    navigator.clipboard.writeText(publicUrl)
    alert("URL copiada al portapapeles")
  }

  if (isLoading) return <p className="text-sm text-lh-muted">Cargando…</p>
  if (error) {
    return (
      <div className="card text-sm text-lh-danger">
        No se pudo cargar el resumen: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="stat-card">
          <div className="lbl">Programas activos</div>
          <div className="val">{data?.totalPrograms ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="lbl">Tarjetas activas</div>
          <div className="val">{data?.activeCards ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="lbl">Clientes con tarjeta</div>
          <div className="val">{data?.totalCustomers ?? 0}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">URL para clientes (QR)</h3>
        <p className="text-sm text-lh-muted mb-3">
          Los clientes abren este enlace o escanean el QR. Opcional:{" "}
          <code className="bg-lh-bg px-1 rounded text-xs">?tel=4421234567</code>
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <code className="text-sm bg-lh-bg px-2 py-1.5 rounded flex-1 min-w-0 truncate border border-lh-border">
            {publicUrl}
          </code>
          <button type="button" className="btn text-sm" onClick={copyQrUrl}>
            Copiar URL
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Clientes con tarjeta</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            className="input flex-1 min-w-[180px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o programa…"
          />
          <select
            className="input w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todas</option>
            <option value="ACTIVE">Activas</option>
            <option value="REDEEMED">Canjeadas</option>
            <option value="EXPIRED">Vencidas</option>
            <option value="BLOCKED">Bloqueadas</option>
          </select>
        </div>
        {filteredCards.length === 0 ? (
          <p className="text-sm text-lh-muted">
            {allCards.length === 0 ? "Aún no hay tarjetas emitidas." : "Sin resultados con ese filtro."}
          </p>
        ) : (
          <div className="divide-y divide-lh-border">
            {filteredCards.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: c.program?.color ?? "#999" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {c.customer?.name ?? `Cliente #${c.customerId}`}
                  </div>
                  <div className="text-[11px] text-lh-muted">
                    {c.customer?.phone ?? "sin teléfono"} ·{" "}
                    {c.program ? `${LOYALTY_TYPE_LABELS[c.program.type] ?? c.program.type} · ${c.program.name}` : "—"}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium">{progressText(c)}</div>
                  <div className="text-[11px] text-lh-muted">{STATUS_LABELS[c.status] ?? c.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="section-title">Actividad reciente</h3>
        {(recent.length === 0) ? (
          <p className="text-sm text-lh-muted">Sin transacciones aún.</p>
        ) : (
          <div className="divide-y divide-lh-border">
            {recent.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2.5">
                <div className="w-9 h-9 rounded-full bg-lh-accent/15 flex items-center justify-center text-sm flex-shrink-0">
                  {tx.type === "STAMP" ? "🎫" : tx.type.includes("CASHBACK") ? "💵" : "✓"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{TX_LABELS[tx.type] ?? tx.type}</div>
                  <div className="text-[11px] text-lh-muted">
                    {tx.staff?.name ?? "—"} · {dayjs(tx.createdAt).format("DD/MM HH:mm")}
                  </div>
                </div>
                <div className="text-sm font-medium">{tx.amount}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
