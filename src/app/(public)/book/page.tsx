'use client'
import useSWR from 'swr'
import axios from 'axios'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'

const fetcher = (u: string) => fetch(u).then(r => r.json())
type DayKey = 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'
type Day = { open:boolean, start:string, end:string }
type Schedule = Record<DayKey, Day>

function localDayKey(d: Date): DayKey{
  const n = d.getDay()
  return (['sun','mon','tue','wed','thu','fri','sat'] as DayKey[])[n]
}
function within(day: Day, d: Date){
  if (!day.open) return false
  const pad = (n:number)=> String(n).padStart(2,'0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return day.start <= hm && hm <= day.end
}


function defaultDateTimeLocal(){
  const d = new Date();
  d.setMinutes(0,0,0);
  d.setHours(d.getHours()+1);
  const yyyy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  const HH=String(d.getHours()).padStart(2,'0'), MM=String(d.getMinutes()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}T${HH}:${MM}`;
}


function normalizePhoneMX(input: string){
  const digits = (input || '').replace(/\D+/g, '')
  if (!digits) return ''
  let d = digits
  if (d.startsWith('521') && d.length >= 13) d = d.slice(3)
  else if (d.startsWith('52') && d.length >= 12) d = d.slice(2)
  return d
}

export default function Book(){
  const { data: services } = useSWR('/api/services', fetcher)
  const { data: staff } = useSWR('/api/staffs', fetcher)
  const { data: locations } = useSWR('/api/locations', fetcher)
  const { data: customers, mutate: mutateCustomers } = useSWR('/api/customers', fetcher)

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)
  const [dtWarning, setDtWarning] = useState<string>('')
  const { data: locSchedule } = useSWR(selectedLocationId ? `/api/locations/${selectedLocationId}/schedule` : null, fetcher)

  async function createCustomerIfNeeded(name: string, phone: string){
    const norm = normalizePhoneMX(phone)
    if (!norm || norm.length !== 10){
      throw new Error('El teléfono debe tener 10 dígitos (MX)')
    }
    // Busca por teléfono normalizado
    const existing = (customers ?? []).find((c: any) => String(c.phone || '') === norm)
    if (existing) return existing.id
    const res = await axios.post('/api/customers', { name, phone: norm })
    await mutateCustomers()
    return res.data.id
  }

  async function submit(e: any){
    const formData = new FormData(e.currentTarget)
    const dateTimeLocal = String(formData.get('dateTime') || '')
    let dateISO = ''
    if (dateTimeLocal) { try { dateISO = new Date(dateTimeLocal).toISOString() } catch{} }
    if (!dateISO) { alert('Selecciona fecha y hora válidas'); return }
    try{
      const locId = Number(String(new FormData(e.currentTarget).get('locationId')||''))
      if (locId && locId === (selectedLocationId||0) && (locSchedule as any)){
        const d = new Date(dateTimeLocal); const day = localDayKey(d); const info = (locSchedule as any)[day]
        if (!info || !within(info, d)){ alert('La sucursal no labora en ese día/horario'); return }
      }
    }catch{}


    e.preventDefault()
    const serviceId = Number(formData.get('serviceId'))
    const staffId = Number(formData.get('staffId'))
    const locationId = Number(formData.get('locationId'))
    const customerName = String(formData.get('customerName') || '').trim()
    const customerPhone = String(formData.get('customerPhone') || '').trim()

    if (!customerName){ alert('Nombre del cliente es requerido'); return }
    const norm = normalizePhoneMX(customerPhone)
    if (!norm || norm.length !== 10){ alert('El teléfono debe tener 10 dígitos (MX)'); return }

    const service = (services ?? []).find((s: any) => s.id === serviceId)
    const durationMin = service?.durationMin ?? 60

    let customerId: number
    try{
      customerId = await createCustomerIfNeeded(customerName, norm)
    }catch(err: any){
      alert(err?.message || 'No se pudo crear/obtener el cliente'); return
    }

    try{
      await axios.post('/api/bookings', {
        date: dateISO, durationMin, serviceId, staffId, locationId, customerId
      })
      alert('Cita creada')
      e.currentTarget.reset()
    }catch(err: any){
      alert(err?.response?.data?.error || 'No se pudo crear la cita')
    }
  }

  const serviceOptions = useMemo(()=> (services ?? []).map((s:any)=>(
    <option key={s.id} value={s.id}>{s.name} ({s.durationMin} min)</option>
  )), [services])

  const staffOptions = useMemo(()=> (staff ?? []).map((s:any)=>(
    <option key={s.id} value={s.id}>{s.name}</option>
  )), [staff])

  const locationOptions = useMemo(()=> (locations ?? []).map((l:any)=>(
    <option key={l.id} value={l.id}>{l.name}</option>
  )), [locations])

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Crear cita (pública)</h1>
      <form onSubmit={submit} className="space-y-4 border rounded-lg p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="label">Servicio</div>
            <select name="serviceId" className="input" required>
              <option value="">Selecciona…</option>
              {serviceOptions}
            </select>
          </div>
          <div>
            <div className="label">Colaborador</div>
            <select name="staffId" className="input" required>
              <option value="">Selecciona…</option>
              {staffOptions}
            </select>
          </div>
          <div>
            <div className="label">Sucursal</div>
            <select name="locationId" className="input" required onChange={(e)=> setSelectedLocationId(Number(e.currentTarget.value)||null)}>
              <option value="">Selecciona…</option>
              {locationOptions}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="label">Fecha y hora</div>
          <input className="input" name="dateTime" type="datetime-local" defaultValue={defaultDateTimeLocal()} required onChange={(e)=>{
              const v = e.currentTarget.value; if (!v || !locSchedule){ setDtWarning(""); return }
              const d = new Date(v);
              const day = localDayKey(d); const info = (locSchedule as any)[day];
              if (!info || !within(info, d)) setDtWarning("La sucursal no labora en ese día/horario"); else setDtWarning("");
            }} />
            {dtWarning && (<div className="text-xs text-red-600 mt-1">{dtWarning}</div>)}
        </div>

          <div>
            <div className="label">Cliente</div>
            <input className="input" name="customerName" placeholder="Nombre del cliente" required />
          </div>
          <div>
            <div className="label">Teléfono</div>
            <input className="input" name="customerPhone" placeholder="55 1234 5678" required />
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={!!dtWarning}>Crear cita</button>
      </form>
    </div>
  )
}
