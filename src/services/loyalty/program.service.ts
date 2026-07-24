import { prisma } from "@/lib/prisma"
import { LOYALTY_TYPE_COLORS } from "@/lib/loyalty"
import { parseProgramConfig } from "@/schemas/loyalty/program-config.schema"
import {
  createLoyaltyProgramSchema,
  updateLoyaltyProgramSchema,
} from "@/schemas/loyalty/program.schema"
import type { LoyaltyProgram } from "@/types/loyalty"
import type { LoyaltyProgramType, Prisma } from "@prisma/client"

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null
  const d = new Date(v.includes("T") ? v : `${v}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function toProgram(row: {
  id: number
  name: string
  type: LoyaltyProgramType
  description: string | null
  config: unknown
  color: string
  logoUrl: string | null
  bgUrl: string | null
  active: boolean
  startsAt: Date | null
  endsAt: Date | null
  createdAt: Date
  updatedAt: Date
  _count?: { cards: number }
  redeemCount?: number
}): LoyaltyProgram {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    config: parseProgramConfig(row.type, row.config),
    color: row.color,
    logoUrl: row.logoUrl,
    bgUrl: row.bgUrl,
    active: row.active,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    cardCount: row._count?.cards,
    redeemCount: row.redeemCount,
  }
}

export async function listPrograms(): Promise<LoyaltyProgram[]> {
  const rows = await prisma.loyaltyProgram.findMany({
    orderBy: { id: "desc" },
    include: {
      _count: { select: { cards: true } },
    },
  })

  const redeemGroups = await prisma.loyaltyTransaction.groupBy({
    by: ["cardId"],
    where: {
      type: { in: ["REDEEM", "SERVICE_USE", "COUPON_USE", "CASHBACK_REDEEM", "DISCOUNT_APPLY"] },
    },
    _count: { _all: true },
  })

  const cardIds = redeemGroups.map((g) => g.cardId as number)
  const cards = cardIds.length
    ? await prisma.loyaltyCard.findMany({
        where: { id: { in: cardIds } },
        select: { id: true, programId: true },
      })
    : []
  const cardToProgram = new Map<number, number>(cards.map((c) => [c.id, c.programId]))
  const redeemByProgram = new Map<number, number>()
  for (const g of redeemGroups) {
    const pid = cardToProgram.get(g.cardId as number)
    if (pid == null) continue
    const count = Number(g._count._all)
    redeemByProgram.set(pid, (redeemByProgram.get(pid) ?? 0) + count)
  }

  const programs: LoyaltyProgram[] = []
  for (const row of rows) {
    try {
      programs.push(toProgram({ ...row, redeemCount: redeemByProgram.get(row.id) ?? 0 }))
    } catch (e) {
      console.error(`Programa ${row.id} con config inválida:`, e)
    }
  }
  return programs
}

export async function getProgram(id: number): Promise<LoyaltyProgram | null> {
  const row = await prisma.loyaltyProgram.findUnique({
    where: { id },
    include: { _count: { select: { cards: true } } },
  })
  return row ? toProgram(row) : null
}

export async function createProgram(body: unknown): Promise<LoyaltyProgram> {
  const parsed = createLoyaltyProgramSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const { name, type, description, config, color, logoUrl, bgUrl, active, startsAt, endsAt } =
    parsed.data
  const validatedConfig = parseProgramConfig(type, config)

  const row = await prisma.loyaltyProgram.create({
    data: {
      name,
      type: type as LoyaltyProgramType,
      description: description?.trim() || null,
      config: validatedConfig as Prisma.InputJsonValue,
      color: color ?? LOYALTY_TYPE_COLORS[type] ?? "#378ADD",
      logoUrl: logoUrl || null,
      bgUrl: bgUrl || null,
      active: active ?? true,
      startsAt: parseDate(startsAt),
      endsAt: parseDate(endsAt),
    },
    include: { _count: { select: { cards: true } } },
  })
  return toProgram(row)
}

export async function updateProgram(id: number, body: unknown): Promise<LoyaltyProgram> {
  const parsed = updateLoyaltyProgramSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const existing = await prisma.loyaltyProgram.findUnique({ where: { id } })
  if (!existing) throw new Error("Programa no encontrado")

  const data: Prisma.LoyaltyProgramUpdateInput = {}

  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.description !== undefined) {
    data.description = parsed.data.description?.trim() || null
  }
  if (parsed.data.color !== undefined) data.color = parsed.data.color
  if (parsed.data.logoUrl !== undefined) data.logoUrl = parsed.data.logoUrl || null
  if (parsed.data.bgUrl !== undefined) data.bgUrl = parsed.data.bgUrl || null
  if (parsed.data.active !== undefined) data.active = parsed.data.active
  if (parsed.data.startsAt !== undefined) data.startsAt = parseDate(parsed.data.startsAt)
  if (parsed.data.endsAt !== undefined) data.endsAt = parseDate(parsed.data.endsAt)
  if (parsed.data.config !== undefined) {
    const validatedConfig = parseProgramConfig(existing.type, parsed.data.config)
    data.config = validatedConfig as Prisma.InputJsonValue
  }

  try {
    const row = await prisma.loyaltyProgram.update({
      where: { id },
      data,
      include: { _count: { select: { cards: true } } },
    })
    return toProgram(row)
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "P2025") throw new Error("Programa no encontrado")
    throw e
  }
}

export async function deleteProgram(id: number): Promise<void> {
  const existing = await prisma.loyaltyProgram.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) throw new Error("Programa no encontrado")

  const cards = await prisma.loyaltyCard.findMany({
    where: { programId: id },
    select: { id: true },
  })
  const cardIds = cards.map((c) => c.id)

  await prisma.$transaction(async (tx) => {
    if (cardIds.length > 0) {
      await tx.loyaltyTransaction.deleteMany({ where: { cardId: { in: cardIds } } })
      await tx.loyaltyCard.deleteMany({ where: { programId: id } })
    }
    await tx.loyaltyCouponUse.deleteMany({ where: { programId: id } })
    await tx.loyaltyProgram.delete({ where: { id } })
  })
}
