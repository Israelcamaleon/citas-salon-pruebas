'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import BookingActions from './BookingActions'
import CustomerProfile from '@/features/customers/components/CustomerProfile'
import { statusLabel, statusChipClass } from '@/lib/bookingStatus'
import { toast } from '@/lib/toast'

const fetcher = (u: string) => fetch(u).then(r => r.json())

type Service = { id:number; name:string; durationMin:number }
type Staff   = { id:number; name:string }
type Customer= { id:number; name:string; phone:string|null }
type Location= { id:number; name:string }
type Booking = {
  id:number; date:string; durationMin:number;
  serviceId:number; staffId:number; customerId:number; locationId:number;
  service?:Service; staff?:Staff; customer?:Customer; location?:Location
}

export default function QuickEditBooking({
  booking,
  onClose,
  onSaved
}:{
  booking: Booking|null
  onClose: ()=>void
  onSaved?: ()=>void
}){
  const { data: staffs } = useSWR<Staff[]>('/api/staffs', fetcher, { revalidateOnFocus:false })
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [staffId, setStaffId] = useState<number|''>('')
  const [saving, setSaving] = useState(false)
  const [verPerfil, setVerPerfil] = useState(false)

  useEffect(()=>{
    if(!booking) return
    const d = new Date(booking.date)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const dd = String(d.getDate()).padStart(2,'0')
    const hh = String(d.getHours()).padStart(2,'0')
    const mi = String(d.getMinutes()).padStart(2,'0')
    setDate(`${yyyy}-${mm}-${dd}`)
    setTime(`${hh}:${mi}`)
    setStaffId(booking.staffId)
  }, [booking])

  async function save(){
    if(!booking) return
    try{
      setSaving(true)
      const iso = new Date(`${date}T${time}:00`).toISOString()
      const payload:any = { date: iso, staffId: staffId || booking.staffId }
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method:'PUT',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      })
      if(!res.ok) throw new Error(await res.text())
      toast('Cita actualizada')
      onSaved && onSaved()
      onClose()
    }catch(e:any){
      toast(e?.message || 'No se pudo guardar', 'error')
    }finally{
      setSaving(false)
    }
  }

  if(!booking) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setVerPerfil(true)}
            className="text-lg font-semibold truncate text-left hover:text-lh-accent"
            title="Ver perfil del cliente"
          >
            {booking.customer?.name ?? 'Cita'} <span className="text-xs text-lh-accent">👤</span>
          </button>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusChipClass((booking as any).status)}`}>
            {statusLabel((booking as any).status)}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {booking.service?.name ?? 'Servicio'} · {booking.durationMin} min
          {booking.location?.name ? ` · ${booking.location.name}` : ''}
        </p>

        <BookingActions
          bookingId={booking.id}
          status={(booking as any).status}
          customerId={booking.customerId}
          customerName={booking.customer?.name}
          customerPhone={booking.customer?.phone}
          onChanged={() => { onSaved && onSaved(); onClose() }}
        />

        <div className="border-t pt-3 text-sm font-medium text-gray-700">Reprogramar</div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Día
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full mt-1 border rounded px-2 py-1" />
          </label>
          <label className="text-sm">Hora
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-full mt-1 border rounded px-2 py-1" />
          </label>
          <label className="col-span-2 text-sm">Colaborador
            <select value={String(staffId)} onChange={e=>setStaffId(Number(e.target.value))} className="w-full mt-1 border rounded px-2 py-1">
              {(staffs??[]).map(s=>(<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="px-3 py-1 border rounded" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-1 border rounded bg-black text-white disabled:opacity-50" disabled={saving} onClick={save}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
      {verPerfil && (
        <CustomerProfile customerId={booking.customerId} onClose={() => setVerPerfil(false)} />
      )}
    </div>
  )
}