'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'

const fetcher = (u: string) => fetch(u).then(r => r.json())

function colorFromId(id:number|string, s:number=65, l:number=88){ const n = Array.from(String(id)).reduce((a,c)=>a + c.charCodeAt(0), 0) % 360; return `hsl(${n} ${s}% ${l}%)`; }
const CardBg = (id:number|string)=>({ background: colorFromId(id) })

type Service = { id:number; name:string; durationMin:number }
type Staff   = { id:number; name:string }
type Customer= { id:number; name:string; phone:string|null }
type Location= { id:number; name:string }
type Booking = {
  id:number; date:string; durationMin:number;
  serviceId:number; staffId:number; customerId:number; locationId:number;
  service?:Service; staff?:Staff; customer?:Customer; location?:Location
}

// Helpers localStorage
function readStaffByLocation(): Record<string, number[]> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('staffByLocation') || '{}') } catch { return {} }
}
function writeStaffByLocation(map: Record<string, number[]>) {
  if (typeof window === 'undefined') return
  localStorage.setItem('staffByLocation', JSON.stringify(map))
}

const loading=false;
export default function CalendarsByLocation(){
  const { data: services }  = useSWR<Service[]>('/api/services', fetcher)
  const { data: staffs }    = useSWR<Staff[]>('/api/staffs', fetcher)
  const { data: customers } = useSWR<Customer[]>('/api/customers', fetcher)
  const { data: locations } = useSWR<Location[]>('/api/locations', fetcher)
  const { data: bookings }  = useSWR<Booking[]>('/api/bookings', fetcher)

  // Sucursal seleccionada
  const [locationId, setLocationId] = useState<number | null>(null)
  useEffect(()=>{
    if (locations && locations.length && locationId==null) {
      setLocationId(locations[0].id)
    }
  }, [locations])

  // Selección de colaboradores por sucursal (stateful + persistencia)
  const allStaffIds = useMemo(()=> (staffs??[]).map(s=>s.id), [staffs])
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([])

  useEffect(()=>{
    if(!locationId){ setSelectedStaffIds([]); return }
    const map = readStaffByLocation()
    const entry = map[String(locationId)]
    if (entry === undefined) setSelectedStaffIds(allStaffIds) // por defecto: todos
    else setSelectedStaffIds(entry)
  }, [locationId, allStaffIds])

  useEffect(()=>{
    if(!locationId) return
    const key = String(locationId)
    const map = readStaffByLocation()
    const equalsAll = selectedStaffIds.length===allStaffIds.length && selectedStaffIds.every(id=>allStaffIds.includes(id))
    if (equalsAll) delete map[key]; else map[key]=selectedStaffIds
    writeStaffByLocation(map)
  }, [selectedStaffIds, locationId, allStaffIds])

  function toggleStaff(id:number, checked:boolean){
    setSelectedStaffIds(prev=>{
      const set = new Set(prev)
      if (checked) set.add(id); else set.delete(id)
      return Array.from(set)
    })
  }
  function selectAll(){ setSelectedStaffIds(allStaffIds) }
  function selectNone(){ setSelectedStaffIds([]) }

  // Filtro de citas por sucursal + staff seleccionados (y por semana actual)
  const [weekStart, setWeekStart] = useState<Date>(()=>{
    const d = new Date(); d.setHours(0,0,0,0);
    const day = d.getDay(); // 0 Dom .. 6 Sáb
    const diff = (day===0? -6 : 1 - day); // Lunes como inicio
    const start = new Date(d); start.setDate(d.getDate()+diff);
    return start
  })
  function addDays(base:Date, n:number){ const d=new Date(base); d.setDate(d.getDate()+n); return d }
  const daysWeek = useMemo(()=>[0,1,2,3,4,5,6].map(i=>addDays(weekStart,i)), [weekStart])

  const filtered = useMemo(()=>{
    const loc = locationId
    const staffSet = new Set(selectedStaffIds)
    return (bookings??[]).filter(b=>{
      if (loc!=null && b.locationId!==loc) return false
      if (!staffSet.has(b.staffId)) return false
      const dt = new Date(b.date)
      const end = addDays(weekStart, 7)
      return dt >= weekStart && dt < end
    })
  }, [bookings, locationId, selectedStaffIds, weekStart])

  // Render helpers
  function fmtDate(d:Date){
    return d.toLocaleDateString(undefined, { weekday:'short', day:'2-digit', month:'short' })
  }
  function fmtTime(iso:string){
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Sucursal */}
        <label className="flex items-center gap-2">
          <span className="text-sm">Sucursal</span>
          <select className="input" value={locationId ?? ''} onChange={e=>setLocationId(e.target.value?Number(e.target.value):null)}>
            <option value="">—</option>
            {(locations??[]).map(l=>(<option key={l.id} value={l.id}>{l.name}</option>))}
          </select>
        </label>

        {/* Semana */}
        <div className="flex items-center gap-2">
          <button className="btn btn-xs" onClick={()=>setWeekStart(addDays(weekStart, -7))}>◀</button>
          <div className="text-sm">{fmtDate(weekStart)} – {fmtDate(addDays(weekStart,6))}</div>
          <button className="btn btn-xs" onClick={()=>setWeekStart(addDays(weekStart, 7))}>▶</button>
          <button className="btn btn-xs" onClick={()=>setWeekStart(new Date(new Date().setHours(0,0,0,0)))}>Hoy</button>
        </div>
      </div>

      {/* Selector de colaboradores (desde la agenda) */}
      <div className="border rounded-lg p-3 bg-white/70">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">Colaboradores visibles</span>
          <button className="btn btn-xs" onClick={selectAll}>Todos</button>
          <button className="btn btn-xs" onClick={selectNone}>Ninguno</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-auto">
          {(staffs??[]).map(s=>{
            const checked = selectedStaffIds.includes(s.id)
            return (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={checked} onChange={e=>toggleStaff(s.id, e.target.checked)} />
                <span>{s.name}</span>
              </label>
            )
          })}
        </div>
        <p className="text-xs opacity-70 mt-2">La selección se guarda por sucursal y se usa en esta vista.</p>
      </div>

      {/* Agenda simple por día, filtrada por colaboradores seleccionados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {daysWeek.map(day=>{
          const items = filtered.filter(b=>{
            const d = new Date(b.date)
            return d.getFullYear()===day.getFullYear() && d.getMonth()===day.getMonth() && d.getDate()===day.getDate()
          }).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime())
          return (
            <div key={String(day)} className="border rounded-lg">
              <div className="px-3 py-2 font-medium bg-gray-50">{fmtDate(day)}</div>
              <div className="p-3 space-y-2">
                {items.length===0 ? <div className="text-sm opacity-70">Sin citas</div> : items.map(b=>{
                  const s = (services??[]).find(x=>x.id===b.serviceId)
                  const st = (staffs??[]).find(x=>x.id===b.staffId)
                  const c = (customers??[]).find(x=>x.id===b.customerId)
                  return (
                    <div key={b.id} className="p-2 rounded border" style={CardBg(b.staffId ?? b.serviceId ?? b.id)}>
                      <div className="text-sm">{fmtTime(b.date)} · {s?.name ?? 'Servicio'} ({b.durationMin} min)</div>
                      <div className="text-xs opacity-80">{st?.name ?? 'Colaborador'} · {c?.name ?? 'Cliente'}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
