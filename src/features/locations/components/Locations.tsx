'use client'
import useSWR from "swr"
import axios from "axios"
import { useEffect, useRef, useState, useMemo } from "react"
const fetcher=(u:string)=>fetch(u).then(r=>r.json())

type Location = { id:number; name:string; address:string; phone:string|null; isActive:boolean }
type Staff = { id:number; name:string }

// ---- localStorage helpers ----
function readStaffByLocation(): Record<string, number[]> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('staffByLocation') || '{}') } catch { return {} }
}
function writeStaffByLocation(map: Record<string, number[]>) {
  if (typeof window === 'undefined') return
  localStorage.setItem('staffByLocation', JSON.stringify(map))
}

export default function Locations(){
  const formRef=useRef<HTMLFormElement>(null)
  const { data: locations, mutate }=useSWR<Location[]>('/api/locations', fetcher)
  const { data: staffs }=useSWR<Staff[]>('/api/staffs', fetcher)

  const [query, setQuery] = useState('')
  const filtered = useMemo(()=>{
    const q=query.trim().toLowerCase()
    if(!q) return locations||[]
    return (locations||[]).filter(r =>
      [r.name, r.address, r.phone||'', r.isActive?'activo':'inactivo'].some(v => (v||'').toLowerCase().includes(q))
    )
  },[locations, query])

  const [editingId, setEditingId] = useState<number|null>(null)
  const [editRow, setEditRow] = useState<Partial<Location>>({})

  async function onSubmit(e:any){
    e.preventDefault()
    const fd=new FormData(e.currentTarget)
    const payload:any={}
    fd.forEach((v,k)=>{ const s=String(v).trim(); if(k==='isActive') payload[k]=true; else payload[k]=s })
    payload.isActive = e.currentTarget.querySelector('input[name="isActive"]')?.checked || false
    try{
      await axios.post('/api/locations', payload)
      formRef.current?.reset()
      mutate()
    }catch(err:any){
      alert(err?.response?.data?.error||'No se pudo crear')
    }
  }

  async function remove(id:number){
    if(!confirm('¿Eliminar sucursal?')) return
    await axios.delete(`/api/locations/${id}`)
    mutate()
  }

  function startEdit(row:Location){ setEditingId(row.id); setEditRow({...row}) }
  function cancelEdit(){ setEditingId(null); setEditRow({}) }
  async function saveEdit(id:number){
    await axios.patch(`/api/locations/${id}`, editRow)
    setEditingId(null); setEditRow({})
    mutate()
  }

  // -------- Asignación de colaboradores por sucursal (STATEFUL) --------
  const [selectedLocId, setSelectedLocId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const allStaffIds = useMemo(()=> (staffs??[]).map(s=>s.id), [staffs])

  // Cargar asignación al cambiar sucursal o lista de staffs
  useEffect(()=>{
    if(!selectedLocId){
      setSelectedIds([])
      return
    }
    const map = readStaffByLocation()
    const entry = map[String(selectedLocId)]
    if (entry === undefined){
      // Por defecto: todos
      setSelectedIds(allStaffIds)
    } else {
      setSelectedIds(entry)
    }
  }, [selectedLocId, allStaffIds])

  // Persistir en localStorage cuando cambia selectedIds
  useEffect(()=>{
    if(!selectedLocId) return
    const key = String(selectedLocId)
    const map = readStaffByLocation()
    // Si coincide exactamente con "todos", eliminamos la entrada (usa default)
    const equalsAll = selectedIds.length === allStaffIds.length && selectedIds.every(id=>allStaffIds.includes(id))
    if (equalsAll){
      delete map[key]
    } else {
      map[key] = selectedIds
    }
    writeStaffByLocation(map)
  }, [selectedIds, selectedLocId, allStaffIds])

  function toggleStaff(id:number, checked:boolean){
    setSelectedIds(prev => {
      const set = new Set(prev)
      if (checked) set.add(id); else set.delete(id)
      return Array.from(set)
    })
  }
  function useAll(){ setSelectedIds(allStaffIds) }
  function deselectAll(){ setSelectedIds([]) }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Sucursales</h2>

      {/* Crear nueva */}
      <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 border p-3 rounded-lg">
        <label className="flex flex-col gap-1">
          <span className="text-sm">Nombre</span>
          <input name="name" className="input" placeholder="Nombre de la sucursal" required />
        </label>
        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-sm">Dirección</span>
          <input name="address" className="input" placeholder="Calle, número..." required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Teléfono</span>
          <input name="phone" className="input" placeholder="55..." />
        </label>
        <label className="flex items-center gap-2">
          <input name="isActive" type="checkbox" />
          <span className="text-sm">Activa</span>
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn">Agregar</button>
        </div>
      </form>

      {/* Buscar */}
      <div className="flex items-center gap-3">
        <input className="input" placeholder="Buscar sucursal..." value={query} onChange={e=>setQuery(e.target.value)} />
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Dirección</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Activa</th>
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
                      <input className="input" value={editRow.address||''} onChange={e=>setEditRow({...editRow, address:e.target.value})} />
                    ) : row.address}
                  </td>
                  <td className="p-2">
                    {isEditing ? (
                      <input className="input" value={editRow.phone||''} onChange={e=>setEditRow({...editRow, phone:e.target.value})} />
                    ) : (row.phone || "—")}
                  </td>
                  <td className="p-2">
                    {isEditing ? (
                      <input type="checkbox" checked={!!editRow.isActive} onChange={e=>setEditRow({...editRow, isActive:e.target.checked})} />
                    ) : (row.isActive ? "Sí" : "No")}
                  </td>
                  <td className="p-2 space-x-2">
                    {!isEditing ? (
                      <>
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

      {/* ----- ASIGNAR COLABORADORES A SUCURSAL ----- */}
      {/* ----- HORARIO LABORAL DE LA SUCURSAL ----- */}
      {selectedLocId ? (
        <ScheduleEditor locationId={selectedLocId} />
      ) : (
        <div className="border rounded-lg p-3 text-sm opacity-70">Selecciona una sucursal para editar su horario.</div>
      )}

      <div className="border rounded-lg p-3 space-y-3">
        <h3 className="font-semibold">Asignar colaboradores por sucursal</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm">Sucursal</span>
          <select className="input" value={selectedLocId ?? ''} onChange={e=>setSelectedLocId(e.target.value?Number(e.target.value):null)}>
            <option value="">Selecciona una sucursal…</option>
            {(locations??[]).map(l=>(<option key={l.id} value={l.id}>{l.name}</option>))}
          </select>
        </div>
        {selectedLocId ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-auto p-2 border rounded-lg bg-white/60">
              {(staffs??[]).map(s=>{
                const checked = selectedIds.includes(s.id)
                return (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={checked} onChange={e=>toggleStaff(s.id, e.target.checked)} />
                    <span>{s.name}</span>
                  </label>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-xs" onClick={useAll}>Usar todos</button>
              <button className="btn btn-xs" onClick={deselectAll}>Deseleccionar todos</button>
            </div>
            <p className="text-xs opacity-70">
              Esta asignación se usa por el calendario de sucursales. Si no configuras una sucursal, por defecto se mostrarán todos los colaboradores.
            </p>
          </div>
        ) : (
          <div className="text-sm opacity-70">Selecciona una sucursal para asignar colaboradores.</div>
        )}
      </div>
    </div>
  )
}


// ====== Schedule Editor (por sucursal) ======
type DayKey = 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'
type Day = { open:boolean, start:string, end:string }
type Schedule = Record<DayKey, Day>

function dayLabel(k: DayKey){
  return ({mon:'Lunes',tue:'Martes',wed:'Miércoles',thu:'Jueves',fri:'Viernes',sat:'Sábado',sun:'Domingo'} as Record<DayKey,string>)[k]
}

function ScheduleEditor({ locationId }:{ locationId:number }){
  const { data: schedule, mutate } = useSWR<Schedule>(locationId ? `/api/locations/${locationId}/schedule` : null, fetcher)
  const keys: DayKey[] = ['mon','tue','wed','thu','fri','sat','sun']

  async function save(){
    try{
      const form = document.getElementById('schedule-form') as HTMLFormElement | null
      if (!form) return
      const fd = new FormData(form)
      const obj: any = {}
      for(const k of keys){
        const open = fd.get(`${k}_open`) === 'on' || fd.get(`${k}_open`) === 'true' || fd.get(`${k}_open`) === '1'
        const start = String(fd.get(`${k}_start`) || '09:00')
        const end   = String(fd.get(`${k}_end`) || '18:00')
        obj[k] = { open, start, end }
      }
      await axios.patch(`/api/locations/${locationId}/schedule`, obj)
      await mutate()
      alert('Horario guardado')
    }catch(err:any){
      alert(err?.response?.data?.error || 'No se pudo guardar el horario')
    }
  }

  if (!schedule) return <div className="text-sm opacity-70">Cargando horario…</div>

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <h3 className="text-lg font-semibold">Horario laboral</h3>
      <form id="schedule-form" className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {keys.map(k=>{
          const v = schedule[k] || { open:false, start:'09:00', end:'18:00' }
          return (
            <div key={k} className="border rounded-md p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{dayLabel(k)}</span>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`${k}_open`} defaultChecked={v.open} />
                  <span>Abierto</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">Desde
                  <input type="time" name={`${k}_start`} defaultValue={v.start} className="input" />
                </label>
                <label className="text-sm">Hasta
                  <input type="time" name={`${k}_end`} defaultValue={v.end} className="input" />
                </label>
              </div>
            </div>
          )
        })}
      </form>
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={save}>Guardar horario</button>
      </div>
      <p className="text-xs opacity-70">Este horario se usará para validar la agenda al crear citas.</p>
    </div>
  )
}
