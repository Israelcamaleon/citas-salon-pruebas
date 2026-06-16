import { prisma } from "@/lib/prisma"

export async function listStaff() {
  return prisma.staff.findMany({ orderBy: { id: "desc" } })
}

export async function getStaff(id: number) {
  return prisma.staff.findUnique({ where: { id } })
}

export async function createStaff(body: Record<string, unknown>) {
  if (!body?.email || typeof body.email !== "string") {
    throw new Error("Email es requerido")
  }

  return prisma.staff.create({
    data: {
      name: String(body.name || "").trim(),
      role: String(body.role || "").trim(),
      email: String(body.email).trim(),
      phone: body.phone ? String(body.phone).trim() : null,
      isActive: body.isActive === true,
    },
  })
}

export async function updateStaff(id: number, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.role !== undefined) data.role = String(body.role).trim()
  if (body.email !== undefined) data.email = body.email ? String(body.email).trim() : null
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)

  return prisma.staff.update({ where: { id }, data })
}

export async function deleteStaff(id: number) {
  return prisma.staff.delete({ where: { id } })
}
