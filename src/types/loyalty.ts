import type { LoyaltyCardStatus, LoyaltyProgramType, LoyaltyTransactionType } from "@prisma/client"
import type { ProgramConfig } from "@/schemas/loyalty/program-config.schema"

export type LoyaltyProgram = {
  id: number
  name: string
  type: LoyaltyProgramType
  description: string | null
  config: ProgramConfig
  color: string
  logoUrl: string | null
  bgUrl: string | null
  active: boolean
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
  cardCount?: number
  redeemCount?: number
}

export type LoyaltyCard = {
  id: number
  balance: number
  status: LoyaltyCardStatus
  serviceUsage: Record<string, number> | null
  issuedAt: string
  updatedAt: string
  customerId: number
  programId: number
  customer?: { id: number; name: string; phone: string | null }
  program?: Pick<LoyaltyProgram, "id" | "name" | "type" | "config" | "color" | "description" | "logoUrl" | "bgUrl">
}

export type LoyaltyTransaction = {
  id: number
  type: LoyaltyTransactionType
  amount: number
  purchaseAmt: number | null
  notes: string | null
  createdAt: string
  cardId: number
  staffId: number | null
  staff?: { id: number; name: string } | null
}

export type LoyaltySummary = {
  totalPrograms: number
  activeCards: number
  totalCustomers: number
  recentTransactions: LoyaltyTransaction[]
}
