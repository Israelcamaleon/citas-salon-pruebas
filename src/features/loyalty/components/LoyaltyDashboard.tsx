'use client'

import useSWR from "swr"
import type { LoyaltySummary } from "@/types/loyalty"
import dayjs from "dayjs"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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

export default function LoyaltyDashboard() {
  const { data, isLoading } = useSWR<LoyaltySummary>("/api/loyalty/reports/summary", fetcher)

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tarjetas`
      : "/tarjetas"

  function copyQrUrl() {
    navigator.clipboard.writeText(publicUrl)
    alert("URL copiada al portapapeles")
  }

  if (isLoading) return <p className="text-sm text-lh-muted">Cargando…</p>

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
        <h3 className="section-title">Actividad reciente</h3>
        {(data?.recentTransactions ?? []).length === 0 ? (
          <p className="text-sm text-lh-muted">Sin transacciones aún.</p>
        ) : (
          <div className="divide-y divide-lh-border">
            {data?.recentTransactions.map((tx) => (
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
