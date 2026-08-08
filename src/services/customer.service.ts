import { prisma } from "@/lib/prisma"
import { normalizePhoneMX } from "@/lib/utils/phone"
import { createCustomerSchema } from "@/schemas/customer.schema"

export async function listCustomers() {
  return prisma.customer.findMany({ orderBy: { id: "desc" } })
}

export async function getCustomer(id: number) {
  return prisma.customer.findUnique({ where: { id } })
}

export async function createCustomer(body: unknown) {
  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const { name, phone, email, notes, sexo } = parsed.data
  return prisma.customer.create({
    data: {
      name,
      phone: normalizePhoneMX(phone) || phone,
      email: email ?? null,
      notes: notes ?? null,
      sexo: sexo ?? null,
    },
  })
}

export async function updateCustomer(id: number, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.email !== undefined) data.email = body.email ? String(body.email).trim() : null
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null
  if (body.sexo !== undefined) {
    const s = String(body.sexo).trim().toLowerCase()
    data.sexo = ["mujer", "hombre", "otro"].includes(s) ? s : null
  }
  if (body.phone !== undefined) {
    const normalized = normalizePhoneMX(String(body.phone))
    data.phone = normalized || null
  }

  return prisma.customer.update({ where: { id }, data })
}

export async function deleteCustomer(id: number) {
  return prisma.customer.delete({ where: { id } })
}
