import { prisma } from "@/lib/prisma"
import { createBookingSchema } from "@/schemas/booking.schema"

const bookingInclude = {
  service: true,
  staff: true,
  customer: true,
  location: true,
} as const

export async function listBookings() {
  return prisma.booking.findMany({
    orderBy: { date: "asc" },
    include: bookingInclude,
  })
}

export async function getBooking(id: number) {
  return prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  })
}

export async function createBooking(body: unknown) {
  const parsed = createBookingSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const { customerId, ...rest } = parsed.data
  const cust = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { phone: true },
  })

  if (!cust?.phone?.trim()) {
    throw new Error("El cliente no tiene teléfono. Agrega uno antes de agendar.")
  }

  return prisma.booking.create({
    data: {
      date: new Date(rest.date),
      durationMin: rest.durationMin,
      serviceId: rest.serviceId,
      staffId: rest.staffId,
      locationId: rest.locationId,
      customerId,
    },
  })
}

export async function updateBooking(id: number, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}

  if (body.date !== undefined) {
    const d = new Date(String(body.date))
    if (isNaN(d.getTime())) throw new Error("Fecha inválida")
    data.date = d
  }

  for (const key of ["durationMin", "serviceId", "staffId", "locationId", "customerId"] as const) {
    if (body[key] !== undefined) {
      const v = Number(body[key])
      if (!Number.isInteger(v) || v <= 0) throw new Error(`${key} inválido`)
      data[key] = v
    }
  }

  if (body.status !== undefined) {
    const s = String(body.status).trim()
    if (!s) throw new Error("status inválido")
    data.status = s
  }

  if (!Object.keys(data).length) {
    throw new Error("Nada que actualizar")
  }

  return prisma.booking.update({ where: { id }, data })
}

export async function deleteBooking(id: number) {
  return prisma.booking.delete({ where: { id } })
}
