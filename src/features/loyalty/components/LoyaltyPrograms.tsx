'use client'

import useSWR from "swr"
import axios from "axios"
import { useRef, useState } from "react"
import type { LoyaltyProgram } from "@/types/loyalty"
import {
  LOYALTY_TYPE_COLORS,
  LOYALTY_TYPE_ICONS,
  LOYALTY_TYPE_LABELS,
  LOYALTY_PROGRAM_TYPES_V1,
} from "@/lib/loyalty"
import CardPreview from "./CardPreview"
import type { ProgramConfig } from "@/schemas/loyalty/program-config.schema"
import { normalizePhoneMX } from "@/lib/utils/phone"
import { asArray, fetcher } from "@/lib/api"

type ProgramType = (typeof LOYALTY_PROGRAM_TYPES_V1)[number]
type ServiceRow = { name: string; total: number; icon: string }
type Customer = { id: number; name: string; phone: string | null }

const emptyService = (): ServiceRow => ({ name: "", total: 1, icon: "⭐" })
const GIFT_ICONS = ["🎁", "🎂", "💝", "🌹", "🎉", "☕", "💅", "✂️"]

function programMeta(p: LoyaltyProgram): string {
  const c = p.config
  if (c.type === "STAMP") {
    const n = Object.values(c.rewards ?? {}).filter(Boolean).length
    return `${c.stampsNeeded} visitas · ${n} beneficio${n !== 1 ? "s" : ""}`
  }
  if (c.type === "SERVICE") {
    return c.services.map((s) => `${s.icon ? s.icon + " " : ""}${s.name}: ${s.total} usos`).join(" · ")
  }
  if (c.type === "GIFT") return `${c.image || "🎁"} $${c.initialBalance}`
  if (c.type === "DISCOUNT") {
    return `${c.value}${c.discountType === "percent" ? "%" : "$"} descuento`
  }
  if (c.type === "COUPON") return `Código: ${c.code} · ${c.discount}% off`
  if (c.type === "PREPAID") return `Mín $${c.minLoad} · +${c.bonusPercent}% bono`
  if (c.type === "CASHBACK") return `${c.percent}% cashback`
  return ""
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ""
  return iso.slice(0, 10)
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"))
    reader.readAsDataURL(file)
  })
}

export default function LoyaltyPrograms() {
  const { data: programsData, mutate, isLoading, error: programsError } = useSWR<LoyaltyProgram[]>(
    "/api/loyalty/programs",
    fetcher
  )
  const { data: customersData, mutate: mutateCustomers } = useSWR<Customer[]>(
    "/api/customers",
    fetcher
  )
  const programs = asArray<LoyaltyProgram>(programsData)
  const customers = asArray<Customer>(customersData)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [issueProgram, setIssueProgram] = useState<LoyaltyProgram | null>(null)

  const [name, setName] = useState("")
  const [type, setType] = useState<ProgramType>("STAMP")
  const [color, setColor] = useState(LOYALTY_TYPE_COLORS.STAMP)
  const [description, setDescription] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [bgUrl, setBgUrl] = useState<string | null>(null)

  const [stampsNeeded, setStampsNeeded] = useState(10)
  const [welcomeStamps, setWelcomeStamps] = useState(0)
  const [stampRewards, setStampRewards] = useState<Record<string, string>>({})
  const [services, setServices] = useState<ServiceRow[]>([emptyService()])
  const [servicePrice, setServicePrice] = useState(0)
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent")
  const [discountValue, setDiscountValue] = useState(15)
  const [minPurchase, setMinPurchase] = useState(0)
  const [giftBalance, setGiftBalance] = useState(500)
  const [giftRechargeable, setGiftRechargeable] = useState(false)
  const [giftMessage, setGiftMessage] = useState("")
  const [giftIcon, setGiftIcon] = useState("🎁")
  const [couponCode, setCouponCode] = useState("PROMO")
  const [couponDiscount, setCouponDiscount] = useState(20)
  const [couponMaxUses, setCouponMaxUses] = useState(200)
  const [prepaidMin, setPrepaidMin] = useState(200)
  const [prepaidBonus, setPrepaidBonus] = useState(5)
  const [prepaidMax, setPrepaidMax] = useState(5000)
  const [cashbackPercent, setCashbackPercent] = useState(3)
  const [cashbackMax, setCashbackMax] = useState(50)
  const [saving, setSaving] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setEditingId(null)
    setName("")
    setType("STAMP")
    setColor(LOYALTY_TYPE_COLORS.STAMP)
    setDescription("")
    setStartsAt("")
    setEndsAt("")
    setLogoUrl(null)
    setBgUrl(null)
    setStampsNeeded(10)
    setWelcomeStamps(0)
    setStampRewards({})
    setServices([emptyService()])
    setServicePrice(0)
    setDiscountType("percent")
    setDiscountValue(15)
    setMinPurchase(0)
    setGiftBalance(500)
    setGiftRechargeable(false)
    setGiftMessage("")
    setGiftIcon("🎁")
    setCouponCode("PROMO")
    setCouponDiscount(20)
    setCouponMaxUses(200)
    setPrepaidMin(200)
    setPrepaidBonus(5)
    setPrepaidMax(5000)
    setCashbackPercent(3)
    setCashbackMax(50)
  }

  function openCreate() {
    resetForm()
    setModalOpen(true)
  }

  function openEdit(p: LoyaltyProgram) {
    setEditingId(p.id)
    setName(p.name)
    setType(p.type as ProgramType)
    setColor(p.color)
    setDescription(p.description ?? "")
    setStartsAt(toDateInput(p.startsAt))
    setEndsAt(toDateInput(p.endsAt))
    setLogoUrl(p.logoUrl)
    setBgUrl(p.bgUrl)
    const c = p.config
    if (c.type === "STAMP") {
      setStampsNeeded(c.stampsNeeded)
      setWelcomeStamps(c.welcomeStamps)
      setStampRewards(c.rewards ?? {})
    } else if (c.type === "SERVICE") {
      setServices(c.services.map((s) => ({ name: s.name, total: s.total, icon: s.icon ?? "⭐" })))
      setServicePrice(c.price ?? 0)
    } else if (c.type === "DISCOUNT") {
      setDiscountType(c.discountType)
      setDiscountValue(c.value)
      setMinPurchase(c.minPurchase ?? 0)
    } else if (c.type === "GIFT") {
      setGiftBalance(c.initialBalance)
      setGiftRechargeable(c.rechargeable)
      setGiftMessage(c.message ?? "")
      setGiftIcon(c.image || "🎁")
    } else if (c.type === "COUPON") {
      setCouponCode(c.code)
      setCouponDiscount(c.discount)
      setCouponMaxUses(c.maxUses ?? 200)
    } else if (c.type === "PREPAID") {
      setPrepaidMin(c.minLoad)
      setPrepaidBonus(c.bonusPercent)
      setPrepaidMax(c.maxBalance ?? 5000)
    } else if (c.type === "CASHBACK") {
      setCashbackPercent(c.percent)
      setMinPurchase(c.minPurchase ?? 0)
      setCashbackMax(c.maxPerTx ?? 50)
    }
    setModalOpen(true)
  }

  function selectType(t: ProgramType) {
    if (editingId) return
    setType(t)
    setColor(LOYALTY_TYPE_COLORS[t])
  }

  function buildConfig(): ProgramConfig {
    switch (type) {
      case "STAMP": {
        const rewards: Record<string, string> = {}
        for (const [k, v] of Object.entries(stampRewards)) {
          if (v.trim()) rewards[k] = v.trim()
        }
        return {
          type: "STAMP",
          stampsNeeded,
          welcomeStamps,
          rewards: Object.keys(rewards).length ? rewards : undefined,
        }
      }
      case "SERVICE":
        return {
          type: "SERVICE",
          services: services
            .filter((s) => s.name.trim())
            .map((s) => ({
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
        return {
          type: "GIFT",
          initialBalance: giftBalance,
          rechargeable: giftRechargeable,
          message: giftMessage.trim() || undefined,
          image: giftIcon,
        }
      case "COUPON":
        return {
          type: "COUPON",
          code: couponCode.trim().toUpperCase() || "PROMO",
          discount: couponDiscount,
          maxUses: couponMaxUses || undefined,
          usesPerCustomer: 1,
        }
      case "PREPAID":
        return {
          type: "PREPAID",
          minLoad: prepaidMin,
          bonusPercent: prepaidBonus,
          maxBalance: prepaidMax || undefined,
        }
      case "CASHBACK":
        return {
          type: "CASHBACK",
          percent: cashbackPercent,
          minPurchase: minPurchase || undefined,
          maxPerTx: cashbackMax || undefined,
        }
    }
  }

  const previewConfig = buildConfig()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      alert("El nombre es requerido")
      return
    }
    const config = buildConfig()
    if (config.type === "SERVICE" && config.services.length === 0) {
      alert("Agrega al menos un servicio")
      return
    }
    if (config.type === "COUPON" && !config.code.trim()) {
      alert("Código requerido")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        type,
        config,
        color,
        description: description.trim() || null,
        logoUrl,
        bgUrl,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        active: true,
      }
      if (editingId) {
        await axios.put(`/api/loyalty/programs/${editingId}`, {
          name: payload.name,
          config: payload.config,
          color: payload.color,
          description: payload.description,
          logoUrl: payload.logoUrl,
          bgUrl: payload.bgUrl,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
        })
      } else {
        await axios.post("/api/loyalty/programs", payload)
      }
      setModalOpen(false)
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

  async function deleteProgram(p: LoyaltyProgram) {
    const cards = p.cardCount ?? 0
    const msg =
      cards > 0
        ? `¿Eliminar "${p.name}"?\n\nTambién se eliminarán ${cards} tarjeta${cards === 1 ? "" : "s"} emitida${cards === 1 ? "" : "s"} a clientes. Esta acción no se puede deshacer.`
        : `¿Eliminar "${p.name}"?\n\nEsta acción no se puede deshacer.`
    if (!window.confirm(msg)) return
    try {
      await axios.delete(`/api/loyalty/programs/${p.id}`)
      await mutate()
    } catch (err: unknown) {
      const msgErr = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      alert(msgErr || "No se pudo eliminar")
    }
  }

  async function onPickImage(kind: "logo" | "bg", file: File | undefined) {
    if (!file) return
    try {
      const url = await readImageAsDataUrl(file)
      if (kind === "logo") setLogoUrl(url)
      else setBgUrl(url)
    } catch {
      alert("No se pudo cargar la imagen")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-lh-text">Mis tarjetas de lealtad</h2>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Crear tarjeta
        </button>
      </div>

      {isLoading && <p className="text-sm text-lh-muted">Cargando…</p>}

      {programsError && (
        <div className="card text-sm text-lh-danger">
          No se pudieron cargar las tarjetas: {programsError.message}
        </div>
      )}

      {!isLoading && !programsError && programs.length === 0 && (
        <div className="card text-center py-12 text-lh-muted">
          <p className="mb-3">Aún no hay programas. Crea el primero.</p>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Crear tarjeta
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {programs.map((p) => (
          <ProgramCard
            key={p.id}
            program={p}
            onEdit={() => openEdit(p)}
            onToggle={() => toggleActive(p)}
            onIssue={() => setIssueProgram(p)}
            onDelete={() => deleteProgram(p)}
          />
        ))}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false)
              resetForm()
            }
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-lh-border">
              <h3 className="font-bold text-base">
                {editingId ? "Editar tarjeta de lealtad" : "Nueva tarjeta de lealtad"}
              </h3>
              <button
                type="button"
                className="w-8 h-8 rounded-full hover:bg-lh-bg text-lh-muted"
                onClick={() => {
                  setModalOpen(false)
                  resetForm()
                }}
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
              <CardPreview
                name={name}
                type={type}
                color={color}
                config={previewConfig}
                description={description}
                logoUrl={logoUrl}
                bgUrl={bgUrl}
                balance={
                  type === "STAMP"
                    ? welcomeStamps
                    : type === "GIFT"
                      ? giftBalance
                      : 0
                }
              />

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-lh-muted mb-2">
                  Tipo de tarjeta
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LOYALTY_PROGRAM_TYPES_V1.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={!!editingId}
                      onClick={() => selectType(t)}
                      className={`flex items-center gap-1.5 text-left text-xs font-semibold rounded-[10px] border-2 px-3 py-2.5 transition-all ${
                        type === t
                          ? "border-current"
                          : "border-lh-border bg-white hover:border-[#aac9ef] hover:bg-[#f0f7ff]"
                      } ${editingId ? "opacity-60 cursor-not-allowed" : ""}`}
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
                      <span>{LOYALTY_TYPE_ICONS[t]}</span>
                      {LOYALTY_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 sm:col-span-1">
                  <span className="label">Nombre del programa *</span>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Paquete 12 Cortes"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="label">Color de fondo</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-full rounded-lg cursor-pointer border border-lh-border"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="label">Inicio</span>
                  <input
                    type="date"
                    className="input"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="label">Vencimiento</span>
                  <input
                    type="date"
                    className="input"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="label">Descripción / condiciones</span>
                  <textarea
                    className="input min-h-[72px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Condiciones de uso..."
                  />
                </label>
              </div>

              <div>
                <p className="label mb-2">Imágenes de la tarjeta</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <ImageUploadZone
                    label="LOGO (esquina superior derecha)"
                    hint="PNG transparente ideal"
                    icon="🏷️"
                    preview={logoUrl}
                    inputRef={logoInputRef}
                    onPick={(f) => onPickImage("logo", f)}
                    onClear={() => setLogoUrl(null)}
                  />
                  <ImageUploadZone
                    label="IMAGEN DE FONDO (opcional)"
                    hint="Reemplaza el color sólido"
                    icon="🖼️"
                    preview={bgUrl}
                    inputRef={bgInputRef}
                    onPick={(f) => onPickImage("bg", f)}
                    onClear={() => setBgUrl(null)}
                  />
                </div>
              </div>

              {type === "STAMP" && (
                <div className="space-y-3 border border-lh-border rounded-xl p-4 bg-lh-bg/50">
                  <p className="text-sm font-semibold">Configuración de sellos</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="label">Total de visitas / sellos</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn px-3"
                          onClick={() => setStampsNeeded(Math.max(1, stampsNeeded - 1))}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          className="input text-center"
                          value={stampsNeeded}
                          onChange={(e) => setStampsNeeded(Math.max(1, Number(e.target.value) || 1))}
                        />
                        <button
                          type="button"
                          className="btn px-3"
                          onClick={() => setStampsNeeded(Math.min(50, stampsNeeded + 1))}
                        >
                          +
                        </button>
                      </div>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="label">Sellos de bienvenida</span>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={welcomeStamps}
                        onChange={(e) => setWelcomeStamps(Number(e.target.value) || 0)}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-lh-muted">
                    Define el beneficio por visita (opcional). Las visitas sin beneficio se dejan en blanco.
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Array.from({ length: stampsNeeded }, (_, i) => {
                      const key = String(i + 1)
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-white border border-lh-border text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <input
                            className="input flex-1 text-sm"
                            placeholder={`Visita ${i + 1} — beneficio (opcional)`}
                            value={stampRewards[key] ?? ""}
                            onChange={(e) =>
                              setStampRewards((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {type === "SERVICE" && (
                <div className="space-y-3 border border-lh-border rounded-xl p-4 bg-lh-bg/50">
                  <p className="text-sm font-semibold">Servicios del paquete</p>
                  <label className="flex flex-col gap-1">
                    <span className="label">Precio total del paquete ($)</span>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(Number(e.target.value) || 0)}
                    />
                  </label>
                  {services.map((row, i) => (
                    <div key={i} className="flex flex-wrap gap-2 items-center">
                      <input
                        className="input w-14 text-center"
                        value={row.icon}
                        onChange={(e) => {
                          const next = [...services]
                          next[i] = { ...next[i], icon: e.target.value }
                          setServices(next)
                        }}
                      />
                      <input
                        className="input flex-1 min-w-[140px]"
                        placeholder="Nombre del servicio"
                        value={row.name}
                        onChange={(e) => {
                          const next = [...services]
                          next[i] = { ...next[i], name: e.target.value }
                          setServices(next)
                        }}
                      />
                      <input
                        type="number"
                        min={1}
                        className="input w-20"
                        value={row.total}
                        onChange={(e) => {
                          const next = [...services]
                          next[i] = { ...next[i], total: Number(e.target.value) || 1 }
                          setServices(next)
                        }}
                      />
                      <span className="text-xs text-lh-muted">usos</span>
                      <button
                        type="button"
                        className="btn text-xs"
                        onClick={() => setServices(services.filter((_, j) => j !== i))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn text-sm"
                    onClick={() => setServices([...services, emptyService()])}
                  >
                    + Agregar otro servicio
                  </button>
                </div>
              )}

              {type === "GIFT" && (
                <div className="space-y-3 border border-lh-border rounded-xl p-4 bg-lh-bg/50">
                  <p className="text-sm font-semibold">Tarjeta regalo</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="label">Saldo inicial ($) *</span>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={giftBalance}
                        onChange={(e) => setGiftBalance(Number(e.target.value) || 0)}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="label">Recargable</span>
                      <select
                        className="input"
                        value={giftRechargeable ? "1" : "0"}
                        onChange={(e) => setGiftRechargeable(e.target.value === "1")}
                      >
                        <option value="0">No, saldo único</option>
                        <option value="1">Sí, recargable</option>
                      </select>
                    </label>
                  </div>
                  <div>
                    <span className="label mb-2 block">Ícono decorativo</span>
                    <div className="flex flex-wrap gap-2">
                      {GIFT_ICONS.map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setGiftIcon(ic)}
                          className={`w-10 h-10 rounded-lg border-2 text-lg ${
                            giftIcon === ic
                              ? "border-lh-accent bg-[#e8f2fc]"
                              : "border-lh-border bg-white"
                          }`}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="label">Mensaje para el destinatario</span>
                    <textarea
                      className="input min-h-[64px]"
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      placeholder="Feliz cumpleaños! Este regalo es especial para ti"
                    />
                  </label>
                </div>
              )}

              {type === "DISCOUNT" && (
                <div className="grid grid-cols-2 gap-3 border border-lh-border rounded-xl p-4 bg-lh-bg/50">
                  <p className="text-sm font-semibold col-span-2">Descuento</p>
                  <label className="flex flex-col gap-1">
                    <span className="label">Tipo</span>
                    <select
                      className="input"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                    >
                      <option value="percent">Porcentaje (%)</option>
                      <option value="fixed">Monto fijo ($)</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="label">Valor *</span>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 col-span-2">
                    <span className="label">Compra mínima ($)</span>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={minPurchase}
                      onChange={(e) => setMinPurchase(Number(e.target.value) || 0)}
                    />
                  </label>
                </div>
              )}

              {type === "COUPON" && (
                <div className="grid grid-cols-2 gap-3 border border-lh-border rounded-xl p-4 bg-lh-bg/50">
                  <p className="text-sm font-semibold col-span-2">Cupón</p>
                  <label className="flex flex-col gap-1">
                    <span className="label">Código *</span>
                    <input
                      className="input uppercase"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="VERANO20"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="label">Descuento (%) *</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="input"
                      value={couponDiscount}
                      onChange={(e) => setCouponDiscount(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 col-span-2">
                    <span className="label">Total de usos</span>
                    <input
                      type="number"
                      min={1}
                      className="input"
                      value={couponMaxUses}
                      onChange={(e) => setCouponMaxUses(Number(e.target.value) || 1)}
                    />
                  </label>
                </div>
              )}

              {type === "PREPAID" && (
                <div className="grid grid-cols-2 gap-3 border border-lh-border rounded-xl p-4 bg-lh-bg/50">
                  <p className="text-sm font-semibold col-span-2">Prepago monetario</p>
                  <label className="flex flex-col gap-1">
                    <span className="label">Carga mínima ($) *</span>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={prepaidMin}
                      onChange={(e) => setPrepaidMin(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="label">Bonificación (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="input"
                      value={prepaidBonus}
                      onChange={(e) => setPrepaidBonus(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 col-span-2">
                    <span className="label">Saldo máximo ($)</span>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={prepaidMax}
                      onChange={(e) => setPrepaidMax(Number(e.target.value) || 0)}
                    />
                  </label>
                </div>
              )}

              {type === "CASHBACK" && (
                <div className="grid grid-cols-2 gap-3 border border-lh-border rounded-xl p-4 bg-lh-bg/50">
                  <p className="text-sm font-semibold col-span-2">Cashback</p>
                  <label className="flex flex-col gap-1">
                    <span className="label">Porcentaje (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="input"
                      value={cashbackPercent}
                      onChange={(e) => setCashbackPercent(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="label">Compra mínima ($)</span>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={minPurchase}
                      onChange={(e) => setMinPurchase(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 col-span-2">
                    <span className="label">Cashback máximo por compra ($)</span>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={cashbackMax}
                      onChange={(e) => setCashbackMax(Number(e.target.value) || 0)}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-lh-border bg-[#fafaf8]">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setModalOpen(false)
                  resetForm()
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Guardando…" : editingId ? "✓ Guardar cambios" : "✓ Crear tarjeta"}
              </button>
            </div>
          </form>
        </div>
      )}

      {issueProgram && (
        <IssueProgramModal
          program={issueProgram}
          customers={customers}
          onClose={() => setIssueProgram(null)}
          onIssued={async () => {
            setIssueProgram(null)
            await mutate()
            await mutateCustomers()
          }}
          mutateCustomers={mutateCustomers}
        />
      )}
    </div>
  )
}

function ProgramCard({
  program: p,
  onEdit,
  onToggle,
  onIssue,
  onDelete,
}: {
  program: LoyaltyProgram
  onEdit: () => void
  onToggle: () => void
  onIssue: () => void
  onDelete: () => void
}) {
  const hasBg = !!p.bgUrl
  return (
    <div
      className="rounded-2xl overflow-hidden text-white relative min-h-[180px] flex flex-col justify-between shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all"
      style={hasBg ? undefined : { background: p.color }}
    >
      {hasBg && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${p.bgUrl})` }}
          />
          <div className="absolute inset-0 bg-black/30" />
        </>
      )}
      <span
        className="absolute top-3 left-3 z-[2] w-2.5 h-2.5 rounded-full"
        style={{ background: p.active ? "#4ade80" : "#f59e0b" }}
        title={p.active ? "Activo" : "Pausado"}
      />
      {p.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.logoUrl}
          alt=""
          className="absolute top-3 right-3 z-[2] w-11 h-11 rounded-lg object-contain bg-white/15 p-0.5"
        />
      )}
      <div className="relative z-[2] p-4 pb-2">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full mb-2">
          {LOYALTY_TYPE_LABELS[p.type] || p.type}
        </span>
        <h4 className="text-base font-bold mb-1">{p.name}</h4>
        {p.description && <p className="text-xs opacity-85 line-clamp-2">{p.description}</p>}
        <div className="mt-2 text-[11px] opacity-80 leading-relaxed">
          {programMeta(p)}
          <br />
          👤 {p.cardCount ?? 0} · ✓ {p.redeemCount ?? 0} canjes
        </div>
      </div>
      <div className="relative z-[2] px-4 py-2.5 border-t border-white/20 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          ✎ Editar
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          {p.active ? "⏸ Pausar" : "▶ Activar"}
        </button>
        <button
          type="button"
          onClick={onIssue}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          🎁 Emitir
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-black/25 hover:bg-red-600/80 transition-colors"
        >
          🗑 Eliminar
        </button>
      </div>
    </div>
  )
}

function ImageUploadZone({
  label,
  hint,
  icon,
  preview,
  inputRef,
  onPick,
  onClear,
}: {
  label: string
  hint: string
  icon: string
  preview: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onPick: (file: File | undefined) => void
  onClear: () => void
}) {
  return (
    <div>
      <p className="text-[11px] text-lh-muted font-semibold mb-1.5">{label}</p>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        className="relative border-2 border-dashed border-lh-border rounded-xl p-4 text-center cursor-pointer hover:border-lh-accent bg-white min-h-[100px] flex flex-col items-center justify-center"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="max-h-[70px] max-w-full rounded-md object-contain mx-auto" />
            <button
              type="button"
              className="absolute top-1.5 right-1.5 w-[22px] h-[22px] rounded-full bg-black/55 text-white text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xs text-lh-muted">
              Subir
              <br />
              <span className="text-[10px]">{hint}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function IssueProgramModal({
  program,
  customers,
  onClose,
  onIssued,
  mutateCustomers,
}: {
  program: LoyaltyProgram
  customers: Customer[]
  onClose: () => void
  onIssued: () => Promise<void>
  mutateCustomers: () => Promise<unknown>
}) {
  const [phone, setPhone] = useState("")
  const [newName, setNewName] = useState("")
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [issuing, setIssuing] = useState(false)

  function searchByPhone(value: string) {
    setPhone(value)
    const norm = normalizePhoneMX(value)
    if (norm.length !== 10) {
      setCustomerId(null)
      setCustomerName("")
      return
    }
    const found = customers.find((c) => normalizePhoneMX(c.phone) === norm)
    if (found) {
      setCustomerId(found.id)
      setCustomerName(found.name)
      setNewName(found.name)
    } else {
      setCustomerId(null)
      setCustomerName("")
    }
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault()
    const norm = normalizePhoneMX(phone)
    if (norm.length !== 10) {
      alert("Teléfono de 10 dígitos")
      return
    }
    setIssuing(true)
    try {
      let cid = customerId
      if (!cid) {
        const name = newName.trim()
        if (!name) throw new Error("Nombre requerido para cliente nuevo")
        const res = await axios.post("/api/customers", { name, phone: norm })
        cid = res.data.id
        await mutateCustomers()
      }
      await axios.post("/api/loyalty/cards/issue", {
        customerId: cid,
        programId: program.id,
      })
      alert(`Tarjeta "${program.name}" emitida correctamente`)
      await onIssued()
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error
        : err instanceof Error
          ? err.message
          : "Error"
      alert(msg || "No se pudo emitir")
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleIssue}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl my-8 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-lh-border">
          <h3 className="font-bold text-base">Emitir: {program.name}</h3>
          <button type="button" className="w-8 h-8 rounded-full hover:bg-lh-bg" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <CardPreview
            name={program.name}
            type={program.type as ProgramType}
            color={program.color}
            config={program.config}
            description={program.description}
            logoUrl={program.logoUrl}
            bgUrl={program.bgUrl}
            compact
            footerRight={`Para: ${newName.trim() || customerName || "—"}`}
          />
          <label className="flex flex-col gap-1">
            <span className="label">Número de celular del cliente *</span>
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={(e) => searchByPhone(e.target.value)}
              placeholder="442 123 4567"
              required
            />
          </label>
          {customerId ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">
              <strong>{customerName}</strong>
              <span className="text-lh-muted"> · encontrado</span>
            </div>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="label">Nombre que aparece en la tarjeta</span>
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. María López"
              />
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-lh-border">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={issuing}>
            {issuing ? "Emitiendo…" : "🎁 Emitir tarjeta"}
          </button>
        </div>
      </form>
    </div>
  )
}
