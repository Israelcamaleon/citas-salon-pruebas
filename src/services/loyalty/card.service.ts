import { prisma } from "@/lib/prisma"
import { parseProgramConfig, type ServiceConfig } from "@/schemas/loyalty/program-config.schema"
import { issueCardSchema } from "@/schemas/loyalty/program.schema"
import type { LoyaltyCard } from "@/types/loyalty"
import type { LoyaltyCardStatus, LoyaltyProgramType } from "@prisma/client"

function toCard(row: {
  id: number
  balance: number
  status: LoyaltyCardStatus
  serviceUsage: unknown
  issuedAt: Date
  updatedAt: Date
  customerId: number
  programId: number
  customer?: { id: number; name: string; phone: string | null }
  program?: { id: number; name: string; type: string; config: unknown; color: string }
}): LoyaltyCard {
  return {
    id: row.id,
    balance: row.balance,
    status: row.status,
    serviceUsage: (row.serviceUsage as Record<string, number> | null) ?? null,
    issuedAt: row.issuedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customerId: row.customerId,
    programId: row.programId,
    customer: row.customer,
    program: row.program
      ? {
          id: row.program.id,
          name: row.program.name,
          type: row.program.type as LoyaltyProgramType,
          config: parseProgramConfig(row.program.type, row.program.config),
          color: row.program.color,
        }
      : undefined,
  }
}

const cardInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  program: { select: { id: true, name: true, type: true, config: true, color: true } },
} as const

export async function listCardsByCustomer(customerId: number): Promise<LoyaltyCard[]> {
  const rows = await prisma.loyaltyCard.findMany({
    where: { customerId },
    include: cardInclude,
    orderBy: { issuedAt: "desc" },
  })
  return rows.map(toCard)
}

export async function getCard(id: number): Promise<LoyaltyCard | null> {
  const row = await prisma.loyaltyCard.findUnique({
    where: { id },
    include: cardInclude,
  })
  return row ? toCard(row) : null
}

export async function issueCard(body: unknown): Promise<LoyaltyCard> {
  const parsed = issueCardSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const { customerId, programId } = parsed.data

  const [customer, program] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.loyaltyProgram.findUnique({ where: { id: programId } }),
  ])

  if (!customer) throw new Error("Cliente no encontrado")
  if (!program || !program.active) throw new Error("Programa no encontrado o inactivo")

  const existing = await prisma.loyaltyCard.findUnique({
    where: { customerId_programId: { customerId, programId } },
  })
  if (existing) throw new Error("El cliente ya tiene una tarjeta de este programa")

  const config = parseProgramConfig(program.type, program.config, { v1Only: true })

  let balance = 0
  let serviceUsage: Record<string, number> | undefined

  if (config.type === "STAMP") {
    balance = config.welcomeStamps
  } else if (config.type === "SERVICE") {
    serviceUsage = Object.fromEntries(
      config.services.map((s) => [s.name, 0])
    )
  }

  const row = await prisma.loyaltyCard.create({
    data: {
      customerId,
      programId,
      balance,
      serviceUsage: serviceUsage ?? undefined,
    },
    include: cardInclude,
  })
  return toCard(row)
}

export async function listActiveCardsForPhone(phone: string): Promise<LoyaltyCard[]> {
  const rows = await prisma.loyaltyCard.findMany({
    where: {
      status: "ACTIVE",
      customer: { phone },
    },
    include: cardInclude,
    orderBy: { issuedAt: "desc" },
  })
  return rows.map(toCard)
}

/** Inicializa serviceUsage vacío para tarjetas SERVICE */
export function buildInitialServiceUsage(config: ServiceConfig): Record<string, number> {
  return Object.fromEntries(config.services.map((s) => [s.name, 0]))
}
