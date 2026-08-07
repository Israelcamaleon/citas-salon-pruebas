import { prisma } from "@/lib/prisma"
import { parseProgramConfig } from "@/schemas/loyalty/program-config.schema"
import {
  cashbackSchema,
  couponUseSchema,
  discountApplySchema,
  loadSchema,
  redeemSchema,
  serviceUseSchema,
  stampSchema,
} from "@/schemas/loyalty/program.schema"
import type { LoyaltyTransaction } from "@/types/loyalty"
import type { LoyaltyTransactionType } from "@prisma/client"

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

async function getActiveCard(cardId: number) {
  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    include: { program: true },
  })
  if (!card || card.status !== "ACTIVE") throw new Error("Tarjeta no encontrada o inactiva")
  return card
}

export async function listTransactions(limit = 50): Promise<LoyaltyTransaction[]> {
  const rows = await prisma.loyaltyTransaction.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { staff: { select: { id: true, name: true } } },
  })
  return rows.map(toTransaction)
}

export type StampInfo = {
  stampsBefore: number
  stampsAfter: number
  stampsNeeded: number
  completed: boolean
  /** Recompensa ganada en ESTA visita (si aplica) */
  reward: string | null
  /** Siguiente beneficio pendiente después de esta visita */
  nextReward: { atStamps: number; text: string } | null
}

export async function stampCard(
  body: unknown,
  staffId?: number
): Promise<LoyaltyTransaction & { stampInfo: StampInfo }> {
  const parsed = stampSchema.safeParse(body)
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")

  const { cardId, amount, notes } = parsed.data
  const card = await getActiveCard(cardId)
  if (card.program.type !== "STAMP") throw new Error("Esta tarjeta no es de tipo sellos")

  const config = parseProgramConfig(card.program.type, card.program.config)
  if (config.type !== "STAMP") throw new Error("Configuración inválida")

  const stampsBefore = card.balance
  const stampsAfterRaw = card.balance + amount
  const completed = stampsAfterRaw >= config.stampsNeeded

  const rewards = config.rewards ?? {}
  const milestones = Object.keys(rewards)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)

  // Recompensa ganada en ESTA visita: el hito más alto alcanzado con este sello
  let reward: string | null = null
  if (completed) {
    reward = rewards[String(config.stampsNeeded)] ?? "Recompensa completada"
  } else {
    const hit = milestones
      .filter((m) => m < config.stampsNeeded && stampsBefore < m && stampsAfterRaw >= m)
      .pop()
    if (hit != null) reward = rewards[String(hit)] ?? null
  }

  // Siguiente beneficio pendiente después de esta visita
  let nextReward: { atStamps: number; text: string } | null = null
  if (!completed) {
    const next = milestones.find((m) => m > stampsAfterRaw)
    if (next != null && rewards[String(next)]) {
      nextReward = { atStamps: next, text: rewards[String(next)] }
    }
  }

  const [tx] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        cardId,
        staffId: staffId ?? null,
        type: "STAMP",
        amount,
        notes: notes ?? (reward ? `Recompensa: ${reward}` : null),
      },
      include: { staff: { select: { id: true, name: true } } },
    }),
    prisma.loyaltyCard.update({
      where: { id: cardId },
      data: {
        balance: completed ? 0 : stampsAfterRaw,
        status: completed ? "REDEEMED" : "ACTIVE",
      },
    }),
  ])

  return {
    ...toTransaction(tx),
    stampInfo: {
      stampsBefore,
      stampsAfter: completed ? config.stampsNeeded : stampsAfterRaw,
      stampsNeeded: config.stampsNeeded,
      completed,
      reward,
      nextReward,
    },
  }
}

export async function useService(body: unknown, staffId?: number): Promise<LoyaltyTransaction> {
  const parsed = serviceUseSchema.safeParse(body)
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")

  const { cardId, serviceName, notes } = parsed.data
  const card = await getActiveCard(cardId)
  if (card.program.type !== "SERVICE") throw new Error("Esta tarjeta no es de tipo servicios")

  const config = parseProgramConfig(card.program.type, card.program.config)
  if (config.type !== "SERVICE") throw new Error("Configuración inválida")

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

/** Canjear saldo de gift / prepaid / cashback */
export async function redeemCard(body: unknown, staffId?: number): Promise<LoyaltyTransaction> {
  const parsed = redeemSchema.safeParse(body)
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")

  const { cardId, amount, notes } = parsed.data
  const card = await getActiveCard(cardId)
  const type = card.program.type
  if (!["GIFT", "PREPAID", "CASHBACK"].includes(type)) {
    throw new Error("Esta tarjeta no permite canje de saldo")
  }
  if (card.balance < amount) throw new Error("Saldo insuficiente")

  const newBalance = card.balance - amount
  const [tx] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        cardId,
        staffId: staffId ?? null,
        type: type === "CASHBACK" ? "CASHBACK_REDEEM" : "REDEEM",
        amount,
        notes: notes ?? null,
      },
      include: { staff: { select: { id: true, name: true } } },
    }),
    prisma.loyaltyCard.update({
      where: { id: cardId },
      data: { balance: newBalance },
    }),
  ])

  return toTransaction(tx)
}

/** Recargar prepago o gift recargable */
export async function loadPrepaid(body: unknown, staffId?: number): Promise<LoyaltyTransaction> {
  const parsed = loadSchema.safeParse(body)
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")

  const { cardId, amount, notes } = parsed.data
  const card = await getActiveCard(cardId)
  const config = parseProgramConfig(card.program.type, card.program.config)

  let bonus = 0
  if (config.type === "PREPAID") {
    if (amount < config.minLoad) throw new Error(`Monto mínimo de recarga: $${config.minLoad}`)
    bonus = Math.round(amount * (config.bonusPercent / 100))
    const newBalance = card.balance + amount + bonus
    if (config.maxBalance != null && newBalance > config.maxBalance) {
      throw new Error(`Saldo máximo permitido: $${config.maxBalance}`)
    }
  } else if (config.type === "GIFT") {
    if (!config.rechargeable) throw new Error("Esta gift card no es recargable")
  } else {
    throw new Error("Esta tarjeta no admite recargas")
  }

  const newBalance = card.balance + amount + bonus
  const [tx] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        cardId,
        staffId: staffId ?? null,
        type: "LOAD",
        amount,
        notes: notes ?? (bonus > 0 ? `Bono: +$${bonus}` : null),
      },
      include: { staff: { select: { id: true, name: true } } },
    }),
    prisma.loyaltyCard.update({
      where: { id: cardId },
      data: { balance: newBalance },
    }),
  ])

  return toTransaction(tx)
}

/** Registrar compra → acumular cashback */
export async function recordCashback(body: unknown, staffId?: number): Promise<LoyaltyTransaction> {
  const parsed = cashbackSchema.safeParse(body)
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")

  const { cardId, purchaseAmt, notes } = parsed.data
  const card = await getActiveCard(cardId)
  if (card.program.type !== "CASHBACK") throw new Error("Esta tarjeta no es de cashback")

  const config = parseProgramConfig(card.program.type, card.program.config)
  if (config.type !== "CASHBACK") throw new Error("Configuración inválida")

  if (config.minPurchase != null && purchaseAmt < config.minPurchase) {
    throw new Error(`Compra mínima: $${config.minPurchase}`)
  }

  let earned = Math.round(purchaseAmt * (config.percent / 100))
  if (config.maxPerTx != null) earned = Math.min(earned, config.maxPerTx)
  if (earned <= 0) throw new Error("No se generó cashback con este monto")

  const [tx] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        cardId,
        staffId: staffId ?? null,
        type: "CASHBACK_EARN",
        amount: earned,
        purchaseAmt,
        notes: notes ?? null,
      },
      include: { staff: { select: { id: true, name: true } } },
    }),
    prisma.loyaltyCard.update({
      where: { id: cardId },
      data: { balance: card.balance + earned },
    }),
  ])

  return toTransaction(tx)
}

/** Registrar aplicación de descuento */
export async function applyDiscount(body: unknown, staffId?: number): Promise<LoyaltyTransaction> {
  const parsed = discountApplySchema.safeParse(body)
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")

  const { cardId, purchaseAmt, notes } = parsed.data
  const card = await getActiveCard(cardId)
  if (card.program.type !== "DISCOUNT") throw new Error("Esta tarjeta no es de descuento")

  const config = parseProgramConfig(card.program.type, card.program.config)
  if (config.type !== "DISCOUNT") throw new Error("Configuración inválida")

  if (config.minPurchase != null && purchaseAmt != null && purchaseAmt < config.minPurchase) {
    throw new Error(`Compra mínima: $${config.minPurchase}`)
  }

  const amount =
    config.discountType === "percent"
      ? Math.round((purchaseAmt ?? 0) * (config.value / 100))
      : config.value

  const tx = await prisma.loyaltyTransaction.create({
    data: {
      cardId,
      staffId: staffId ?? null,
      type: "DISCOUNT_APPLY",
      amount,
      purchaseAmt: purchaseAmt ?? null,
      notes: notes ?? `${config.discountType === "percent" ? `${config.value}%` : `$${config.value}`} descuento`,
    },
    include: { staff: { select: { id: true, name: true } } },
  })

  return toTransaction(tx)
}

/** Usar cupón (1 uso por cliente por defecto) */
export async function useCoupon(body: unknown, staffId?: number): Promise<LoyaltyTransaction> {
  const parsed = couponUseSchema.safeParse(body)
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")

  const { cardId, notes } = parsed.data
  const card = await getActiveCard(cardId)
  if (card.program.type !== "COUPON") throw new Error("Esta tarjeta no es de cupón")

  const config = parseProgramConfig(card.program.type, card.program.config)
  if (config.type !== "COUPON") throw new Error("Configuración inválida")

  const existing = await prisma.loyaltyCouponUse.findUnique({
    where: {
      programId_customerId: {
        programId: card.programId,
        customerId: card.customerId,
      },
    },
  })

  const usedCount = existing?.usedCount ?? 0
  if (usedCount >= config.usesPerCustomer) {
    throw new Error("Este cliente ya usó el cupón el máximo de veces")
  }

  const [tx] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        cardId,
        staffId: staffId ?? null,
        type: "COUPON_USE",
        amount: config.discount,
        notes: notes ?? `Cupón ${config.code}`,
      },
      include: { staff: { select: { id: true, name: true } } },
    }),
    prisma.loyaltyCouponUse.upsert({
      where: {
        programId_customerId: {
          programId: card.programId,
          customerId: card.customerId,
        },
      },
      create: {
        programId: card.programId,
        customerId: card.customerId,
        usedCount: 1,
      },
      update: { usedCount: usedCount + 1 },
    }),
  ])

  return toTransaction(tx)
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
