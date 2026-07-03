'use client'

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import type { LoyaltyCard } from "@/types/loyalty"
import { normalizePhoneMX } from "@/lib/utils/phone"
import CardPreview from "./CardPreview"

type Customer = { id: number; name: string; phone: string | null }

type LookupResult = {
  customer: Customer
  cards: LoyaltyCard[]
}

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
    if (telParam) {
      setPhone(telParam)
    }
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

  function reset() {
    setResult(null)
    setError("")
    setNeedsName(false)
  }

  if (result) {
    const activeCards = result.cards.filter(
      (c) => c.program && (c.program.type === "STAMP" || c.program.type === "SERVICE")
    )

    return (
      <div className="max-w-lg mx-auto space-y-6 py-6 px-2">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Hola, {result.customer.name}</h1>
          <p className="text-sm text-gray-600">Tus tarjetas activas</p>
        </div>

        {activeCards.length === 0 ? (
          <div className="card text-center text-gray-600">
            <p>No tienes tarjetas activas aún.</p>
            <p className="text-sm mt-2">Pide en recepción que te emitan una.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCards.map((card) => {
              if (!card.program) return null
              const t = card.program.type
              if (t !== "STAMP" && t !== "SERVICE") return null
              return (
                <CardPreview
                  key={card.id}
                  name={card.program.name}
                  type={t}
                  color={card.program.color}
                  config={card.program.config}
                  balance={card.balance}
                  serviceUsage={card.serviceUsage}
                  status={card.status}
                />
              )
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button type="button" className="btn" onClick={() => handleLookup()}>
            Actualizar
          </button>
          <button type="button" className="btn" onClick={reset}>
            Cambiar teléfono
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto space-y-6 py-8 px-2">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Mis tarjetas</h1>
        <p className="text-gray-600 text-sm">
          Ingresa tu celular para ver tus sellos y beneficios.
        </p>
      </div>

      <form onSubmit={handleLookup} className="card space-y-4">
        <label className="flex flex-col gap-1">
          <span className="label">Celular</span>
          <input
            className="input"
            type="tel"
            inputMode="numeric"
            placeholder="10 dígitos"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>

        {(needsName || name) && (
          <label className="flex flex-col gap-1">
            <span className="label">Nombre</span>
            <input
              className="input"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={needsName}
            />
            <span className="text-xs text-gray-500">Solo la primera vez que te registras</span>
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Consultando…" : "Ver mis tarjetas"}
        </button>
      </form>
    </div>
  )
}
