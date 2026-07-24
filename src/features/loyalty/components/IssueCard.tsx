'use client'

import useSWR from "swr"
import axios from "axios"
import { useState } from "react"
import type { LoyaltyProgram } from "@/types/loyalty"
import { normalizePhoneMX } from "@/lib/utils/phone"
import { asArray, fetcher } from "@/lib/api"

type Customer = { id: number; name: string; phone: string | null }

export default function IssueCard() {
  const { data: programsData } = useSWR<LoyaltyProgram[]>("/api/loyalty/programs", fetcher)
  const { data: customersData, mutate: mutateCustomers } = useSWR<Customer[]>("/api/customers", fetcher)
  const programs = asArray<LoyaltyProgram>(programsData)
  const customers = asArray<Customer>(customersData)

  const [phone, setPhone] = useState("")
  const [newName, setNewName] = useState("")
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [programId, setProgramId] = useState<number | "">("")
  const [issuing, setIssuing] = useState(false)

  const activePrograms = programs.filter((p) => p.active)

  function searchByPhone() {
    const norm = normalizePhoneMX(phone)
    if (norm.length !== 10) {
      alert("Teléfono de 10 dígitos")
      return
    }
    const found = customers.find((c) => normalizePhoneMX(c.phone) === norm)
    if (found) {
      setCustomerId(found.id)
      setCustomerName(found.name)
      setNewName("")
    } else {
      setCustomerId(null)
      setCustomerName("")
    }
  }

  async function ensureCustomer(): Promise<number> {
    if (customerId) return customerId
    const norm = normalizePhoneMX(phone)
    if (norm.length !== 10) throw new Error("Teléfono inválido")
    const name = newName.trim()
    if (!name) throw new Error("Nombre requerido para cliente nuevo")
    const res = await axios.post("/api/customers", { name, phone: norm })
    await mutateCustomers()
    return res.data.id
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault()
    if (!programId) {
      alert("Selecciona un programa")
      return
    }
    setIssuing(true)
    try {
      const cid = await ensureCustomer()
      await axios.post("/api/loyalty/cards/issue", {
        customerId: cid,
        programId: Number(programId),
      })
      alert("Tarjeta emitida correctamente")
      setPhone("")
      setNewName("")
      setCustomerId(null)
      setCustomerName("")
      setProgramId("")
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      alert(msg || "No se pudo emitir")
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Emite una tarjeta de lealtad a un cliente existente o nuevo.
      </p>

      <form onSubmit={handleIssue} className="space-y-3 border rounded-lg p-4 bg-white max-w-lg">
        <label className="flex flex-col gap-1">
          <span className="label">Teléfono</span>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10 dígitos"
              required
            />
            <button type="button" className="btn" onClick={searchByPhone}>
              Buscar
            </button>
          </div>
        </label>

        {customerId ? (
          <p className="text-sm text-green-700">
            Cliente encontrado: <strong>{customerName}</strong>
          </p>
        ) : phone && (
          <label className="flex flex-col gap-1">
            <span className="label">Nombre (cliente nuevo)</span>
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre completo"
            />
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="label">Programa</span>
          <select
            className="input"
            value={programId}
            onChange={(e) => setProgramId(e.target.value ? Number(e.target.value) : "")}
            required
          >
            <option value="">Seleccionar…</option>
            {activePrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </label>

        {activePrograms.length === 0 && (
          <p className="text-sm text-amber-700">Crea un programa activo primero.</p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={issuing || activePrograms.length === 0}
        >
          {issuing ? "Emitiendo…" : "Emitir tarjeta"}
        </button>
      </form>
    </div>
  )
}
