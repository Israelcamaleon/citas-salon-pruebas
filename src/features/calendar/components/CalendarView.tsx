'use client'
import { useState, useEffect } from 'react'
import CalendarsByLocation from './CalendarsByLocation'
import CalendarsByLocationStacked from './CalendarsByLocationStacked'
import StaffCalendar from './StaffCalendar'

type Mode = 'general' | 'byLocation' | 'split'

export default function Calendar() {
  const [mode, setMode] = useState<Mode>('general')

  useEffect(() => {
    const m = localStorage.getItem('cal_mode')
    if (m === 'general' || m === 'byLocation' || m === 'split') setMode(m)
  }, [])

  useEffect(() => {
    localStorage.setItem('cal_mode', mode)
  }, [mode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      if (e.key === 'g') setMode('general')
      if (e.key === 'l') setMode('byLocation')
      if (e.key === 'a') setMode('split')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white/80 backdrop-blur z-10 p-2 rounded">
        <button type="button" onClick={() => setMode('general')} className={`px-3 py-1 rounded border ${mode==='general' ? 'bg-black text-white' : 'bg-white'}`}>Colaboradores</button>
        <button type="button" onClick={() => setMode('byLocation')} className={`px-3 py-1 rounded border ${mode==='byLocation' ? 'bg-black text-white' : 'bg-white'}`}>Sucursales</button>
        <button type="button" onClick={() => setMode('split')} className={`px-3 py-1 rounded border ${mode==='split' ? 'bg-black text-white' : 'bg-white'}`}>Ambos</button>
        <div className="text-xs opacity-70 flex gap-3 ml-4">
          <span><kbd className="px-1 border rounded">g</kbd> Colaboradores</span>
          <span><kbd className="px-1 border rounded">l</kbd> Sucursales</span>
          <span><kbd className="px-1 border rounded">a</kbd> Ambos</span>
        </div>
      </div>

      {mode === 'byLocation' ? (
        <CalendarsByLocationStacked />
      ) : mode === 'split' ? (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Colaboradores</h3>
            <StaffCalendar />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Sucursales</h3>
            <CalendarsByLocation />
          </div>
        </div>
      ) : (
        <StaffCalendar />
      )}
    </div>
  )
}