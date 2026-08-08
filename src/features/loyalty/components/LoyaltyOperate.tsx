'use client'

import useSWR from "swr"
import axios from "axios"
import { useState } from "react"
import type { LoyaltyCard } from "@/types/loyalty"
import { normalizePhoneMX } from "@/lib/utils/phone"
import { LOYALTY_TYPE_COLORS, LOYALTY_TYPE_LABELS } from "@/lib/loyalty"
import CardPreview from "./CardPreview"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Customer = { id: number; name: string; phone: string | null }

type ResultMsg = { ok: boolean; title: string; detail?: string }

type StampInfo = {
  stampsBefore: number
  stampsAfter: number
  stampsNeeded: number
  completed: boolean
  reward: string | null
  nextReward: { atStamps: number; text: string } | null
}

export default function LoyaltyOperate() {
  const { data: customers, mutate: mutateCustomers } = useSWR<Customer[]>("/api/customers", fetcher)
  const [phone, setPhone] = useState("")
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [mostrarAlta, setMostrarAlta] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoSexo, setNuevoSexo] = useState("")
  const [nuevoEmail, setNuevoEmail] = useState("")
  const [nuevasNotas, setNuevasNotas] = useState("")
  const [cards, setCards] = useState<LoyaltyCard[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState("")
  const [purchaseAmt, setPurchaseAmt] = useState("")
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  const [result, setResult] = useState<ResultMsg | null>(null)

  const selected = cards.find((c) => c.id === selectedCardId) ?? null

  async function searchCustomer() {
    const norm = normalizePhoneMX(phone)
    if (norm.length !== 10) {
      alert("Ingresa un teléfono de 10 dígitos")
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const found = (customers ?? []).find((c) => normalizePhoneMX(c.phone) === norm)
      if (!found) {
        setCustomer(null)
        setCards([])
        setSelectedCardId(null)
        setMostrarAlta(true)
        return
      }
      setMostrarAlta(false)
      setNuevoNombre("")
      setCustomer(found)
      const res = await axios.get(`/api/loyalty/cards?customerId=${found.id}`)
      const list: LoyaltyCard[] = res.data
      setCards(list)
      setSelectedCardId(list.find((c) => c.status === "ACTIVE")?.id ?? null)
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      alert(msg || "Error al buscar")
    } finally {
      setLoading(false)
    }
  }

  async function altaCliente() {
    if (!nuevoNombre.trim()) {
      alert("Escribe el nombre del cliente")
      return
    }
    setLoading(true)
    try {
      const res = await axios.post("/api/customers", {
        name: nuevoNombre.trim(),
        phone: normalizePhoneMX(phone),
        sexo: nuevoSexo || null,
        email: nuevoEmail.trim() || null,
        notes: nuevasNotas.trim() || null,
      })
      await mutateCustomers()
      const creado: Customer = res.data
      setMostrarAlta(false)
      setNuevoNombre("")
      setNuevoSexo("")
      setNuevoEmail("")
      setNuevasNotas("")
      setCustomer(creado)
      const cardsRes = await axios.get(`/api/loyalty/cards?customerId=${creado.id}`)
      const list: LoyaltyCard[] = cardsRes.data
      setCards(list)
      setSelectedCardId(list.find((c) => c.status === "ACTIVE")?.id ?? null)
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error al crear cliente"
      alert(msg || "Error al crear cliente")
    } finally {
      setLoading(false)
    }
  }

  async function refreshCards() {
    if (!customer) return
    const res = await axios.get(`/api/loyalty/cards?customerId=${customer.id}`)
    setCards(res.data)
  }

  async function runAction(
    title: string,
    fn: () => Promise<unknown>
  ) {
    setBusy(true)
    setResult(null)
    try {
      await fn()
      await refreshCards()
      setResult({ ok: true, title, detail: new Date().toLocaleTimeString() })
      setAmount("")
      setPurchaseAmt("")
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      setResult({ ok: false, title: msg || "No se pudo completar" })
    } finally {
      setBusy(false)
    }
  }

  const activeCards = cards.filter((c) => c.status === "ACTIVE" && c.program)

  return (
    <div className="space-y-4">
      <p className="text-sm text-lh-muted">
        Busca al cliente y aplica la operación según el tipo de tarjeta — mismo flujo que en caja.
      </p>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <div className="section-title">Sellar / Canjear</div>
          <label className="flex flex-col gap-1">
            <span className="label">Número de celular</span>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="442 123 4567"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchCustomer())}
              />
              <button type="button" className="btn btn-primary" onClick={searchCustomer} disabled={loading}>
                {loading ? "…" : "Buscar"}
              </button>
            </div>
          </label>

          {mostrarAlta && !customer && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
              <div className="text-sm font-semibold text-amber-800">
                Este celular no está registrado — dalo de alta aquí mismo:
              </div>
              <input
                className="input"
                placeholder="Nombre completo del cliente"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), altaCliente())}
              />
              <select
                className="input"
                value={nuevoSexo}
                onChange={(e) => setNuevoSexo(e.target.value)}
              >
                <option value="">Sexo (opcional)</option>
                <option value="mujer">Mujer</option>
                <option value="hombre">Hombre</option>
                <option value="otro">Otro</option>
              </select>
              <input
                className="input"
                type="email"
                placeholder="Correo electrónico (opcional)"
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
              />
              <textarea
                className="input"
                rows={2}
                placeholder="Notas (alergias, preferencias, etc. — opcional)"
                value={nuevasNotas}
                onChange={(e) => setNuevasNotas(e.target.value)}
              />
              <div className="text-xs text-lh-muted">Celular: {phone}</div>
              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={altaCliente}
                disabled={loading}
              >
                {loading ? "…" : "➕ Dar de alta y continuar"}
              </button>
            </div>
          )}

          {customer && (
            <div className="rounded-lg bg-lh-bg px-3 py-2 text-sm">
              <strong>{customer.name}</strong>
              <span className="text-lh-muted"> · {customer.phone}</span>
            </div>
          )}

          {customer && activeCards.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="label">Tarjeta / programa</span>
              <select
                className="input"
                value={selectedCardId ?? ""}
                onChange={(e) => setSelectedCardId(Number(e.target.value))}
              >
                {activeCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {LOYALTY_TYPE_LABELS[c.program!.type] || c.program!.type} · {c.program!.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selected?.program && (
            <ActionPanel
              card={selected}
              amount={amount}
              setAmount={setAmount}
              purchaseAmt={purchaseAmt}
              setPurchaseAmt={setPurchaseAmt}
              busy={busy}
              onStamp={() => {
                void (async () => {
                  setBusy(true)
                  setResult(null)
                  try {
                    const res = await axios.post("/api/loyalty/transactions/stamp", {
                      cardId: selected.id,
                      amount: 1,
                    })
                    await refreshCards()
                    const info = res.data?.stampInfo as StampInfo | undefined
                    if (info?.completed) {
                      setResult({
                        ok: true,
                        title: "🎉 ¡Tarjeta completada!",
                        detail: info.reward
                          ? `Recompensa: ${info.reward}`
                          : "Recompensa lista para canjear",
                      })
                    } else if (info) {
                      const parts = [`Lleva ${info.stampsAfter} de ${info.stampsNeeded} sellos`]
                      if (info.nextReward) {
                        parts.push(
                          `le faltan ${info.nextReward.atStamps - info.stampsAfter} para: ${info.nextReward.text}`
                        )
                      }
                      setResult({
                        ok: true,
                        title: info.reward ? "🎁 ¡Sello con beneficio!" : "Sello añadido",
                        detail: (info.reward ? [`Ganó: ${info.reward}`, ...parts] : parts).join(" · "),
                      })
                    } else {
                      setResult({ ok: true, title: "Sello añadido" })
                    }
                  } catch (err: unknown) {
                    const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
                    setResult({ ok: false, title: msg || "No se pudo completar" })
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
              onService={(name) =>
                runAction(`Servicio usado: ${name}`, () =>
                  axios.post("/api/loyalty/transactions/service-use", {
                    cardId: selected.id,
                    serviceName: name,
                  })
                )
              }
              onRedeem={() =>
                runAction("Saldo canjeado", () =>
                  axios.post("/api/loyalty/transactions/redeem", {
                    cardId: selected.id,
                    amount: Number(amount),
                  })
                )
              }
              onLoad={() =>
                runAction("Recarga aplicada", () =>
                  axios.post("/api/loyalty/transactions/load", {
                    cardId: selected.id,
                    amount: Number(amount),
                  })
                )
              }
              onCashback={() =>
                runAction("Cashback acumulado", () =>
                  axios.post("/api/loyalty/transactions/cashback", {
                    cardId: selected.id,
                    purchaseAmt: Number(purchaseAmt),
                  })
                )
              }
              onDiscount={() =>
                runAction("Descuento aplicado", () =>
                  axios.post("/api/loyalty/transactions/discount", {
                    cardId: selected.id,
                    purchaseAmt: purchaseAmt ? Number(purchaseAmt) : undefined,
                  })
                )
              }
              onCoupon={() =>
                runAction("Cupón canjeado", () =>
                  axios.post("/api/loyalty/transactions/coupon", { cardId: selected.id })
                )
              }
            />
          )}

          {customer && activeCards.length === 0 && (
            <p className="text-sm text-lh-muted">Sin tarjetas activas. Emite una en la pestaña Emitir.</p>
          )}

          {result && (
            <div className={result.ok ? "toast-ok" : "rounded-lg border border-red-200 bg-red-50 p-4 text-center"}>
              <div className="text-2xl mb-1">{result.ok ? "✓" : "!"}</div>
              <div className="text-sm font-bold">{result.title}</div>
              {result.detail && (
                <div className="text-xs text-[#166534] mt-1">Aplicado · {result.detail}</div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="section-title">Vista de tarjeta</div>
          {selected?.program &&
          (selected.program.type === "STAMP" ||
            selected.program.type === "SERVICE" ||
            selected.program.type === "GIFT" ||
            selected.program.type === "DISCOUNT" ||
            selected.program.type === "COUPON" ||
            selected.program.type === "PREPAID" ||
            selected.program.type === "CASHBACK") ? (
            <CardPreview
              name={selected.program.name}
              type={selected.program.type}
              color={selected.program.color || LOYALTY_TYPE_COLORS[selected.program.type]}
              config={selected.program.config}
              balance={selected.balance}
              serviceUsage={selected.serviceUsage}
              status={selected.status}
            />
          ) : (
            <div className="card text-sm text-lh-muted text-center py-12">
              Busca un cliente para ver su tarjeta
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionPanel({
  card,
  amount,
  setAmount,
  purchaseAmt,
  setPurchaseAmt,
  busy,
  onStamp,
  onService,
  onRedeem,
  onLoad,
  onCashback,
  onDiscount,
  onCoupon,
}: {
  card: LoyaltyCard
  amount: string
  setAmount: (v: string) => void
  purchaseAmt: string
  setPurchaseAmt: (v: string) => void
  busy: boolean
  onStamp: () => void
  onService: (name: string) => void
  onRedeem: () => void
  onLoad: () => void
  onCashback: () => void
  onDiscount: () => void
  onCoupon: () => void
}) {
  const type = card.program!.type
  const config = card.program!.config

  if (type === "STAMP" && config.type === "STAMP") {
    const needed = config.stampsNeeded
    const rewards = config.rewards ?? {}
    const milestones = Object.keys(rewards)
      .map(Number)
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b)
    const nextStamp = card.balance + 1
    const completesNow = nextStamp >= needed
    const hitMilestone = milestones
      .filter((m) => card.balance < m && nextStamp >= m)
      .pop()

    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-lh-bg px-3 py-2.5 text-sm space-y-1.5">
          <div className="font-semibold">
            Progreso: {card.balance} de {needed} sellos
          </div>
          {completesNow ? (
            <div className="font-semibold text-[#166534]">
              🎁 ¡Con esta visita completa la tarjeta! Recompensa:{" "}
              {rewards[String(needed)] ?? "premio del programa"}
            </div>
          ) : hitMilestone != null ? (
            <div className="font-semibold text-[#166534]">
              🎁 ¡En ESTA visita gana: {rewards[String(hitMilestone)]}!
            </div>
          ) : null}
          {milestones.length > 0 && (
            <ul className="text-xs text-lh-muted space-y-0.5">
              {milestones.map((m) => (
                <li key={m}>
                  {m <= card.balance ? "✅" : m === nextStamp ? "👉" : "○"} Sello {m}:{" "}
                  {rewards[String(m)]}
                </li>
              ))}
            </ul>
          )}
          {milestones.length === 0 && !completesNow && (
            <div className="text-xs text-lh-muted">
              Faltan {needed - card.balance} sellos para la recompensa.
            </div>
          )}
        </div>
        <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={onStamp}>
          {busy ? "…" : "+1 Sello"}
        </button>
      </div>
    )
  }

  if (type === "SERVICE" && config.type === "SERVICE") {
    return (
      <div className="flex flex-wrap gap-2">
        {config.services.map((s) => {
          const used = card.serviceUsage?.[s.name] ?? 0
          const left = s.total - used
          if (left <= 0) return null
          return (
            <button
              key={s.name}
              type="button"
              className="btn text-sm"
              disabled={busy}
              onClick={() => onService(s.name)}
            >
              {s.icon ? `${s.icon} ` : ""}Usar {s.name} ({left})
            </button>
          )
        })}
      </div>
    )
  }

  if (type === "GIFT" || type === "PREPAID") {
    return (
      <div className="space-y-2">
        <p className="text-sm">
          Saldo: <strong>${card.balance}</strong>
        </p>
        <label className="flex flex-col gap-1">
          <span className="label">Monto ($)</span>
          <input
            className="input"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={busy || !amount}
            onClick={onRedeem}
          >
            Canjear
          </button>
          <button
            type="button"
            className="btn flex-1"
            disabled={busy || !amount}
            onClick={onLoad}
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }

  if (type === "CASHBACK") {
    return (
      <div className="space-y-2">
        <p className="text-sm">
          Acumulado: <strong>${card.balance}</strong>
        </p>
        <label className="flex flex-col gap-1">
          <span className="label">Monto de compra ($)</span>
          <input
            className="input"
            type="number"
            min={0}
            value={purchaseAmt}
            onChange={(e) => setPurchaseAmt(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={busy || !purchaseAmt}
            onClick={onCashback}
          >
            Acumular cashback
          </button>
          <button
            type="button"
            className="btn flex-1"
            disabled={busy || !amount}
            onClick={onRedeem}
          >
            Canjear saldo
          </button>
        </div>
        <label className="flex flex-col gap-1">
          <span className="label">Monto a canjear ($)</span>
          <input
            className="input"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      </div>
    )
  }

  if (type === "DISCOUNT" && config.type === "DISCOUNT") {
    return (
      <div className="space-y-2">
        <p className="text-sm rounded-lg bg-lh-bg px-3 py-2">
          Beneficio:{" "}
          <strong>
            {config.discountType === "percent"
              ? `${config.value}% de descuento`
              : `$${config.value} de descuento`}
          </strong>
          {config.minPurchase != null && (
            <span className="text-lh-muted"> · compra mínima ${config.minPurchase}</span>
          )}
        </p>
        <label className="flex flex-col gap-1">
          <span className="label">Monto de compra (opcional)</span>
          <input
            className="input"
            type="number"
            min={0}
            value={purchaseAmt}
            onChange={(e) => setPurchaseAmt(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={onDiscount}>
          Aplicar descuento
        </button>
      </div>
    )
  }

  if (type === "COUPON" && config.type === "COUPON") {
    return (
      <div className="space-y-2">
        <p className="text-sm rounded-lg bg-lh-bg px-3 py-2">
          Beneficio: <strong>${config.discount} de descuento</strong>
          <span className="text-lh-muted"> · cupón {config.code}</span>
        </p>
        <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={onCoupon}>
          Canjear cupón
        </button>
      </div>
    )
  }

  return null
}
