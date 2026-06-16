'use client'

import useSWR from 'swr'
import axios from 'axios'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Service {
  id: number
  name: string
  durationMin: number
  priceMXN: number
  isActive: boolean
}

export default function ServicesSection() {
  const { data, error, isLoading, mutate } = useSWR<Service[]>('/api/services', fetcher)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [durationMin, setDurationMin] = useState<number>(60)
  const [priceMXN, setPriceMXN] = useState<number>(0)
  const [isActive, setIsActive] = useState<boolean>(true)

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDurationMin(60)
    setPriceMXN(0)
    setIsActive(true)
  }

  const startEdit = (s: Service) => {
    setEditingId(s.id)
    setName(s.name)
    setDurationMin(s.durationMin)
    setPriceMXN(s.priceMXN)
    setIsActive(s.isActive)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      alert('El nombre del servicio es obligatorio')
      return
    }
    if (!durationMin || durationMin <= 0) {
      alert('La duración debe ser mayor a 0')
      return
    }
    if (priceMXN < 0) {
      alert('El precio no puede ser negativo')
      return
    }

    const payload = {
      name: trimmedName,
      durationMin: Number(durationMin),
      priceMXN: Number(priceMXN),
      isActive,
    }

    try {
      if (editingId === null) {
        // Crear servicio
        await axios.post('/api/services', payload)
      } else {
        // Actualizar servicio existente
        await axios.put(`/api/services/${editingId}`, payload)
      }
      resetForm()
      await mutate()
    } catch (err: any) {
      console.error(err)
      alert(err?.response?.data?.error || 'Error guardando servicio')
    }
  }

  const toggleActive = async (s: Service) => {
    try {
      await axios.put(`/api/services/${s.id}`, {
        isActive: !s.isActive,
      })
      await mutate()
    } catch (err: any) {
      console.error(err)
      alert(err?.response?.data?.error || 'No se pudo cambiar el estado')
    }
  }

  if (error) {
    return <div className="card">Error cargando servicios.</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Servicios</h2>
      <p className="text-sm text-gray-600">
        Administra el catálogo de servicios que se usa al agendar citas.
      </p>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 border p-3 rounded-lg bg-white"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nombre del servicio</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Corte caballero, color, etc."
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Duración (min)</label>
          <input
            type="number"
            className="input"
            min={10}
            step={5}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Precio (MXN)</label>
          <input
            type="number"
            className="input"
            min={0}
            step={10}
            value={priceMXN}
            onChange={(e) => setPriceMXN(Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Estado</label>
          <select
            className="input"
            value={isActive ? '1' : '0'}
            onChange={(e) => setIsActive(e.target.value === '1')}
          >
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </select>
        </div>

        <div className="flex items-end gap-2 col-span-full">
          <button type="submit" className="btn btn-primary">
            {editingId === null ? 'Crear servicio' : 'Guardar cambios'}
          </button>
          {editingId !== null && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="table min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Nombre</th>
              <th className="text-left p-2">Duración</th>
              <th className="text-left p-2">Precio</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-2 text-center text-gray-500">
                  Cargando servicios…
                </td>
              </tr>
            )}
            {!isLoading && (!data || data.length === 0) && (
              <tr>
                <td colSpan={5} className="p-2 text-center text-gray-500">
                  Aún no hay servicios registrados.
                </td>
              </tr>
            )}
            {data?.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.durationMin} min</td>
                <td className="p-2">
                  {s.priceMXN ? `$${s.priceMXN} MXN` : '—'}
                </td>
                <td className="p-2">
                  {s.isActive ? (
                    <span className="badge badge-green">Activo</span>
                  ) : (
                    <span className="badge badge-gray">Inactivo</span>
                  )}
                </td>
                <td className="p-2 space-x-2">
                  <button
                    type="button"
                    className="btn btn-xs"
                    onClick={() => startEdit(s)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-secondary"
                    onClick={() => toggleActive(s)}
                  >
                    {s.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

