import { prisma } from "@/lib/prisma"
import { createSupabaseAdmin } from "@/lib/supabase/server"
import { createStaffSchema, updateStaffSchema } from "@/schemas/staff.schema"

function omitPassword<T extends Record<string, unknown>>(row: T) {
  const { password: _, ...rest } = row as T & { password?: unknown }
  return rest
}

export async function listStaff() {
  const rows = await prisma.staff.findMany({ orderBy: { id: "desc" } })
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    email: s.email,
    phone: s.phone,
    isActive: s.isActive,
    hasLogin: !!s.authUserId,
  }))
}

export async function getStaff(id: number) {
  const row = await prisma.staff.findUnique({ where: { id } })
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    isActive: row.isActive,
    hasLogin: !!row.authUserId,
  }
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
  const authUserId = await createSupabaseUser(email, password)

  try {
    return await prisma.staff.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        isActive: isActive ?? true,
        authUserId,
      },
      select: {
        id: true, name: true, role: true, email: true, phone: true, isActive: true, authUserId: true,
      },
    }).then((s) => ({ ...omitPassword(s), hasLogin: !!s.authUserId }))
  } catch (e) {
    await deleteSupabaseUser(authUserId).catch(() => {})
    throw e
  }
}

export async function updateStaff(id: number, body: unknown) {
  const parsed = updateStaffSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const existing = await prisma.staff.findUnique({ where: { id } })
  if (!existing) throw new Error("No encontrado")

  const { password, ...fields } = parsed.data
  const data: Record<string, unknown> = {}

  if (fields.name !== undefined) data.name = fields.name.trim()
  if (fields.role !== undefined) data.role = fields.role.trim()
  if (fields.email !== undefined) data.email = fields.email.trim().toLowerCase()
  if (fields.phone !== undefined) data.phone = fields.phone?.trim() || null
  if (fields.isActive !== undefined) data.isActive = fields.isActive

  if (password) {
    if (existing.authUserId) {
      await updateSupabasePassword(existing.authUserId, password)
    } else {
      const email = (fields.email ?? existing.email).trim().toLowerCase()
      const authUserId = await createSupabaseUser(email, password)
      data.authUserId = authUserId
    }
  }

  const row = await prisma.staff.update({ where: { id }, data })
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    isActive: row.isActive,
    hasLogin: !!row.authUserId,
  }
}

export async function deleteStaff(id: number) {
  const existing = await prisma.staff.findUnique({ where: { id } })
  if (!existing) throw new Error("No encontrado")

  if (existing.authUserId) {
    await deleteSupabaseUser(existing.authUserId)
  }

  await prisma.staff.delete({ where: { id } })
  return { ok: true }
}
