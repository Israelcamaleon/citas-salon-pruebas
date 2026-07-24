'use client'
import useSWR from 'swr'
import axios from 'axios'
import { useRef, useState, useMemo } from 'react'
import { asArray, fetcher } from '@/lib/api'

type Staff = {
  id: number
  name: string
  role: string
  email: string
  phone: string | null
  isActive: boolean
  hasLogin?: boolean
}

type Role = {
  id: number
  name: string
  description?: string
  permissions: Record<string, boolean>
}

export default function Staffs(){
  const formRef = useRef<HTMLFormElement>(null)
  const { data: staffData, mutate } = useSWR<Staff[]>('/api/staffs', fetcher)
  const { data: rolesData } = useSWR<Role[]>('/api/roles', fetcher)
  const staffList = asArray<Staff>(staffData)
  const roles = asArray<Role>(rolesData)

  // Local edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRow, setEditRow] = useState<Partial<Staff> & { password?: string }>({})

  const roleOptions = useMemo(() => roles.map(r => (
    <option key={r.id} value={r.name}>{r.name}</option>
  )), [roles])

  function startEdit(row: Staff){
    setEditingId(row.id)
    setEditRow({ ...row })
  }
  function cancelEdit(){
    setEditingId(null)
    setEditRow({})
  }
  async function saveEdit(id: number){
    try {
      const payload: Record<string, unknown> = { ...editRow }
      if (!payload.password) delete payload.password
      await axios.patch(`/api/staffs/${id}`, payload)
      setEditingId(null); setEditRow({})
      await mutate()
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      alert(msg || "No se pudo actualizar")
    }
  }

  async function submitNew(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name  = String(fd.get('name') || '').trim()
    const email = String(fd.get('email') || '').trim()
    const password = String(fd.get('password') || '')
    const phone = String(fd.get('phone') || '').trim() || null
    const role  = String(fd.get('role') || '').trim()
    if (!name) { alert('Nombre es requerido'); return }
    if (!email) { alert('Email es requerido'); return }
    if (password.length < 6) { alert('Contraseña mínimo 6 caracteres'); return }
    if (!role) { alert('Selecciona un rol'); return }
    try {
      await axios.post('/api/staffs', { name, email, password, phone, role, isActive: true })
      formRef.current?.reset()
      await mutate()
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Error"
      alert(msg || "No se pudo crear")
    }
  }

  async function remove(id: number){
    if (!confirm('¿Eliminar colaborador?')) return
    await axios.delete(`/api/staffs/${id}`)
    await mutate()
  }

  const defaultRoleName = useMemo(()=> roles[0]?.name || '', [roles])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Colaboradores</h2>

      {/* Crear */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-1">Agregar colaborador</h3>
        <p className="text-sm text-gray-600 mb-3">
          Crea el colaborador y su cuenta de acceso (email + contraseña para iniciar sesión).
        </p>
        <form ref={formRef} onSubmit={submitNew} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <div className="label">Nombre *</div>
            <input name="name" className="input" placeholder="Ej. Ana López" required />
          </div>
          <div>
            <div className="label">Email *</div>
            <input name="email" className="input" type="email" placeholder="ana@ejemplo.com" required />
          </div>
          <div>
            <div className="label">Contraseña *</div>
            <input name="password" className="input" type="password" minLength={6} placeholder="Mín. 6 caracteres" required />
          </div>
          <div>
            <div className="label">Teléfono</div>
            <input name="phone" className="input" placeholder="55 1234 5678" />
          </div>
          <div>
            <div className="label">Rol *</div>
            <select name="role" className="input" defaultValue={defaultRoleName} required disabled={!roles}>
              {roles ? (
                <>
                  <option value="">Selecciona…</option>
                  {roleOptions}
                </>
              ) : (
                <option value="">Cargando roles…</option>
              )}
            </select>
          </div>
          <div className="md:col-span-6 flex justify-end">
            <button className="btn btn-primary" type="submit" disabled={!roles}>Agregar</button>
          </div>
        </form>
      </div>

      {/* Listado */}
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">Nombre</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Teléfono</th>
              <th className="py-2 pr-4">Rol</th>
              <th className="py-2 pr-4">Acceso</th>
              <th className="py-2 pr-4">Activo</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((row) => {
              const isEditing = editingId === row.id
              return (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{row.id}</td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <input className="input" value={editRow.name ?? ''} onChange={e=>setEditRow(r=>({...r, name: e.currentTarget.value}))} />
                    ) : row.name}
                  </td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <input className="input" value={editRow.email ?? ''} onChange={e=>setEditRow(r=>({...r, email: e.currentTarget.value}))} />
                    ) : row.email}
                  </td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <input className="input" value={editRow.phone ?? ''} onChange={e=>setEditRow(r=>({...r, phone: e.currentTarget.value}))} />
                    ) : (row.phone || '-')}
                  </td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <select
                        className="input"
                        value={editRow.role ?? row.role}
                        onChange={e=>setEditRow(r=>({...r, role: e.currentTarget.value}))}
                        disabled={!roles}
                      >
                        {roles ? (
                          <>
                            <option value="">Selecciona…</option>
                            {roleOptions}
                          </>
                        ) : (
                          <option value="">Cargando…</option>
                        )}
                      </select>
                    ) : row.role}
                  </td>
                  <td className="py-2 pr-4">
                    {row.hasLogin ? (
                      <span className="text-green-700">Sí</span>
                    ) : (
                      <span className="text-amber-700">Sin cuenta</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={!!(editRow.isActive ?? row.isActive)}
                        onChange={e=>setEditRow(r=>({...r, isActive: e.currentTarget.checked}))}
                      />
                    ) : (row.isActive ? 'Sí' : 'No')}
                  </td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          className="input text-xs"
                          type="password"
                          placeholder="Nueva contraseña (opc.)"
                          value={editRow.password ?? ''}
                          onChange={e=>setEditRow(r=>({...r, password: e.currentTarget.value}))}
                        />
                        <div className="flex gap-2">
                          <button type="button" className="btn text-xs" onClick={()=>saveEdit(row.id)}>Guardar</button>
                          <button type="button" className="btn text-xs" onClick={cancelEdit}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" className="btn text-xs" onClick={()=>startEdit(row)}>Editar</button>
                        <button type="button" className="btn text-xs" onClick={()=>remove(row.id)}>Eliminar</button>
                      </div>
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
