import { prisma } from "@/lib/prisma"
import { createSupabaseAdmin } from "@/lib/supabase/server"
import { createStaffSchema, updateStaffSchema } from "@/schemas/staff.schema"
import type { Prisma } from "@prisma/client"

type StaffRow = Prisma.StaffGetPayload<{ include: { role: true } }>

/** Permiso que define a un administrador capaz de reparar los accesos del sistema. */
const MANAGE_STAFF = "manageStaff"

const withRole = { role: true } as const

function toStaff(row: StaffRow) {
  return {
    id: row.id,
    name: row.name,
    role: row.role.name,
    roleId: row.roleId,
    email: row.email,
    phone: row.phone,
    isActive: row.isActive,
    hasLogin: !!row.authUserId,
  }
}

function grantsStaffManagement(role: { permissions: unknown }) {
  return (role.permissions as Record<string, boolean> | null)?.[MANAGE_STAFF] === true
}

/**
 * Un administrador solo cuenta como red de seguridad si además puede entrar:
 * un colaborador con rol de admin pero sin cuenta de acceso no puede reparar nada.
 */
async function listUsableAdmins() {
  const rows = await prisma.staff.findMany({
    where: { isActive: true, authUserId: { not: null } },
    include: withRole,
  })
  return rows.filter((r) => grantsStaffManagement(r.role))
}

async function assertNotLastAdmin(staffId: number, action: string) {
  const admins = await listUsableAdmins()
  const isCurrentlyAdmin = admins.some((a) => a.id === staffId)
  if (isCurrentlyAdmin && admins.length <= 1) {
    throw new Error(
      `No puedes ${action}: es el único administrador con acceso al sistema. ` +
        `Asigna primero el rol de administrador a otro colaborador que tenga cuenta de acceso.`
    )
  }
}

async function resolveRole(roleName: string) {
  const name = roleName.trim()
  const role = await prisma.role.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  })
  if (!role) throw new Error(`El rol "${name}" no existe`)
  return role
}

export async function listStaff() {
  const rows = await prisma.staff.findMany({
    orderBy: { id: "desc" },
    include: withRole,
  })
  return rows.map(toStaff)
}

export async function getStaff(id: number) {
  const row = await prisma.staff.findUnique({ where: { id }, include: withRole })
  return row ? toStaff(row) : null
}

async function createSupabaseUser(email: string, password: string) {
  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })
  if (error) {
    if (error.message.includes("already been registered")) {
      throw new Error("Ese email ya tiene cuenta de acceso")
    }
    throw new Error(error.message)
  }
  return data.user.id
}

async function updateSupabasePassword(authUserId: string, password: string) {
  const supabase = createSupabaseAdmin()
  const { error } = await supabase.auth.admin.updateUserById(authUserId, { password })
  if (error) throw new Error(error.message)
}

async function deleteSupabaseUser(authUserId: string) {
  const supabase = createSupabaseAdmin()
  const { error } = await supabase.auth.admin.deleteUser(authUserId)
  if (error) throw new Error(error.message)
}

export async function createStaff(body: unknown) {
  const parsed = createStaffSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const { name, email, password, role, phone, isActive } = parsed.data
  const roleRow = await resolveRole(role)
  const authUserId = await createSupabaseUser(email, password)

  try {
    const created = await prisma.staff.create({
      data: {
        name: name.trim(),
        roleId: roleRow.id,
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        isActive: isActive ?? true,
        authUserId,
      },
      include: withRole,
    })
    return toStaff(created)
  } catch (e) {
    await deleteSupabaseUser(authUserId).catch(() => {})
    throw e
  }
}

/** Crea la cuenta de acceso de un colaborador que todavía no puede iniciar sesión. */
export async function createStaffAccess(id: number, password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres")
  }

  const existing = await prisma.staff.findUnique({ where: { id }, include: withRole })
  if (!existing) throw new Error("No encontrado")
  if (existing.authUserId) throw new Error("Este colaborador ya tiene cuenta de acceso")

  const authUserId = await createSupabaseUser(existing.email, password)
  const row = await prisma.staff.update({
    where: { id },
    data: { authUserId },
    include: withRole,
  })
  return toStaff(row)
}

export async function updateStaff(id: number, body: unknown, actorId: number) {
  const parsed = updateStaffSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const existing = await prisma.staff.findUnique({ where: { id }, include: withRole })
  if (!existing) throw new Error("No encontrado")

  const { password, ...fields } = parsed.data
  const data: Prisma.StaffUpdateInput = {}

  if (fields.name !== undefined) data.name = fields.name.trim()
  if (fields.email !== undefined) data.email = fields.email.trim().toLowerCase()
  if (fields.phone !== undefined) data.phone = fields.phone?.trim() || null
  if (fields.isActive !== undefined) data.isActive = fields.isActive

  const nextRole = fields.role !== undefined ? await resolveRole(fields.role) : existing.role
  if (fields.role !== undefined) data.role = { connect: { id: nextRole.id } }

  if (fields.isActive === false && id === actorId) {
    throw new Error("No puedes desactivar tu propia cuenta")
  }

  const willBeActive = fields.isActive ?? existing.isActive
  const willHaveLogin = !!existing.authUserId || !!password
  const staysAdmin = willBeActive && willHaveLogin && grantsStaffManagement(nextRole)
  if (!staysAdmin) {
    await assertNotLastAdmin(id, "aplicar este cambio")
  }

  if (password) {
    if (existing.authUserId) {
      await updateSupabasePassword(existing.authUserId, password)
    } else {
      const email = (fields.email ?? existing.email).trim().toLowerCase()
      data.authUserId = await createSupabaseUser(email, password)
    }
  }

  const row = await prisma.staff.update({ where: { id }, data, include: withRole })
  return toStaff(row)
}

export async function deleteStaff(id: number, actorId: number) {
  const existing = await prisma.staff.findUnique({ where: { id } })
  if (!existing) throw new Error("No encontrado")

  if (id === actorId) throw new Error("No puedes eliminar tu propia cuenta")
  await assertNotLastAdmin(id, "eliminar este colaborador")

  if (existing.authUserId) {
    await deleteSupabaseUser(existing.authUserId)
  }

  await prisma.staff.delete({ where: { id } })
  return { ok: true }
}
