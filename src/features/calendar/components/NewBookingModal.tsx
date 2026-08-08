'use client'

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { asArray, fetcher } from "@/lib/api"
import { toast } from "@/lib/toast"

type Customer = { id: number; name: string; phone: string | null }
type Service = { id: number; name: string; durationMin: number; isActive: boolean }
type Staff = { id: number; name: string; isActive: boolean }
type Location = { id: number; name: string; isActive: boolean }

type Props = {
  /** "YYYY-MM-DDTHH:mm" prellenado desde el hueco del calendario */
  fechaInicial: string
  staffInicial?: number | null
  locationInicial?: number | null
  onClose: () => void
  onSaved: () => void
}

/** Modal para crear cita rápida al tocar un hueco del calendario */
export default function NewBookingModal({
  fechaInicial,
  staffInicial,
  locationInicial,
  onClose,
  onSaved,
}: Props) {
  const { data: servicesData } = useSWR<Service[]>("/api/services", fetcher, { revalidateOnFocus: false })
  const { data: staffsData } = useSWR<Staff[]>("/api/staffs", fetcher, { revalidateOnFocus: false })
  const { data: locationsData } = useSWR<Location[]>("/api/locations", fetcher, { revalidateOnFocus: false })
  const { data: customersData, mutate: mutateCustomers } = useSWR<Customer[]>("/api/customers", fetcher, { revalidateOnFocus: false })

  const services = asArray<Service>(servicesData)
  const staffs = asArray<Staff>(staffsData)
  const locations = asArray<Location>(locationsData)
  const customers = asArray<Customer>(customersData)

  const [date, setDate] = useState(fechaInicial)
  const [serviceId, setServiceId] = useState("")
  const [staffId, setStaffId] = useState(staffInicial ? String(staffInicial) : "")
  const [locationId, setLocationId] = useState(locationInicial ? String(locationInicial) : "")
  const [durationMin, setDurationMin] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [altaRapida, setAltaRapida] = useState(false)
  const [nuevoTelefono, setNuevoTelefono] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const svc = services.find((s) => s.id === Number(serviceId))
    if (svc) setDurationMin(String(svc.durationMin))
  }, [serviceId, services])

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    const base = [...customers].sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"))
    if (!q) return base
    return base.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q))
  }, [customers, customerSearch])

  async function crearClienteRapido() {
    if (!customerSearch.trim() || !nuevoTelefono.trim()) {
      toast("Escribe nombre y teléfono del cliente", "error")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customerSearch.trim(), phone: nuevoTelefono.trim() }),
      })
      if (!res.ok) throw new Error()
      const creado: Customer = await res.json()
      await mutateCustomers()
      setCustomerId(String(creado.id))
      setCustomerSearch(creado.name)
      setAltaRapida(false)
      toast("Cliente creado")
    } catch {
      toast("No se pudo crear el cliente", "error")
    } finally {
      setSaving(false)
    }
  }

  async function guardar() {
    if (!date || !serviceId || !staffId || !locationId || !durationMin || !customerId) {
      toast("Completa todos los campos, incluyendo cliente", "error")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          durationMin: Number(durationMin),
          serviceId: Number(serviceId),
          staffId: Number(staffId),
          locationId: Number(locationId),
          customerId: Number(customerId),
        }),
      })
      if (!res.ok) throw new Error()
      toast("✅ Cita creada")
      onSaved()
      onClose()
    } catch {
      toast("No se pudo crear la cita", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-lg p-4 space-y-3 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">＋ Nueva cita</h3>
          <button className="text-sm underline" onClick={onClose}>Cerrar</button>
        </div>

        <label className="block text-sm font-medium">
          Fecha y hora
          <input
            type="datetime-local"
            className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Servicio
            <select
              className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {services.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Duración (min)
            <input
              type="number"
              min={5}
              step={5}
              className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Colaborador
            <select
              className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {staffs.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Sucursal
            <select
              className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {locations.filter((l) => l.isActive).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-1 relative">
          <label className="block text-sm font-medium">Cliente</label>
          <input
            type="text"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Buscar por nombre o teléfono…"
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value)
              setCustomerId("")
              setDropdownOpen(true)
            }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            autoComplete="off"
          />
          {customerId && (
            <p className="text-xs text-green-700">✓ Cliente seleccionado</p>
          )}
          {dropdownOpen && filteredCustomers.length > 0 && !customerId && (
            <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border bg-white shadow-lg text-sm">
              {filteredCustomers.slice(0, 30).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setCustomerId(String(c.id))
                      setCustomerSearch(c.name)
                      setDropdownOpen(false)
                    }}
                  >
                    {c.name} {c.phone ? `· ${c.phone}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!customerId && customerSearch.trim() && filteredCustomers.length === 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs space-y-2">
              <span>No existe "{customerSearch}". </span>
              <button type="button" className="underline font-medium" onClick={() => setAltaRapida(true)}>
                Dar de alta rápido
              </button>
            </div>
          )}
          {altaRapida && (
            <div className="flex gap-2">
              <input
                type="tel"
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                placeholder="Teléfono (10 dígitos)"
                value={nuevoTelefono}
                onChange={(e) => setNuevoTelefono(e.target.value)}
              />
              <button type="button" className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white" disabled={saving} onClick={crearClienteRapido}>
                Crear
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="w-full rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          disabled={saving}
          onClick={guardar}
        >
          {saving ? "Guardando…" : "✅ Crear cita"}
        </button>
      </div>
    </div>
  )
}
