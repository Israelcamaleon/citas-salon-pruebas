import { prisma } from "@/lib/prisma"
import { normalizePhoneMX } from "@/lib/utils/phone"
import { publicLookupSchema } from "@/schemas/loyalty/program.schema"
import { listActiveCardsForPhone } from "./card.service"

export async function lookupOrCreateCustomer(body: unknown) {
  const parsed = publicLookupSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const phone = normalizePhoneMX(parsed.data.phone) || parsed.data.phone

  let customer = await prisma.customer.findFirst({ where: { phone } })

  if (!customer) {
    if (!parsed.data.name?.trim()) {
      throw new Error("Nombre requerido para clientes nuevos")
    }
    customer = await prisma.customer.create({
      data: {
        phone,
        name: parsed.data.name.trim(),
      },
    })
  }

  const cards = await listActiveCardsForPhone(phone)

  return { customer, cards }
}
