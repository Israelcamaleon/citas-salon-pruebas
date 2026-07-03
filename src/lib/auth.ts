import { prisma } from "@/lib/prisma"
import { createSupabaseServer } from "@/lib/supabase/server-auth"
import type { Staff } from "@prisma/client"

export class AuthError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}

export async function getSessionUser() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getCurrentStaff(): Promise<Staff | null> {
  const user = await getSessionUser()
  if (!user) return null

  return prisma.staff.findFirst({
    where: { authUserId: user.id, isActive: true },
  })
}

export async function getStaffPermissions(
  staff: Pick<Staff, "role">
): Promise<Record<string, boolean>> {
  const role = await prisma.role.findUnique({ where: { name: staff.role } })
  return (role?.permissions as Record<string, boolean>) ?? {}
}

export async function requireStaff(): Promise<Staff> {
  const staff = await getCurrentStaff()
  if (!staff) throw new AuthError("No autorizado")
  return staff
}

export async function requirePermission(permission: string): Promise<Staff> {
  const staff = await requireStaff()
  const permissions = await getStaffPermissions(staff)
  if (!permissions[permission]) {
    throw new AuthError("Sin permiso", 403)
  }
  return staff
}

export async function getAuthContext() {
  const user = await getSessionUser()
  if (!user) return null

  const staff = await getCurrentStaff()
  if (!staff) return { user, staff: null, permissions: {} as Record<string, boolean> }

  const permissions = await getStaffPermissions(staff)
  return { user, staff, permissions }
}
