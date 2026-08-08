'use client'

import { useState } from "react"
import axios from "axios"
import { toast } from "@/lib/toast"

type Props = {
  bookingId: number
  status?: string | null
  customerId?: number | null
  customerName?: string | null
  customerPhone?: string | null
  /** se llama después de cualquier cambio para recargar datos */
  onChanged: () => void
  compact?: boolean
}

/** Botones de acción de una cita: Confirmar / Completar / Cancelar / Sellar tarjeta / Llamar */
export default function BookingActions({
  bookingId,
  status,
  customerId,
  customerName,
  customerPhone,
  onChanged,
  compact,
}: Props) {
  const [busy, setBusy] = useState(false)
  const st = status ?? "scheduled"

  async function setStatus(nuevo: string) {
    if (busy) return
    if (nuevo === "cancelled" && !window.confirm("¿Cancelar esta cita?")) return
    setBusy(true)
    try {
      await axios.patch(`/api/bookings/${bookingId}`, { status: nuevo })
      toast(
        nuevo === "confirmed" ? "✅ Cita confirmada"
        : nuevo === "completed" ? "✔ Cita completada — ¿quieres sellar su tarjeta?"
        : "🚫 Cita cancelada"
      )
      onChanged()
    } catch {
      toast("No se pudo actualizar la cita", "error")
    } finally {
      setBusy(false)
    }
  }

  async function sellarTarjeta() {
    if (busy || !customerId) return
    setBusy(true)
    try {
      const res = await axios.get(`/api/loyalty/cards?customerId=${customerId}`)
      const activa = (res.data ?? []).find(
        (c: { status: string; program?: { type: string } }) =>
          c.status === "ACTIVE" && c.program?.type === "STAMP"
      )
      if (!activa) {
        toast(`${customerName ?? "Este cliente"} no tiene tarjeta de sellos activa`, "error")
        return
      }
      const stamp = await axios.post("/api/loyalty/transactions/stamp", { cardId: activa.id })
      const info = stamp.data?.stampInfo
      if (info?.completed) toast("🎉 ¡Tarjeta completada! Entregar recompensa")
      else if (info?.reward) toast(`🎁 Sello con beneficio: ${info.reward}`)
      else toast(`🎫 Sello registrado (${info?.stampsAfter ?? "?"}/${info?.stampsNeeded ?? "?"})`)
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      toast(msg || "No se pudo sellar la tarjeta", "error")
    } finally {
      setBusy(false)
    }
  }

  const cls = compact ? "btn btn-sm" : "btn"

  return (
    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
      {st === "scheduled" && (
        <button type="button" className={`${cls} bg-green-600 text-white border-green-600`} disabled={busy} onClick={() => setStatus("confirmed")}>
          ✅ Confirmar
        </button>
      )}
      {(st === "scheduled" || st === "confirmed") && (
        <>
          <button type="button" className={cls} disabled={busy} onClick={() => setStatus("completed")}>
            ✔ Completar
          </button>
          <button type="button" className={cls} disabled={busy} onClick={() => setStatus("cancelled")}>
            🚫 Cancelar
          </button>
        </>
      )}
      {st === "completed" && customerId && (
        <button type="button" className={`${cls} bg-purple-600 text-white border-purple-600`} disabled={busy} onClick={sellarTarjeta}>
          🎫 Sellar tarjeta
        </button>
      )}
      {customerPhone && (
        <a className={cls} href={`tel:${customerPhone}`} onClick={(e) => e.stopPropagation()}>
          📞
        </a>
      )}
    </div>
  )
}
