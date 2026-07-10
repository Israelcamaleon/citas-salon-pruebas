'use client'

import useSWR from "swr"
import axios from "axios"
import { useState } from "react"
import type { LoyaltyProgram } from "@/types/loyalty"
import { LOYALTY_TYPE_COLORS, LOYALTY_TYPE_LABELS, LOYALTY_PROGRAM_TYPES_V1 } from "@/lib/loyalty"
import CardPreview from "./CardPreview"
import type { ProgramConfig } from "@/schemas/loyalty/program-config.schema"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type ProgramType = (typeof LOYALTY_PROGRAM_TYPES_V1)[number]
type ServiceRow = { name: string; total: number; icon: string }

const emptyService = (): ServiceRow => ({ name: "", total: 1, icon: "" })

export default function LoyaltyPrograms() {
  const { data: programs, mutate, isLoading } = useSWR<LoyaltyProgram[]>(
    "/api/loyalty/programs",
    fetcher
  )

  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [type, setType] = useState<ProgramType>("STAMP")
  const [color, setColor] = useState(LOYALTY_TYPE_COLORS.STAMP)
  const [active, setActive] = useState(true)
  const [stampsNeeded, setStampsNeeded] = useState(10)
  const [welcomeStamps, setWelcomeStamps] = useState(0)
  const [services, setServices] = useState<ServiceRow[]>([emptyService()])
  const [servicePrice, setServicePrice] = useState(0)
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent")
  const [discountValue, setDiscountValue] = useState(15)
  const [minPurchase, setMinPurchase] = useState(0)
  const [giftBalance, setGiftBalance] = useState(500)
  const [giftRechargeable, setGiftRechargeable] = useState(true)
  const [couponCode, setCouponCode] = useState("PROMO")
  const [couponDiscount, setCouponDiscount] = useState(20)
  const [prepaidMin, setPrepaidMin] = useState(200)
  const [prepaidBonus, setPrepaidBonus] = useState(5)
  const [cashbackPercent, setCashbackPercent] = useState(3)
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditingId(null)
    setName("")
    setType("STAMP")
    setColor(LOYALTY_TYPE_COLORS.STAMP)
    setActive(true)
    setStampsNeeded(10)
    setWelcomeStamps(0)
    setServices([emptyService()])
    setServicePrice(0)
  }

  function loadProgram(p: LoyaltyProgram) {
    setEditingId(p.id)
    setName(p.name)
    setType(p.type as ProgramType)
    setColor(p.color)
    setActive(p.active)
    const c = p.config
    if (c.type === "STAMP") {
      setStampsNeeded(c.stampsNeeded)
      setWelcomeStamps(c.welcomeStamps)
    } else if (c.type === "SERVICE") {
      setServices(c.services.map((s) => ({ name: s.name, total: s.total, icon: s.icon ?? "" })))
      setServicePrice(c.price ?? 0)
    } else if (c.type === "DISCOUNT") {
      setDiscountType(c.discountType)
      setDiscountValue(c.value)
      setMinPurchase(c.minPurchase ?? 0)
    } else if (c.type === "GIFT") {
      setGiftBalance(c.initialBalance)
      setGiftRechargeable(c.rechargeable)
    } else if (c.type === "COUPON") {
      setCouponCode(c.code)
      setCouponDiscount(c.discount)
    } else if (c.type === "PREPAID") {
      setPrepaidMin(c.minLoad)
      setPrepaidBonus(c.bonusPercent)
    } else if (c.type === "CASHBACK") {
      setCashbackPercent(c.percent)
      setMinPurchase(c.minPurchase ?? 0)
    }
  }

  function buildConfig(): ProgramConfig {
    switch (type) {
      case "STAMP":
        return { type: "STAMP", stampsNeeded, welcomeStamps }
      case "SERVICE":
        return {
          type: "SERVICE",
          services: services.filter((s) => s.name.trim()).map((s) => ({
            name: s.name.trim(),
            total: Number(s.total) || 1,
            icon: s.icon.trim() || undefined,
          })),
          price: servicePrice > 0 ? servicePrice : undefined,
        }
      case "DISCOUNT":
        return {
          type: "DISCOUNT",
          discountType,
          value: discountValue,
          minPurchase: minPurchase || undefined,
        }
      case "GIFT":
        return { type: "GIFT", initialBalance: giftBalance, rechargeable: giftRechargeable }
      case "COUPON":
        return { type: "COUPON", code: couponCode, discount: couponDiscount, usesPerCustomer: 1 }
      case "PREPAID":
        return { type: "PREPAID", minLoad: prepaidMin, bonusPercent: prepaidBonus }
      case "CASHBACK":
        return {
          type: "CASHBACK",
          percent: cashbackPercent,
          minPurchase: minPurchase || undefined,
        }
    }
  }

  const previewConfig = buildConfig()
  const previewValid =
    (previewConfig.type === "STAMP" && previewConfig.stampsNeeded >= 1) ||
    (previewConfig.type === "SERVICE" && previewConfig.services.length > 0) ||
    previewConfig.type === "DISCOUNT" ||
    previewConfig.type === "GIFT" ||
    previewConfig.type === "COUPON" ||
    previewConfig.type === "PREPAID" ||
    previewConfig.type === "CASHBACK"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      alert("Nombre requerido")
      return
    }
    const config = buildConfig()
    if (config.type === "SERVICE" && config.services.length === 0) {
      alert("Agrega al menos un servicio")
      return
    }

    setSaving(true)
    try {
      const payload = { name: name.trim(), type, config, color, active }
      if (editingId) await axios.put(`/api/loyalty/programs/${editingId}`, payload)
      else await axios.post("/api/loyalty/programs", payload)
      resetForm()
      await mutate()
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      alert(msg || "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(p: LoyaltyProgram) {
    try {
      await axios.put(`/api/loyalty/programs/${p.id}`, { active: !p.active })
      await mutate()
    } catch {
      alert("No se pudo cambiar el estado")
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-lh-muted">
        Crea programas de lealtad. El preview se actualiza al instante — como en el prototipo.
      </p>

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h3 className="font-semibold text-sm">
            {editingId ? "Editar programa" : "Nueva tarjeta"}
          </h3>

          <label className="flex flex-col gap-1">
            <span className="label">Nombre</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <div>
            <span className="label mb-2 block">Tipo</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LOYALTY_PROGRAM_TYPES_V1.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={!!editingId}
                  onClick={() => {
                    setType(t)
                    setColor(LOYALTY_TYPE_COLORS[t])
                  }}
                  className={`flex items-center gap-1.5 text-left text-xs font-semibold rounded-[10px] border-2 px-3 py-2 transition-all ${
                    type === t
                      ? "border-current"
                      : "border-lh-border bg-lh-card hover:border-[#aac9ef] hover:bg-[#f0f7ff]"
                  }`}
                  style={
                    type === t
                      ? {
                          borderColor: LOYALTY_TYPE_COLORS[t],
                          background: `${LOYALTY_TYPE_COLORS[t]}14`,
                          color: LOYALTY_TYPE_COLORS[t],
                        }
                      : undefined
                  }
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: LOYALTY_TYPE_COLORS[t] }}
                  />
                  {LOYALTY_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {type === "STAMP" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="label">Sellos necesarios</span>
                <input type="number" min={1} className="input" value={stampsNeeded} onChange={(e) => setStampsNeeded(Number(e.target.value))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Bienvenida</span>
                <input type="number" min={0} className="input" value={welcomeStamps} onChange={(e) => setWelcomeStamps(Number(e.target.value))} />
              </label>
            </div>
          )}

          {type === "SERVICE" && (
            <div className="space-y-2">
              {services.map((row, i) => (
                <div key={i} className="grid grid-cols-6 gap-2">
                  <input className="input col-span-2" placeholder="Nombre" value={row.name} onChange={(e) => {
                    const next = [...services]; next[i] = { ...next[i], name: e.target.value }; setServices(next)
                  }} />
                  <input type="number" min={1} className="input" value={row.total} onChange={(e) => {
                    const next = [...services]; next[i] = { ...next[i], total: Number(e.target.value) }; setServices(next)
                  }} />
                  <input className="input" placeholder="Icono" value={row.icon} onChange={(e) => {
                    const next = [...services]; next[i] = { ...next[i], icon: e.target.value }; setServices(next)
                  }} />
                  <button type="button" className="btn col-span-2" onClick={() => setServices(services.filter((_, j) => j !== i))}>Quitar</button>
                </div>
              ))}
              <button type="button" className="btn text-sm" onClick={() => setServices([...services, emptyService()])}>+ Servicio</button>
              <label className="flex flex-col gap-1">
                <span className="label">Precio paquete (opc.)</span>
                <input type="number" min={0} className="input" value={servicePrice} onChange={(e) => setServicePrice(Number(e.target.value))} />
              </label>
            </div>
          )}

          {type === "DISCOUNT" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="label">Tipo</span>
                <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}>
                  <option value="percent">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Valor</span>
                <input type="number" min={0} className="input" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
              </label>
              <label className="flex flex-col gap-1 col-span-2">
                <span className="label">Compra mínima</span>
                <input type="number" min={0} className="input" value={minPurchase} onChange={(e) => setMinPurchase(Number(e.target.value))} />
              </label>
            </div>
          )}

          {type === "GIFT" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="label">Saldo inicial</span>
                <input type="number" min={0} className="input" value={giftBalance} onChange={(e) => setGiftBalance(Number(e.target.value))} />
              </label>
              <label className="flex items-center gap-2 mt-5">
                <input type="checkbox" checked={giftRechargeable} onChange={(e) => setGiftRechargeable(e.target.checked)} />
                <span className="text-sm">Recargable</span>
              </label>
            </div>
          )}

          {type === "COUPON" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="label">Código</span>
                <input className="input" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Descuento %</span>
                <input type="number" min={0} className="input" value={couponDiscount} onChange={(e) => setCouponDiscount(Number(e.target.value))} />
              </label>
            </div>
          )}

          {type === "PREPAID" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="label">Recarga mínima</span>
                <input type="number" min={0} className="input" value={prepaidMin} onChange={(e) => setPrepaidMin(Number(e.target.value))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Bonus %</span>
                <input type="number" min={0} max={100} className="input" value={prepaidBonus} onChange={(e) => setPrepaidBonus(Number(e.target.value))} />
              </label>
            </div>
          )}

          {type === "CASHBACK" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="label">Porcentaje</span>
                <input type="number" min={0} max={100} className="input" value={cashbackPercent} onChange={(e) => setCashbackPercent(Number(e.target.value))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Compra mínima</span>
                <input type="number" min={0} className="input" value={minPurchase} onChange={(e) => setMinPurchase(Number(e.target.value))} />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="label">Color</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20 rounded cursor-pointer" />
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="text-sm">Activo</span>
          </label>

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : editingId ? "Actualizar" : "Crear"}
            </button>
            {editingId && (
              <button type="button" className="btn" onClick={resetForm}>Cancelar</button>
            )}
          </div>
        </form>

        <div>
          <p className="label mb-2">Vista previa</p>
          {previewValid ? (
            <CardPreview
              name={name || "Programa"}
              type={type}
              color={color}
              config={previewConfig}
              balance={
                type === "STAMP" && previewConfig.type === "STAMP"
                  ? previewConfig.welcomeStamps
                  : type === "GIFT" && previewConfig.type === "GIFT"
                    ? previewConfig.initialBalance
                    : 0
              }
            />
          ) : (
            <div className="card text-sm text-lh-muted">Completa el formulario</div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto card !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-lh-border bg-lh-bg text-left">
              <th className="p-3 text-[11px] uppercase tracking-wide text-lh-muted">Nombre</th>
              <th className="p-3 text-[11px] uppercase tracking-wide text-lh-muted">Tipo</th>
              <th className="p-3 text-[11px] uppercase tracking-wide text-lh-muted">Estado</th>
              <th className="p-3 text-[11px] uppercase tracking-wide text-lh-muted">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="p-4 text-lh-muted">Cargando…</td></tr>
            )}
            {(programs ?? []).map((p) => (
              <tr key={p.id} className="border-b border-lh-border hover:bg-[#fafaf8]">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">
                  <span className="pill" style={{ background: `${p.color}22`, color: p.color }}>
                    {LOYALTY_TYPE_LABELS[p.type] || p.type}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`pill ${p.active ? "pill-ok" : "pill-warn"}`}>
                    {p.active ? "Activo" : "Pausado"}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  <button type="button" className="btn text-xs" onClick={() => loadProgram(p)}>Editar</button>
                  <button type="button" className="btn text-xs" onClick={() => toggleActive(p)}>
                    {p.active ? "Pausar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && (programs ?? []).length === 0 && (
              <tr><td colSpan={4} className="p-4 text-lh-muted">Sin programas — crea el primero</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
