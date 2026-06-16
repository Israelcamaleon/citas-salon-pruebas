'use client'
import { useState } from 'react'
import useSWR from 'swr'
import dayjs from 'dayjs'
import QuickEditBooking from '@/features/bookings/components/QuickEditBooking'

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

function fmtTime(iso:string){ return dayjs(iso).format('HH:mm') }
function fmtDay(iso:string){ return dayjs(iso).format('ddd DD MMM') }

export default function CalendarsByLocationStacked(){
  const { data: bookingsRaw, mutate } = useSWR<Booking[]>('/api/bookings', fetcher, { revalidateOnFocus:false })
  const { data: staffs } = useSWR<Staff[]>('/api/staffs', fetcher, { revalidateOnFocus:false })
  const { data: locations } = useSWR<Location[]>('/api/locations', fetcher, { revalidateOnFocus:false })

  const bookings = Array.isArray(bookingsRaw) ? bookingsRaw : []
  const staffsMap = new Map((staffs??[]).map(s=>[s.id, s]))
  const locs = Array.isArray(locations) ? locations : []
  const [selectedBooking, setSelectedBooking] = useState<Booking|null>(null)

  // Group bookings by location, then by day
  const byLoc: Record<number, Booking[]> = {}
  for(const b of bookings){
    if(!byLoc[b.locationId]) byLoc[b.locationId]=[]
    byLoc[b.locationId].push(b)
  }
  // Sort each group by date ascending
  for(const k in byLoc){
    byLoc[k].sort((a,b)=> dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
  }

  return (
    <div className="space-y-6">
      {locs.map(loc => {
        const list = byLoc[loc.id] || []
        return (
          <div key={loc.id} className="rounded-2xl border shadow-sm bg-white/90">
            <div className="flex items-center justify-between p-3 border-b bg-white/70 rounded-t-2xl sticky top-0 z-10">
              <h3 className="font-semibold">Sucursal: {loc.name}</h3>
              <div className="text-xs opacity-70">{list.length} citas</div>
            </div>
            {list.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Sin citas programadas para esta sucursal.</div>
            ) : (
              <div className="p-3 grid gap-2">
                {list.map(b => {
                  const st = staffsMap.get(b.staffId)
                  return (
                    <div key={b.id} className="p-2 rounded border flex items-center justify-between" onClick={()=>setSelectedBooking(b)}>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium w-28">{fmtDay(b.date)} {fmtTime(b.date)}</div>
                        <div className="text-sm">
                          <div>{b.service?.name ?? 'Servicio'} <span className="opacity-60">({b.durationMin} min)</span></div>
                          <div className="text-xs opacity-70">{st?.name ?? 'Colaborador'} · {b.customer?.name ?? 'Cliente'}</div>
                        </div>
                      </div>
                      <div className="text-xs opacity-60">#{b.id}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}