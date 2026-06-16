import { prisma } from "@/lib/prisma"
import type { Role } from "@/types"
import type { Prisma } from "@prisma/client"

const DEFAULT_ROLES: Omit<Role, "id">[] = [
  {
    name: "Administrador",
    description: "Acceso total",
    permissions: {
      manageBookings: true, manageCustomers: true, manageStaff: true, manageServices: true,
      manageLocations: true, manageReports: true, manageSettings: true, manageRoles: true,
    },
  },
  {
    name: "Gerente",
    description: "Gestión operativa",
    permissions: {
      manageBookings: true, manageCustomers: true, manageStaff: true, manageServices: true,
      manageLocations: true, manageReports: true, manageSettings: false, manageRoles: false,
    },
  },
  {
    name: "Colaborador",
    description: "Acceso limitado",
    permissions: {
      manageBookings: true, manageCustomers: true, manageStaff: false, manageServices: false,
      manageLocations: false, manageReports: false, manageSettings: false, manageRoles: false,
    },
  },
]

function toRole(row: { id: number; name: string; description: string | null; permissions: unknown }): Role {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    permissions: (row.permissions as Record<string, boolean>) || {},
  }
}

async function ensureDefaultRoles() {
  const count = await prisma.role.count()
  if (count > 0) return

  for (const role of DEFAULT_ROLES) {
    await prisma.role.create({
      data: {
        name: role.name,
        description: role.description,
        permissions: role.permissions as Prisma.InputJsonValue,
      },
    })
  }
}

export async function listRoles() {
  await ensureDefaultRoles()
  const rows = await prisma.role.findMany({ orderBy: { id: "asc" } })
  return rows.map(toRole)
}

export async function getRole(id: number) {
  const row = await prisma.role.findUnique({ where: { id } })
  return row ? toRole(row) : null
}

export async function createRole(body: Record<string, unknown>) {
  const name = String(body.name || "").trim()
  if (!name) throw new Error("Nombre es obligatorio")

  try {
    const row = await prisma.role.create({
      data: {
        name,
        description: body.description ? String(body.description).trim() : null,
        permissions: ((body.permissions && typeof body.permissions === "object")
          ? body.permissions
          : {}) as Prisma.InputJsonValue,
      },
    })
    return toRole(row)
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "P2002") throw new Error("El nombre ya existe")
    throw e
  }
}

export async function updateRole(id: number, body: Record<string, unknown>) {
  const data: Prisma.RoleUpdateInput = {}

  if (body.name !== undefined) {
    const n = String(body.name).trim()
    if (!n) throw new Error("Nombre es obligatorio")
    data.name = n
  }
  if (body.description !== undefined) {
    data.description = body.description ? String(body.description).trim() : null
  }
  if (body.permissions && typeof body.permissions === "object") {
    data.permissions = body.permissions as Prisma.InputJsonValue
  }

  try {
    const row = await prisma.role.update({ where: { id }, data })
    return toRole(row)
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "P2025") throw new Error("No encontrado")
    throw e
  }
}

export async function deleteRole(id: number) {
  try {
    const row = await prisma.role.delete({ where: { id } })
    return toRole(row)
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "P2025") throw new Error("No encontrado")
    throw e
  }
}
