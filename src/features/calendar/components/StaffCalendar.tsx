'use client'
import useSWR from "swr"
import dayjs from "dayjs"
import { useMemo, useState, useEffect } from "react"
import axios from "axios"
import QuickEditBooking from "@/features/bookings/components/QuickEditBooking"
import { asArray, fetcher } from "@/lib/api"

function colorFromId(id:number|string, s:number=65, l:number=88){ 
  const n = Array.from(String(id)).reduce((a,c)=>a + c.charCodeAt(0), 0) % 360; 
  return `hsl(${n} ${s}% ${l}%)`; 
}
const CardBg = (id:number|string)=>({ background: colorFromId(id) })

type ViewMode = 'week' | 'day'

export default function Calendar() {
  const { data: bookingsRaw, mutate } = useSWR('/api/bookings', fetcher, { revalidateOnFocus: false })
  const { data: staffsData } = useSWR('/api/staffs', fetcher, { revalidateOnFocus: false })
  const { data: locationsData } = useSWR('/api/locations', fetcher, { revalidateOnFocus: false })
  const staffs = asArray<any>(staffsData)
  const locations = asArray<any>(locationsData)
  const loading = !bookingsRaw || !staffsData || !locationsData

  const [view, setView] = useState<ViewMode>('week')
  const [weekStart, setWeekStart] = useState(() => dayjs().startOf('week'))
  const [selectedDate, setSelectedDate] = useState(() => dayjs())
  const [selectedBooking, setSelectedBooking] = useState<any|null>(null)
  const [moving, setMoving] = useState<any|null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('cal_view') as ViewMode | null
    if (saved === 'week' || saved === 'day') setView(saved)
  }, [])

  useEffect(() => { localStorage.setItem('cal_view', view) }, [view])
  const [locationId, setLocationId] = useState<number | null>(null)

  // Normalize bookings and filter by selected location (Sucursal)
  const bookings = useMemo(() => {
    if (!Array.isArray(bookingsRaw)) return []
    return bookingsRaw.filter((b:any) => !locationId || b.locationId === locationId)
  }, [bookingsRaw, locationId])

  const daysWeek = useMemo(() => [...Array(7)].map((_, i) => weekStart.add(i, 'day')), [weekStart])
  const hours = useMemo(() => [...Array(13)].map((_, i) => 8 + i), [])

  // ---- Staff per Location mapping (localStorage) ----
  function readStaffByLocation(): Record<string, number[]> {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem('staffByLocation')
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }
  function writeStaffByLocation(map: Record<string, number[]>) {
    if (typeof window === 'undefined') return
    localStorage.setItem('staffByLocation', JSON.stringify(map))
  }
  const staffByLocation = readStaffByLocation()
  const selectedStaffIdsForLoc: number[] = useMemo(()=>{
    if (!locationId) return staffs.map((s:any)=>s.id)
    const ids = (staffByLocation[String(locationId)] ?? [])
    return ids.length ? ids : staffs.map((s:any)=>s.id)
  }, [locationId, staffs, staffByLocation])
  const filteredStaffs = useMemo(
    ()=> staffs.filter((s:any)=> selectedStaffIdsForLoc.includes(s.id)),
    [staffs, selectedStaffIdsForLoc]
  )

  const staffColors = useMemo(() => ((filteredStaffs ?? []) as any[]).map((_: any, i: number) => `hsl(${(i * 57) % 360} 85% 93%)`), [filteredStaffs])

  function nextWeek() { setWeekStart(s => s.add(1, 'week')) }
  function prevWeek() { setWeekStart(s => s.subtract(1, 'week')) }
  function goToday() { const now = dayjs(); setSelectedDate(now); setWeekStart(now.startOf('week')); setView('day') }

  async function deleteBooking(id: number) { await axios.delete(`/api/bookings/${id}`); mutate() }

  // Mover cita a otro día/hora (y opcionalmente otro staff en vista de día)
  async function moveBooking(b: any, dayKey: string, hour: number, staffId?: number) {
    if (saving) return
    setSaving(true)
    try {
      const nuevaFecha = dayjs(dayKey).hour(hour).minute(dayjs(b.date).minute()).second(0)
      const body: Record<string, unknown> = { date: nuevaFecha.toISOString() }
      if (staffId && staffId !== b.staffId) body.staffId = staffId
      await axios.patch(`/api/bookings/${b.id}`, body)
      await mutate()
    } catch {
      alert("No se pudo mover la cita")
    } finally {
      setSaving(false)
      setMoving(null)
    }
  }

  function cellProps(dayKey: string, hour: number, staffId?: number) {
    return {
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        const id = Number(e.dataTransfer.getData("text/booking-id"))
        const b = (bookings ?? []).find((x: any) => x.id === id)
        if (b) moveBooking(b, dayKey, hour, staffId)
      },
      onClick: () => {
        if (moving) moveBooking(moving, dayKey, hour, staffId)
      },
    }
  }

  // Small helpers
  const startHour = (iso: string) => dayjs(iso).hour()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <button className={`btn ${view==='week'?'btn-primary':''}`} onClick={()=>setView('week')}>Semana</button>
          <button className={`btn ${view==='day'?'btn-primary':''}`} onClick={()=>setView('day')}>Hoy</button>
          <button className="btn" onClick={goToday}>Ir a hoy</button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Sucursal</label>
          <select
            className="input"
            value={locationId ?? ''}
            onChange={e=>setLocationId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todas</option>
            {(locations??[]).map((l:any)=>(<option key={l.id} value={l.id}>{l.name}</option>))}
          </select>
        </div>

        {/* STAFF PICKER for selected location */}
        {locationId && (
          <details className="ml-2">
            <summary className="btn btn-sm">Seleccionar colaboradores de esta sucursal</summary>
            <div className="mt-2 p-2 border rounded-lg bg-white/50 max-h-56 overflow-auto grid grid-cols-2 gap-2">
              {(staffs??[]).map((s:any)=>{
                const checked = selectedStaffIdsForLoc.includes(s.id)
                return (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e)=>{
                        const map = readStaffByLocation()
                        const key = String(locationId)
                        const current = new Set(map[key] ?? [])
                        if (e.target.checked) current.add(s.id); else current.delete(s.id)
                        map[key] = Array.from(current)
                        writeStaffByLocation(map)
                      }}
                    />
                    <span>{s.name}</span>
                  </label>
                )
              })}
              <div className="col-span-full">
                <button
                  className="btn btn-xs"
                  onClick={()=>{
                    const map = readStaffByLocation()
                    const key = String(locationId)
                    // reset to all
                    map[key] = []
                    writeStaffByLocation(map)
                  }}
                >
                  Usar todos
                </button>
              </div>
            </div>
          </details>
        )}

        {view==='week' ? (
          <div className="flex items-center gap-2 ml-auto">
            <button className="btn" onClick={prevWeek}>⟵</button>
            <div className="font-semibold">{weekStart.format('DD MMM')} – {weekStart.add(6, 'day').format('DD MMM')}</div>
            <button className="btn" onClick={nextWeek}>⟶</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              className="input"
              value={selectedDate.format('YYYY-MM-DD')}
              onChange={(e)=>setSelectedDate(dayjs(e.target.value))}
            />
            <div className="font-semibold">{selectedDate.format('dddd DD MMM')}</div>
          </div>
        )}
      </div>

      {/* LOCATION TABS */}
      <div className="flex gap-2 overflow-x-auto py-1">
        <button
          className={`btn btn-sm ${locationId===null?'btn-primary':''}`}
          onClick={()=>setLocationId(null)}
        >
          Todas
        </button>
        {(locations??[]).map((l:any)=>(
          <button
            key={l.id}
            className={`btn btn-sm ${locationId===l.id?'btn-primary':''}`}
            onClick={()=>setLocationId(l.id)}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* Aviso modo mover */}
      {moving && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm flex items-center justify-between gap-2 flex-wrap">
          <span>
            📌 Toca el día y hora a donde quieres mover la cita de <strong>{moving.customer?.name ?? "este cliente"}</strong>
            {view === 'day' && " — si la sueltas en otra columna, cambia de colaborador"}
          </span>
          <button className="btn btn-sm" onClick={() => setMoving(null)}>Cancelar</button>
        </div>
      )}

      <div className="overflow-x-auto">
        {view==='week' ? (
          <table className="min-w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className="w-20"></th>
                {daysWeek.map((d, idx) => (
                  <th key={idx} className="p-2 text-left border-b">{d.format('ddd DD')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map(h => (
                <tr key={h} className="align-top">
                  <td className="p-2 text-right pr-3 text-sm text-gray-500 border-r">{String(h).padStart(2, '0')}:00</td>
                  {daysWeek.map((d) => {
                    const dayKey = d.format('YYYY-MM-DD')
                    // Only bookings that START in this hour
                    const cellBookings = (bookings ?? []).filter((b: any) =>
                      dayjs(b.date).format('YYYY-MM-DD') === dayKey && startHour(b.date) === h
                    )
                    return (
                      <td key={dayKey} className={`p-2 border-b ${moving ? "cursor-pointer bg-blue-50/40 hover:bg-blue-100" : ""}`} {...cellProps(dayKey, h)}>
                        <div className="space-y-2">
                          {cellBookings.filter((b:any)=> selectedStaffIdsForLoc.includes(b.staffId)).map((b: any) => {
                            let bg = undefined
                            if (Array.isArray(filteredStaffs)) {
                              const idx = filteredStaffs.findIndex((s: any) => s.id === b.staffId)
                              if (idx >= 0 && staffColors[idx]) bg = staffColors[idx]
                            }
                            return (
                              <div
                                key={b.id}
                                className={`p-2 rounded-lg border cursor-grab ${moving?.id === b.id ? "ring-2 ring-blue-400" : ""}`}
                                draggable
                                onDragStart={(e)=>{ e.stopPropagation(); e.dataTransfer.setData("text/booking-id", String(b.id)) }}
                                onClick={(e)=>{ e.stopPropagation(); setSelectedBooking(b) }}
                                style={bg ? { background: bg } : CardBg(b.staffId ?? b.serviceId ?? b.id)}
                              >
                                <div className="font-medium text-sm">{b.service?.name ?? `Servicio #${b.serviceId}`}</div>
                                <div className="text-xs">{new Date(b.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · {b.durationMin} min</div>
                                <div className="text-xs">Staff: {b.staff?.name ?? `#${b.staffId}`}</div>
                                <div className="text-xs">Cliente: {b.customer?.name ?? b.customerId}</div>
                                <div className="flex gap-1 mt-2">
                                  <button className="btn" onClick={(e) => { e.stopPropagation(); setMoving(b) }}>↔ Mover</button>
                                  <button className="btn" onClick={(e) => { e.stopPropagation(); deleteBooking(b.id) }}>Eliminar</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // DAY VIEW: columns by staff; only render bookings in their start hour and selected location
          <table className="min-w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className="w-20"></th>
                {((filteredStaffs ?? []) as any[]).map((s: any, i: number) => (
                  <th key={s.id} className="p-2 text-left border-b">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{background: staffColors[i]}}/>
                      <span>{s.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map(h => (
                <tr key={h} className="align-top">
                  <td className="p-2 text-right pr-3 text-sm text-gray-500 border-r">{String(h).padStart(2, '0')}:00</td>
                  {((filteredStaffs ?? []) as any[]).map((s: any, i: number) => {
                    const dayKey = selectedDate.format('YYYY-MM-DD')
                    const cellBookings = (bookings ?? []).filter((b: any) =>
                      dayjs(b.date).format('YYYY-MM-DD') === dayKey &&
                      startHour(b.date) === h &&
                      b.staffId === s.id
                    )
                    return (
                      <td key={`${s.id}-${h}`} className={`p-2 border-b ${moving ? "cursor-pointer bg-blue-50/40 hover:bg-blue-100" : ""}`} {...cellProps(dayKey, h, s.id)}>
                        <div className="space-y-2">
                          {cellBookings.map((b: any) => (
                            <div
                              key={b.id}
                              className={`p-2 rounded-lg border cursor-grab ${moving?.id === b.id ? "ring-2 ring-blue-400" : ""}`}
                              draggable
                              onDragStart={(e)=>{ e.stopPropagation(); e.dataTransfer.setData("text/booking-id", String(b.id)) }}
                              onClick={(e)=>{ e.stopPropagation(); setSelectedBooking(b) }}
                              style={{ background: staffColors[i] }}
                            >
                              <div className="font-medium text-sm">{b.service?.name ?? `Servicio #${b.serviceId}`}</div>
                              <div className="text-xs">{new Date(b.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · {b.durationMin} min</div>
                              <div className="text-xs">Cliente: {b.customer?.name ?? b.customerId}</div>
                              <div className="flex gap-1 mt-2">
                                <button className="btn" onClick={(e) => { e.stopPropagation(); setMoving(b) }}>↔ Mover</button>
                                <button className="btn" onClick={(e) => { e.stopPropagation(); deleteBooking(b.id) }}>Eliminar</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      <QuickEditBooking booking={selectedBooking} onClose={()=>setSelectedBooking(null)} onSaved={()=>mutate()} />
    </div>
    </div>
  )
}
