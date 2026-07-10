import { prisma } from "@/lib/prisma"
import { LOYALTY_TYPE_COLORS } from "@/lib/loyalty"
import { parseProgramConfig } from "@/schemas/loyalty/program-config.schema"
import {
  createLoyaltyProgramSchema,
  updateLoyaltyProgramSchema,
} from "@/schemas/loyalty/program.schema"
import type { LoyaltyProgram } from "@/types/loyalty"
import type { LoyaltyProgramType, Prisma } from "@prisma/client"

function toProgram(row: {
  id: number
  name: string
  type: LoyaltyProgramType
  config: unknown
  color: string
  active: boolean
  startsAt: Date | null
  endsAt: Date | null
  createdAt: Date
  updatedAt: Date
}): LoyaltyProgram {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    config: parseProgramConfig(row.type, row.config),
    color: row.color,
    active: row.active,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listPrograms(): Promise<LoyaltyProgram[]> {
  const rows = await prisma.loyaltyProgram.findMany({ orderBy: { id: "desc" } })
  return rows.map(toProgram)
}

export async function getProgram(id: number): Promise<LoyaltyProgram | null> {
  const row = await prisma.loyaltyProgram.findUnique({ where: { id } })
  return row ? toProgram(row) : null
}

export async function createProgram(body: unknown): Promise<LoyaltyProgram> {
  const parsed = createLoyaltyProgramSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const { name, type, config, color, active, startsAt, endsAt } = parsed.data
  const validatedConfig = parseProgramConfig(type, config)

  const row = await prisma.loyaltyProgram.create({
    data: {
      name,
      type: type as LoyaltyProgramType,
      config: validatedConfig as Prisma.InputJsonValue,
      color: color ?? LOYALTY_TYPE_COLORS[type] ?? "#378ADD",
      active: active ?? true,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
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
  if (parsed.data.color !== undefined) data.color = parsed.data.color
  if (parsed.data.active !== undefined) data.active = parsed.data.active
  if (parsed.data.startsAt !== undefined) {
    data.startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null
  }
  if (parsed.data.endsAt !== undefined) {
    data.endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null
  }
  if (parsed.data.config !== undefined) {
    const validatedConfig = parseProgramConfig(existing.type, parsed.data.config)
    data.config = validatedConfig as Prisma.InputJsonValue
  }

  try {
    const row = await prisma.loyaltyProgram.update({ where: { id }, data })
    return toProgram(row)
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "P2025") throw new Error("Programa no encontrado")
    throw e
  }
}
