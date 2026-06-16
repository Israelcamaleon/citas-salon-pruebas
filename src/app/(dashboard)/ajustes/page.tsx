'use client'
import useSWR from 'swr'
import axios from 'axios'
import { useState, useMemo } from 'react'
import Locations from '@/features/locations/components/Locations'

type Tab = 'cuenta'
type SubTabCuenta = 'general' | 'sucursales' | 'roles'

type Role = {
  id: number
  name: string
  description?: string
  permissions: Record<string, boolean>
}

type Settings = {
  businessName: string
  address: string
  logoUrl?: string | null
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

const PERMISSIONS: { key: string, label: string }[] = [
  { key: 'manageBookings',  label: 'Citas' },
  { key: 'manageCustomers', label: 'Clientes' },
  { key: 'manageStaff',     label: 'Colaboradores' },
  { key: 'manageServices',  label: 'Servicios' },
  { key: 'manageLocations', label: 'Sucursales' },
  { key: 'manageReports',   label: 'Reportes' },
  { key: 'manageSettings',  label: 'Ajustes' },
  { key: 'manageRoles',     label: 'Roles y permisos' },
]

export default function AjustesPage(){
  const [tab, setTab] = useState<Tab>('cuenta')
  const [sub, setSub] = useState<SubTabCuenta>('general')

  // Data
  const { data: locations } = useSWR<any[]>('/api/locations', fetcher)
  const { data: roles, mutate: mutateRoles } = useSWR<Role[]>('/api/roles', fetcher)
  const { data: settings, mutate: mutateSettings } = useSWR<Settings>('/api/settings', fetcher)

  // UI helpers
  const tabClass = (active:boolean) => active ? 'px-3 py-2 rounded-lg bg-black text-white' : 'px-3 py-2 rounded-lg hover:bg-neutral-100'
  const subClass = (active:boolean) => active ? 'px-3 py-2 rounded-md bg-neutral-900 text-white' : 'px-3 py-2 rounded-md hover:bg-neutral-100'
  const panel = 'border rounded-lg p-4'

  // ----- Roles (existe en pestaña Roles) -----
  function PermGrid({value, onChange}:{value: Record<string, boolean>, onChange:(v:Record<string,boolean>)=>void}){
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {PERMISSIONS.map(p => (
          <label key={p.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value[p.key]}
              onChange={(e)=> onChange({ ...value, [p.key]: e.currentTarget.checked })}
            />
            <span>{p.label}</span>
          </label>
        ))}
      </div>
    )
  }

  // ----- General (estado local editable) -----
  const [bizName, setBizName] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Sincroniza estados cuando llega settings
  useMemo(()=>{
    if (settings){
      setBizName(settings.businessName || '')
      setAddress(settings.address || '')
      setLogoUrl(settings.logoUrl || null)
    }
    return null
  }, [settings])

  async function onUploadLogo(file: File){
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Falló la carga de imagen')
    const data = await res.json()
    setLogoUrl(data.url)
  }

  async function saveGeneral(){
    try{
      setSaving(true)
      const payload: Settings = {
        businessName: bizName.trim(),
        address: address.trim(),
        logoUrl: logoUrl || null
      }
      if (!payload.businessName){ alert('El nombre de la empresa es obligatorio'); return }
      await axios.patch('/api/settings', payload)
      await mutateSettings()
      alert('Ajustes guardados')
    }catch(err:any){
      alert(err?.response?.data?.error || 'No se pudieron guardar los ajustes')
    }finally{
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <div className="flex gap-2 border-b pb-3">
        <button className={tabClass(tab==='cuenta')} onClick={()=>setTab('cuenta')}>Cuenta</button>
      </div>

      {tab==='cuenta' && (
        <section className="space-y-4">
          <div className="flex gap-2">
            <button className={subClass(sub==='general')} onClick={()=>setSub('general')}>General</button>
            <button className={subClass(sub==='sucursales')} onClick={()=>setSub('sucursales')}>Sucursales</button>
            <button className={subClass(sub==='roles')} onClick={()=>setSub('roles')}>Roles</button>
          </div>

          {sub==='general' && (
            <div className={panel}>
              <h2 className="text-lg font-semibold mb-3">General</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="label">Nombre de la empresa *</div>
                  <input className="input" placeholder="Ej. Estética Luna" value={bizName} onChange={e=>setBizName(e.currentTarget.value)} />
                </div>
                <div className="flex flex-col items-start gap-2">
                  <div className="label">Logotipo</div>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-28 h-28 object-contain border rounded-md bg-white" />
                  ) : (
                    <div className="w-28 h-28 flex items-center justify-center text-xs text-neutral-500 border rounded-md">Sin logo</div>
                  )}
                  <label className="btn">
                    Subir logotipo
                    <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{
                      const f = e.currentTarget.files?.[0]
                      if (f) {
                        try{ await onUploadLogo(f) }catch(e:any){ alert(e?.message || 'Error subiendo logo') }
                      }
                    }}/>
                  </label>
                </div>

                <div className="md:col-span-3">
                  <div className="label">Dirección</div>
                  <textarea className="input min-h-[90px]" placeholder="Calle, número, colonia, ciudad, CP" value={address} onChange={e=>setAddress(e.currentTarget.value)} />
                </div>

                <div className="md:col-span-3 flex justify-end">
                  <button className="btn btn-primary" onClick={saveGeneral} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
                </div>
              </div>
            </div>
          )}

          {sub==='sucursales' && (
            <div className="space-y-4">
              <Locations/>
            </div>
          )}

          {sub==='roles' && (
            <div className="space-y-6">
              <div className="text-sm text-neutral-600">Administra roles y permisos desde esta pestaña (ya incluida en parches previos).</div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
