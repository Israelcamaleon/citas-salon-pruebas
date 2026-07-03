import { prisma } from "@/lib/prisma"
import { parseProgramConfig } from "@/schemas/loyalty/program-config.schema"
import { serviceUseSchema, stampSchema } from "@/schemas/loyalty/program.schema"
import type { LoyaltyTransaction } from "@/types/loyalty"
import type { LoyaltyTransactionType } from "@prisma/client"
import { getCard } from "./card.service"

function toTransaction(row: {
  id: number
  type: LoyaltyTransactionType
  amount: number
  purchaseAmt: number | null
  notes: string | null
  createdAt: Date
  cardId: number
  staffId: number | null
  staff?: { id: number; name: string } | null
}): LoyaltyTransaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    purchaseAmt: row.purchaseAmt,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    cardId: row.cardId,
    staffId: row.staffId,
    staff: row.staff,
  }
}

export async function listTransactions(limit = 50): Promise<LoyaltyTransaction[]> {
  const rows = await prisma.loyaltyTransaction.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { staff: { select: { id: true, name: true } } },
  })
  return rows.map(toTransaction)
}

export async function stampCard(body: unknown, staffId?: number): Promise<LoyaltyTransaction> {
  const parsed = stampSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const { cardId, amount, notes } = parsed.data
  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    include: { program: true },
  })

  if (!card || card.status !== "ACTIVE") throw new Error("Tarjeta no encontrada o inactiva")
  if (card.program.type !== "STAMP") throw new Error("Esta tarjeta no es de tipo sellos")

  const config = parseProgramConfig(card.program.type, card.program.config)
  if (config.type !== "STAMP") throw new Error("Configuración de programa inválida")

  const newBalance = card.balance + amount
  const redeemed = newBalance >= config.stampsNeeded

  const [tx] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        cardId,
        staffId: staffId ?? null,
        type: "STAMP",
        amount,
        notes: notes ?? null,
      },
      include: { staff: { select: { id: true, name: true } } },
    }),
    prisma.loyaltyCard.update({
      where: { id: cardId },
      data: {
        balance: redeemed ? 0 : newBalance,
        status: redeemed ? "REDEEMED" : "ACTIVE",
      },
    }),
  ])

  return toTransaction(tx)
}

export async function useService(body: unknown, staffId?: number): Promise<LoyaltyTransaction> {
  const parsed = serviceUseSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const { cardId, serviceName, notes } = parsed.data
  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    include: { program: true },
  })

  if (!card || card.status !== "ACTIVE") throw new Error("Tarjeta no encontrada o inactiva")
  if (card.program.type !== "SERVICE") throw new Error("Esta tarjeta no es de tipo servicios")

  const config = parseProgramConfig(card.program.type, card.program.config)
  if (config.type !== "SERVICE") throw new Error("Configuración de programa inválida")

  const serviceDef = config.services.find((s) => s.name === serviceName)
  if (!serviceDef) throw new Error("Servicio no encontrado en el programa")

  const usage = (card.serviceUsage as Record<string, number> | null) ?? {}
  const used = usage[serviceName] ?? 0
  if (used >= serviceDef.total) throw new Error("No quedan usos disponibles para este servicio")

  const newUsage = { ...usage, [serviceName]: used + 1 }
  const allUsed = config.services.every((s) => (newUsage[s.name] ?? 0) >= s.total)

  const [tx] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        cardId,
        staffId: staffId ?? null,
        type: "SERVICE_USE",
        amount: 1,
        notes: notes ?? serviceName,
      },
      include: { staff: { select: { id: true, name: true } } },
    }),
    prisma.loyaltyCard.update({
      where: { id: cardId },
      data: {
        serviceUsage: newUsage,
        status: allUsed ? "REDEEMED" : "ACTIVE",
      },
    }),
  ])

  return toTransaction(tx)
}

/** V2 — stubs para tipos restantes */
export async function redeemCard(_body: unknown, _staffId?: number): Promise<never> {
  throw new Error("Canje no implementado en V1")
}

export async function loadPrepaid(_body: unknown, _staffId?: number): Promise<never> {
  throw new Error("Recarga no implementada en V1")
}

export async function recordCashback(_body: unknown, _staffId?: number): Promise<never> {
  throw new Error("Cashback no implementado en V1")
}

export async function getSummary() {
  const [totalPrograms, activeCards, customersWithCards, recentTransactions] = await Promise.all([
    prisma.loyaltyProgram.count({ where: { active: true } }),
    prisma.loyaltyCard.count({ where: { status: "ACTIVE" } }),
    prisma.loyaltyCard.groupBy({ by: ["customerId"] }),
    listTransactions(10),
  ])

  return {
    totalPrograms,
    activeCards,
    totalCustomers: customersWithCards.length,
    recentTransactions,
  }
}

export { getCard }
