'use client'
import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { asArray, fetcher } from "@/lib/api"
import CustomerProfile from "@/features/customers/components/CustomerProfile"

type Customer = { id: number; name: string; phone: string | null; email: string | null; sexo: string | null }

export default function GlobalSearch() {
  const { data } = useSWR<Customer[]>("/api/customers", fetcher, { revalidateOnFocus: false })
  const list = asArray<Customer>(data)
  const [query, setQuery] = useState("")
  const [abierto, setAbierto] = useState(false)
  const [perfilId, setPerfilId] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return list
      .filter((c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
        (c.email ?? "").toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [list, query])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        className="input w-full !py-1.5 text-sm"
        placeholder="🔍 Buscar cliente (nombre o celular)"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
      />
      {abierto && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 rounded-lg border border-lh-border bg-white shadow-lg overflow-hidden">
          {resultados.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-lh-muted">Sin resultados</div>
          ) : (
            resultados.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-lh-bg border-b last:border-b-0"
                onClick={() => { setPerfilId(c.id); setAbierto(false); setQuery("") }}
              >
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-lh-muted truncate">{c.phone ?? "Sin celular"}{c.email ? ` · ${c.email}` : ""}</div>
              </button>
            ))
          )}
        </div>
      )}
      {perfilId !== null && (
        <CustomerProfile customerId={perfilId} onClose={() => setPerfilId(null)} />
      )}
    </div>
  )
}
