import { prisma } from "@/lib/prisma"

export async function listLocations() {
  return prisma.location.findMany({ orderBy: { id: "desc" } })
}

export async function getLocation(id: number) {
  return prisma.location.findUnique({ where: { id } })
}

export async function createLocation(body: Record<string, unknown>) {
  if (!body?.name || typeof body.name !== "string") throw new Error("Nombre es requerido")
  if (!body?.address || typeof body.address !== "string") throw new Error("Dirección es requerida")

  return prisma.location.create({
    data: {
      name: String(body.name).trim(),
      address: String(body.address).trim(),
      phone: body.phone ? String(body.phone).trim() : null,
      isActive: body.isActive === true,
    },
  })
}

export async function updateLocation(id: number, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.address !== undefined) data.address = body.address ? String(body.address).trim() : null
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)

  return prisma.location.update({ where: { id }, data })
}

export async function deleteLocation(id: number) {
  return prisma.location.delete({ where: { id } })
}
