'use client'

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import type { LoyaltyCard } from "@/types/loyalty"
import { normalizePhoneMX } from "@/lib/utils/phone"
import CardPreview from "./CardPreview"
import { LOYALTY_TYPE_COLORS } from "@/lib/loyalty"

type Customer = { id: number; name: string; phone: string | null }
type LookupResult = { customer: Customer; cards: LoyaltyCard[] }

const PREVIEW_TYPES = ["STAMP", "SERVICE", "GIFT", "DISCOUNT", "COUPON", "PREPAID", "CASHBACK"] as const

export default function PublicTarjetasView() {
  const searchParams = useSearchParams()
  const telParam = searchParams.get("tel") || ""

  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<LookupResult | null>(null)
  const [needsName, setNeedsName] = useState(false)

  useEffect(() => {
    if (telParam) setPhone(telParam)
  }, [telParam])

  async function handleLookup(e?: React.FormEvent) {
    e?.preventDefault()
    setError("")
    const norm = normalizePhoneMX(phone)
    if (norm.length !== 10) {
      setError("Ingresa un teléfono de 10 dígitos")
      return
    }

    setLoading(true)
    try {
      const payload: { phone: string; name?: string } = { phone: norm }
      if (name.trim()) payload.name = name.trim()
      const res = await axios.post<LookupResult>("/api/loyalty/public/lookup", payload)
      setResult(res.data)
      setNeedsName(false)
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      if (typeof msg === "string" && msg.includes("Nombre requerido")) {
        setNeedsName(true)
        setError("Primera vez: ingresa tu nombre")
      } else {
        setError(msg || "No se pudo consultar")
      }
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const activeCards = result.cards.filter(
      (c) => c.program && PREVIEW_TYPES.includes(c.program.type as typeof PREVIEW_TYPES[number])
    )

    return (
      <div className="min-h-[100dvh] bg-lh-bg">
        <div className="sticky top-0 z-10 bg-lh-card border-b border-lh-border px-5 py-3.5 flex items-center gap-3">
          <button type="button" className="text-xl px-1" onClick={() => setResult(null)}>←</button>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-lh-muted">{result.customer.phone}</div>
            <div className="text-base font-semibold truncate">{result.customer.name}</div>
          </div>
          <button type="button" className="btn text-xs" onClick={() => handleLookup()}>
            Actualizar
          </button>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {activeCards.length === 0 ? (
            <div className="text-center text-lh-muted py-16">
              <div className="text-5xl mb-3">🎁</div>
              <p>No tienes tarjetas activas aún.</p>
              <p className="text-sm mt-2">Pide en recepción que te emitan una.</p>
            </div>
          ) : (
            <>
              <div className="text-[12px] font-semibold text-lh-muted uppercase tracking-wide px-1">
                Tus programas activos
              </div>
              {activeCards.map((card) => {
                if (!card.program) return null
                const t = card.program.type as typeof PREVIEW_TYPES[number]
                return (
                  <CardPreview
                    key={card.id}
                    name={card.program.name}
                    type={t}
                    color={card.program.color || LOYALTY_TYPE_COLORS[t]}
                    config={card.program.config}
                    balance={card.balance}
                    serviceUsage={card.serviceUsage}
                    status={card.status}
                  />
                )
              })}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-lh-bg">
      <div className="text-5xl mb-4">☕</div>
      <h1 className="text-[22px] font-bold mb-1.5">Mis tarjetas</h1>
      <p className="text-sm text-lh-muted mb-10 text-center max-w-xs">
        Ingresa tu número para ver tus tarjetas de lealtad
      </p>

      <form onSubmit={handleLookup} className="w-full max-w-[320px] space-y-4">
        <label className="block">
          <span className="text-[13px] text-lh-muted block mb-2">Celular</span>
          <input
            className="w-full px-4 py-3.5 text-xl font-semibold text-center tracking-wide rounded-2xl border-2 border-lh-border bg-lh-card outline-none focus:border-lh-accent"
            type="tel"
            inputMode="numeric"
            placeholder="10 dígitos"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>

        {(needsName || name) && (
          <label className="block">
            <span className="text-[13px] text-lh-muted block mb-2">Nombre</span>
            <input
              className="input"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={needsName}
            />
          </label>
        )}

        {error && <p className="text-sm text-lh-danger text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 text-base font-semibold rounded-2xl bg-lh-accent text-white hover:bg-lh-accent-2 transition-colors disabled:opacity-50"
        >
          {loading ? "Consultando…" : "Ver mis tarjetas →"}
        </button>
      </form>
    </div>
  )
}
