'use client'
import useSWR from 'swr'
import axios from 'axios'
import { useRef, useState, useMemo } from 'react'
import { asArray, describeApiError, fetcher } from '@/lib/api'
import { useSession } from '@/lib/useSession'

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
  const { staff: me, can, isLoading: loadingSession } = useSession()
  const staffList = asArray<Staff>(staffData)
  const roles = asArray<Role>(rolesData)
  const canManage = can('manageStaff')

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
      alert(describeApiError(err, 'No se pudo actualizar'))
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
      alert(describeApiError(err, 'No se pudo crear'))
    }
  }

  async function remove(id: number){
    if (!confirm('¿Eliminar colaborador?')) return
    try {
      await axios.delete(`/api/staffs/${id}`)
      await mutate()
    } catch (err: unknown) {
      alert(describeApiError(err, 'No se pudo eliminar'))
    }
  }

  async function grantAccess(row: Staff){
    const password = prompt(
      `Contraseña inicial para ${row.name} (${row.email}).\nMínimo 6 caracteres; podrá cambiarla después.`
    )
    if (password === null) return
    if (password.length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return }
    try {
      await axios.post(`/api/staffs/${row.id}/access`, { password })
      await mutate()
      alert(`Listo. ${row.name} ya puede iniciar sesión con ${row.email}.`)
    } catch (err: unknown) {
      alert(describeApiError(err, 'No se pudo crear el acceso'))
    }
  }

  const defaultRoleName = useMemo(()=> roles[0]?.name || '', [roles])
  const withoutAccess = staffList.filter(s => !s.hasLogin).length

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Colaboradores</h2>

      {!loadingSession && !canManage && (
        <div className="border border-amber-300 bg-amber-50 text-amber-900 rounded-lg p-3 text-sm">
          Tu rol{me ? ` (${me.role})` : ''} puede consultar esta lista pero no modificarla.
          Pide a un administrador que te asigne un rol con permiso de gestión de personal.
        </div>
      )}

      {canManage && withoutAccess > 0 && (
        <div className="border border-blue-300 bg-blue-50 text-blue-900 rounded-lg p-3 text-sm">
          {withoutAccess} colaborador(es) no tienen cuenta de acceso y no pueden iniciar sesión.
          Usa el botón <strong>Crear acceso</strong> en su fila para darles entrada.
        </div>
      )}

      {/* Crear */}
      {canManage && (
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
            <select
              key={defaultRoleName}
              name="role"
              className="input"
              defaultValue={defaultRoleName}
              required
              disabled={roles.length === 0}
            >
              {roles.length > 0 ? (
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
            <button className="btn btn-primary" type="submit" disabled={roles.length === 0}>Agregar</button>
          </div>
        </form>
      </div>
      )}

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
              {canManage && <th className="py-2 pr-4"></th>}
            </tr>
          </thead>
          <tbody>
            {staffList.map((row) => {
              const isEditing = editingId === row.id
              const isMe = me?.id === row.id
              return (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{row.id}</td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <input className="input" value={editRow.name ?? ''} onChange={e=>{const v=e.currentTarget.value; setEditRow(r=>({...r, name: v}))}} />
                    ) : (
                      <>
                        {row.name}
                        {isMe && <span className="ml-2 text-xs text-gray-500">(tú)</span>}
                      </>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <input className="input" value={editRow.email ?? ''} onChange={e=>{const v=e.currentTarget.value; setEditRow(r=>({...r, email: v}))}} />
                    ) : row.email}
                  </td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <input className="input" value={editRow.phone ?? ''} onChange={e=>{const v=e.currentTarget.value; setEditRow(r=>({...r, phone: v}))}} />
                    ) : (row.phone || '-')}
                  </td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <select
                        className="input"
                        value={editRow.role ?? row.role}
                        onChange={e=>{const v=e.currentTarget.value; setEditRow(r=>({...r, role: v}))}}
                        disabled={roles.length === 0}
                      >
                        {roles.length > 0 ? (
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
                    ) : canManage ? (
                      <button type="button" className="btn text-xs" onClick={()=>grantAccess(row)}>
                        Crear acceso
                      </button>
                    ) : (
                      <span className="text-amber-700">Sin cuenta</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={!!(editRow.isActive ?? row.isActive)}
                        disabled={isMe}
                        onChange={e=>{const v=e.currentTarget.checked; setEditRow(r=>({...r, isActive: v}))}}
                      />
                    ) : (row.isActive ? 'Sí' : 'No')}
                  </td>
                  {canManage && (
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          className="input text-xs"
                          type="password"
                          placeholder={row.hasLogin ? 'Nueva contraseña (opc.)' : 'Contraseña para dar acceso'}
                          value={editRow.password ?? ''}
                          onChange={e=>{const v=e.currentTarget.value; setEditRow(r=>({...r, password: v}))}}
                        />
                        <div className="flex gap-2">
                          <button type="button" className="btn text-xs" onClick={()=>saveEdit(row.id)}>Guardar</button>
                          <button type="button" className="btn text-xs" onClick={cancelEdit}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" className="btn text-xs" onClick={()=>startEdit(row)}>Editar</button>
                        <button
                          type="button"
                          className="btn text-xs disabled:opacity-40"
                          disabled={isMe}
                          title={isMe ? 'No puedes eliminar tu propia cuenta' : undefined}
                          onClick={()=>remove(row.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
