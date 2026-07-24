import { prisma } from "@/lib/prisma"
import { createSupabaseServer } from "@/lib/supabase/server-auth"
import type { Prisma } from "@prisma/client"

/** Distingue las causas para que el cliente pueda reaccionar distinto a cada una. */
export type AuthErrorCode = "NO_SESSION" | "NO_STAFF" | "FORBIDDEN"

export class AuthError extends Error {
  status: number
  code: AuthErrorCode

  constructor(message: string, code: AuthErrorCode, status = 401) {
    super(message)
    this.code = code
    this.status = status
  }
}

export type StaffWithRole = Prisma.StaffGetPayload<{ include: { role: true } }>

export async function getSessionUser() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

function findStaffByAuthUser(authUserId: string) {
  return prisma.staff.findFirst({
    where: { authUserId, isActive: true },
    include: { role: true },
  })
}

export async function getCurrentStaff(): Promise<StaffWithRole | null> {
  const user = await getSessionUser()
  if (!user) return null
  return findStaffByAuthUser(user.id)
}

export function getStaffPermissions(
  staff: Pick<StaffWithRole, "role">
): Record<string, boolean> {
  return (staff.role.permissions as Record<string, boolean>) ?? {}
}

export async function requireStaff(): Promise<StaffWithRole> {
  const user = await getSessionUser()
  if (!user) {
    throw new AuthError("Tu sesión expiró. Vuelve a iniciar sesión.", "NO_SESSION", 401)
  }

  const staff = await findStaffByAuthUser(user.id)
  if (!staff) {
    throw new AuthError(
      "Tu cuenta no está ligada a un colaborador activo. Pide a un administrador que revise tu acceso.",
      "NO_STAFF",
      401
    )
  }
  return staff
}

export async function requirePermission(permission: string): Promise<StaffWithRole> {
  const staff = await requireStaff()
  if (!getStaffPermissions(staff)[permission]) {
    throw new AuthError(
      `Tu rol (${staff.role.name}) no tiene permiso para esta acción.`,
      "FORBIDDEN",
      403
    )
  }
  return staff
}

export async function getAuthContext() {
  const user = await getSessionUser()
  if (!user) return null

  const staff = await findStaffByAuthUser(user.id)
  if (!staff) return { user, staff: null, permissions: {} as Record<string, boolean> }

  return { user, staff, permissions: getStaffPermissions(staff) }
}
