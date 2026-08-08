'use client'
import useSWR from "swr"
import axios from "axios"
import Link from "next/link"
import { useRef, useState, useMemo } from "react"
import { asArray, fetcher } from "@/lib/api"

type Customer = { id:number; name:string; phone:string|null; email:string|null; notes:string|null; sexo:string|null }

const SEXO_LABELS: Record<string,string> = { mujer:"Mujer", hombre:"Hombre", otro:"Otro" }

export default function Customers(){
  const formRef=useRef<HTMLFormElement>(null)
  const { data, mutate }=useSWR<Customer[]>('/api/customers', fetcher)
  const list = asArray<Customer>(data)

  const [query, setQuery] = useState('')
  const filtered = useMemo(()=>{
    const q=query.trim().toLowerCase()
    if(!q) return list
    return list.filter(r =>
      [r.name, r.phone||'', r.email||'', r.notes||''].some(v => (v||'').toLowerCase().includes(q))
    )
  },[list, query])

  const [editingId, setEditingId] = useState<number|null>(null)
  const [editRow, setEditRow] = useState<Partial<Customer>>({})

  async function onSubmit(e:any){
    e.preventDefault()
    const fd=new FormData(e.currentTarget)
    const payload:any={}
    fd.forEach((v,k)=>{ payload[k]=String(v).trim() })
    if(!payload.sexo) delete payload.sexo
    if(!payload.name){ alert('Nombre es requerido'); return }
    try{
      await axios.post('/api/customers', payload)
      formRef.current?.reset()
      mutate()
    }catch(err:any){
      alert(err?.response?.data?.error||'No se pudo crear')
    }
  }

  async function remove(id:number){
    if(!confirm('¿Eliminar cliente?')) return
    await axios.delete(`/api/customers/${id}`)
    mutate()
  }

  function startEdit(row:Customer){ setEditingId(row.id); setEditRow({...row}) }
  function cancelEdit(){ setEditingId(null); setEditRow({}) }
  async function saveEdit(id:number){
    try{
      await axios.patch(`/api/customers/${id}`, editRow)
      setEditingId(null); setEditRow({})
      mutate()
    }catch(err:any){
      alert(err?.response?.data?.error||'No se pudo actualizar')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Clientes</h2>

      {/* Crear nuevo */}
      <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 border p-3 rounded-lg">
        <label className="flex flex-col gap-1">
          <span className="text-sm">Nombre</span>
          <input name="name" className="input" placeholder="Nombre del cliente" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Teléfono</span>
          <input name="phone" className="input" placeholder="55..." />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Sexo</span>
          <select name="sexo" className="input" defaultValue="">
            <option value="">—</option>
            <option value="mujer">Mujer</option>
            <option value="hombre">Hombre</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Email</span>
          <input name="email" type="email" className="input" placeholder="correo@dominio.com" />
        </label>
        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-sm">Notas</span>
          <input name="notes" className="input" placeholder="Notas internas..." />
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn">Agregar</button>
        </div>
      </form>

      {/* Buscar */}
      <div className="flex items-center gap-3">
        <input className="input" placeholder="Buscar cliente..." value={query} onChange={e=>setQuery(e.target.value)} />
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Sexo</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Email</th>
              <th className="p-2">Notas</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((row)=>{
              const isEditing = editingId===row.id
              return (
                <tr key={row.id} className="border-b">
                  <td className="p-2">{row.id}</td>
                  <td className="p-2">
                    {isEditing ? (
                      <input className="input" value={editRow.name||''} onChange={e=>setEditRow({...editRow, name:e.target.value})} />
                    ) : row.name}
                  </td>
                  <td className="p-2">
                    {isEditing ? (
                      <select className="input" value={editRow.sexo||''} onChange={e=>setEditRow({...editRow, sexo:e.target.value||null})}>
                        <option value="">—</option>
                        <option value="mujer">Mujer</option>
                        <option value="hombre">Hombre</option>
                        <option value="otro">Otro</option>
                      </select>
                    ) : (row.sexo ? SEXO_LABELS[row.sexo] ?? row.sexo : "—")}
                  </td>
                  <td className="p-2">
                    {isEditing ? (
                      <input className="input" value={editRow.phone||''} onChange={e=>setEditRow({...editRow, phone:e.target.value})} />
                    ) : (row.phone || "—")}
                  </td>
                  <td className="p-2">
                    {isEditing ? (
                      <input className="input" type="email" value={editRow.email||''} onChange={e=>setEditRow({...editRow, email:e.target.value})} />
                    ) : (row.email || "—")}
                  </td>
                  <td className="p-2">
                    {isEditing ? (
                      <input className="input" value={editRow.notes||''} onChange={e=>setEditRow({...editRow, notes:e.target.value})} />
                    ) : (row.notes || "—")}
                  </td>
                  <td className="p-2 space-x-2">
                    {!isEditing ? (
                      <>
                        <Link className="btn" href={`/ficha/${row.id}`}>Ficha</Link>
                        <button className="btn" onClick={()=>startEdit(row)}>Editar</button>
                        <button className="btn" onClick={()=>remove(row.id)}>Eliminar</button>
                      </>
                    ) : (
                      <>
                        <button className="btn" onClick={()=>saveEdit(row.id)}>Guardar</button>
                        <button className="btn" onClick={cancelEdit}>Cancelar</button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
