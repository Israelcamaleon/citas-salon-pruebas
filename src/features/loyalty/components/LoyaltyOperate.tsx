'use client'

import useSWR from "swr"
import axios from "axios"
import { useState } from "react"
import type { LoyaltyCard } from "@/types/loyalty"
import { normalizePhoneMX } from "@/lib/utils/phone"
import CardPreview from "./CardPreview"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Customer = { id: number; name: string; phone: string | null }

export default function LoyaltyOperate() {
  const { data: customers } = useSWR<Customer[]>("/api/customers", fetcher)
  const [phone, setPhone] = useState("")
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [cards, setCards] = useState<LoyaltyCard[]>([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)

  async function searchCustomer() {
    const norm = normalizePhoneMX(phone)
    if (norm.length !== 10) {
      alert("Ingresa un teléfono de 10 dígitos")
      return
    }
    setLoading(true)
    try {
      const found = (customers ?? []).find((c) => normalizePhoneMX(c.phone) === norm)
      if (!found) {
        alert("Cliente no encontrado. Créalo primero en Clientes o emite tarjeta con nombre.")
        setCustomer(null)
        setCards([])
        return
      }
      setCustomer(found)
      const res = await axios.get(`/api/loyalty/cards?customerId=${found.id}`)
      setCards(res.data)
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      alert(msg || "Error al buscar")
    } finally {
      setLoading(false)
    }
  }

  async function stamp(cardId: number) {
    setActionId(cardId)
    try {
      await axios.post("/api/loyalty/transactions/stamp", { cardId, amount: 1 })
      if (customer) {
        const res = await axios.get(`/api/loyalty/cards?customerId=${customer.id}`)
        setCards(res.data)
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      alert(msg || "No se pudo sellar")
    } finally {
      setActionId(null)
    }
  }

  async function useService(cardId: number, serviceName: string) {
    setActionId(cardId)
    try {
      await axios.post("/api/loyalty/transactions/service-use", { cardId, serviceName })
      if (customer) {
        const res = await axios.get(`/api/loyalty/cards?customerId=${customer.id}`)
        setCards(res.data)
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      alert(msg || "No se pudo registrar uso")
    } finally {
      setActionId(null)
    }
  }

  const activeCards = cards.filter((c) => c.status === "ACTIVE" && c.program)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Busca al cliente por teléfono para sellar o registrar uso de servicios.
      </p>

      <div className="flex flex-wrap gap-2 items-end border rounded-lg p-4 bg-white">
        <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <span className="label">Teléfono del cliente</span>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10 dígitos"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchCustomer())}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={searchCustomer}
          disabled={loading}
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {customer && (
        <p className="text-sm">
          Cliente: <strong>{customer.name}</strong>
          {customer.phone && <span className="text-gray-500"> · {customer.phone}</span>}
        </p>
      )}

      {customer && activeCards.length === 0 && (
        <p className="text-sm text-gray-500">Sin tarjetas activas. Emite una en la pestaña Emitir.</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {activeCards.map((card) => {
          if (!card.program) return null
          const isStamp = card.program.type === "STAMP"
          const isService = card.program.type === "SERVICE"
          const busy = actionId === card.id
          const progType = card.program.type
          if (progType !== "STAMP" && progType !== "SERVICE") return null

          return (
            <div key={card.id} className="space-y-3 border rounded-lg p-3 bg-white">
              <CardPreview
                name={card.program.name}
                type={progType}
                color={card.program.color}
                config={card.program.config}
                balance={card.balance}
                serviceUsage={card.serviceUsage}
                status={card.status}
                compact
              />
              <div className="flex flex-wrap gap-2">
                {isStamp && (
                  <button
                    type="button"
                    className="btn btn-primary text-sm"
                    disabled={busy}
                    onClick={() => stamp(card.id)}
                  >
                    {busy ? "…" : "+1 Sello"}
                  </button>
                )}
                {isService && card.program.config.type === "SERVICE" && (
                  card.program.config.services.map((s) => {
                    const used = card.serviceUsage?.[s.name] ?? 0
                    const left = s.total - used
                    if (left <= 0) return null
                    return (
                      <button
                        key={s.name}
                        type="button"
                        className="btn text-sm"
                        disabled={busy}
                        onClick={() => useService(card.id, s.name)}
                      >
                        Usar: {s.name} ({left})
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
