'use client'

import useSWR from "swr"
import type { LoyaltySummary } from "@/types/loyalty"
import dayjs from "dayjs"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TX_LABELS: Record<string, string> = {
  STAMP: "Sello",
  SERVICE_USE: "Uso servicio",
  REDEEM: "Canje",
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

  if (isLoading) return <p className="text-sm text-gray-500">Cargando…</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Programas activos" value={data?.totalPrograms ?? 0} />
        <StatCard label="Tarjetas activas" value={data?.activeCards ?? 0} />
        <StatCard label="Clientes con tarjeta" value={data?.totalCustomers ?? 0} />
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-medium mb-2">URL para clientes (QR)</h3>
        <p className="text-sm text-gray-600 mb-2">
          Los clientes escanean el QR o abren este enlace para ver sus tarjetas.
          Opcional: <code className="bg-gray-100 px-1 rounded">?tel=4421234567</code> pre-llena el celular.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 min-w-0 truncate">
            {publicUrl}
          </code>
          <button type="button" className="btn text-sm" onClick={copyQrUrl}>
            Copiar URL
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Actividad reciente</h3>
        {(data?.recentTransactions ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Sin transacciones aún.</p>
        ) : (
          <table className="w-full text-sm border rounded-lg bg-white">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-2">Fecha</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Cant.</th>
                <th className="p-2">Staff</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b">
                  <td className="p-2">{dayjs(tx.createdAt).format("DD/MM HH:mm")}</td>
                  <td className="p-2">{TX_LABELS[tx.type] ?? tx.type}</td>
                  <td className="p-2">{tx.amount}</td>
                  <td className="p-2">{tx.staff?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  )
}
