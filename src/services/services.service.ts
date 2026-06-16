import { prisma } from "@/lib/prisma"

export async function listServices() {
  return prisma.service.findMany({ orderBy: { id: "desc" } })
}

export async function getService(id: number) {
  return prisma.service.findUnique({ where: { id } })
}

export async function createService(body: Record<string, unknown>) {
  return prisma.service.create({
    data: {
      name: String(body.name || ""),
      durationMin: Number(body.durationMin),
      priceMXN: Number(body.priceMXN),
      isActive: body.isActive !== false,
    },
  })
}

export async function updateService(id: number, body: Record<string, unknown>) {
  return prisma.service.update({
    where: { id },
    data: {
      name: body.name as string | undefined,
      durationMin: body.durationMin as number | undefined,
      priceMXN: body.priceMXN as number | undefined,
      isActive: body.isActive as boolean | undefined,
    },
  })
}

export async function deleteService(id: number) {
  return prisma.service.delete({ where: { id } })
}
