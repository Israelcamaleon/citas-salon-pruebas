'use client'

import useSWR from "swr"
import axios from "axios"
import { useState } from "react"
import type { LoyaltyProgram } from "@/types/loyalty"
import { LOYALTY_TYPE_COLORS } from "@/lib/loyalty"
import CardPreview from "./CardPreview"
import type { ProgramConfig } from "@/schemas/loyalty/program-config.schema"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type ProgramType = "STAMP" | "SERVICE"

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
    if (p.config.type === "STAMP") {
      setStampsNeeded(p.config.stampsNeeded)
      setWelcomeStamps(p.config.welcomeStamps)
    } else if (p.config.type === "SERVICE") {
      setServices(
        p.config.services.map((s) => ({
          name: s.name,
          total: s.total,
          icon: s.icon ?? "",
        }))
      )
      setServicePrice(p.config.price ?? 0)
    }
  }

  function buildConfig(): ProgramConfig {
    if (type === "STAMP") {
      return {
        type: "STAMP",
        stampsNeeded,
        welcomeStamps,
      }
    }
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
  }

  const previewConfig = buildConfig()
  const previewValid =
    previewConfig.type === "STAMP"
      ? previewConfig.stampsNeeded >= 1
      : previewConfig.type === "SERVICE" && previewConfig.services.length > 0

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
      if (editingId) {
        await axios.put(`/api/loyalty/programs/${editingId}`, payload)
      } else {
        await axios.post("/api/loyalty/programs", payload)
      }
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
      <p className="text-sm text-gray-600">
        Crea programas de sellos o paquetes de servicios. Solo STAMP y SERVICE en V1.
      </p>

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={handleSubmit} className="space-y-3 border rounded-lg p-4 bg-white">
          <h3 className="font-medium">
            {editingId ? "Editar programa" : "Nuevo programa"}
          </h3>

          <label className="flex flex-col gap-1">
            <span className="label">Nombre</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Café gratis"
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Tipo</span>
            <select
              className="input"
              value={type}
              disabled={!!editingId}
              onChange={(e) => {
                const t = e.target.value as ProgramType
                setType(t)
                setColor(LOYALTY_TYPE_COLORS[t])
              }}
            >
              <option value="STAMP">Sellos (STAMP)</option>
              <option value="SERVICE">Paquete de servicios</option>
            </select>
          </label>

          {type === "STAMP" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="label">Sellos necesarios</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input"
                  value={stampsNeeded}
                  onChange={(e) => setStampsNeeded(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Sellos de bienvenida</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  className="input"
                  value={welcomeStamps}
                  onChange={(e) => setWelcomeStamps(Number(e.target.value))}
                />
              </label>
            </div>
          )}

          {type === "SERVICE" && (
            <div className="space-y-2">
              <span className="label">Servicios incluidos</span>
              {services.map((row, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-center">
                  <input
                    className="input col-span-2"
                    placeholder="Nombre"
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
                    className="input col-span-1"
                    placeholder="Cant."
                    value={row.total}
                    onChange={(e) => {
                      const next = [...services]
                      next[i] = { ...next[i], total: Number(e.target.value) }
                      setServices(next)
                    }}
                  />
                  <input
                    className="input col-span-1"
                    placeholder="Icono"
                    value={row.icon}
                    onChange={(e) => {
                      const next = [...services]
                      next[i] = { ...next[i], icon: e.target.value }
                      setServices(next)
                    }}
                  />
                  <button
                    type="button"
                    className="btn text-sm col-span-2"
                    onClick={() => setServices(services.filter((_, j) => j !== i))}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn text-sm"
                onClick={() => setServices([...services, emptyService()])}
              >
                + Servicio
              </button>
              <label className="flex flex-col gap-1">
                <span className="label">Precio del paquete (opcional)</span>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(Number(e.target.value))}
                />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="label">Color</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span className="text-sm">Activo</span>
          </label>

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : editingId ? "Actualizar" : "Crear"}
            </button>
            {editingId && (
              <button type="button" className="btn" onClick={resetForm}>
                Cancelar
              </button>
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
              balance={type === "STAMP" && previewConfig.type === "STAMP" ? previewConfig.welcomeStamps : 0}
            />
          ) : (
            <div className="card text-sm text-gray-500">Completa el formulario</div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded-lg bg-white">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2">Nombre</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="p-4 text-gray-500">Cargando…</td></tr>
            )}
            {(programs ?? []).map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2">{p.type}</td>
                <td className="p-2">
                  <span className={p.active ? "text-green-700" : "text-gray-400"}>
                    {p.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="p-2 flex gap-2">
                  <button type="button" className="btn text-xs" onClick={() => loadProgram(p)}>
                    Editar
                  </button>
                  <button type="button" className="btn text-xs" onClick={() => toggleActive(p)}>
                    {p.active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && (programs ?? []).length === 0 && (
              <tr><td colSpan={4} className="p-4 text-gray-500">Sin programas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
