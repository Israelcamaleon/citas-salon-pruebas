import { z } from "zod"
import { LOYALTY_PROGRAM_TYPES_V1 } from "@/lib/loyalty"

const optionalDate = z.string().optional().nullable()

export const createLoyaltyProgramSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["STAMP", "SERVICE", "DISCOUNT", "GIFT", "COUPON", "PREPAID", "CASHBACK"]),
  description: z.string().max(500).optional().nullable(),
  config: z.record(z.unknown()),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().optional().nullable(),
  bgUrl: z.string().optional().nullable(),
  active: z.boolean().optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
}).refine(
  (data) => (LOYALTY_PROGRAM_TYPES_V1 as readonly string[]).includes(data.type),
  { message: "Tipo de programa no válido", path: ["type"] }
)

export const updateLoyaltyProgramSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  config: z.record(z.unknown()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().optional().nullable(),
  bgUrl: z.string().optional().nullable(),
  active: z.boolean().optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
})

export const issueCardSchema = z.object({
  customerId: z.number().int().positive(),
  programId: z.number().int().positive(),
})

export const stampSchema = z.object({
  cardId: z.number().int().positive(),
  amount: z.number().int().min(1).max(10).default(1),
  notes: z.string().max(200).optional(),
})

export const serviceUseSchema = z.object({
  cardId: z.number().int().positive(),
  serviceName: z.string().min(1).max(80),
  notes: z.string().max(200).optional(),
})

export const redeemSchema = z.object({
  cardId: z.number().int().positive(),
  amount: z.number().positive(),
  notes: z.string().max(200).optional(),
})

export const loadSchema = z.object({
  cardId: z.number().int().positive(),
  amount: z.number().positive(),
  notes: z.string().max(200).optional(),
})

export const cashbackSchema = z.object({
  cardId: z.number().int().positive(),
  purchaseAmt: z.number().positive(),
  notes: z.string().max(200).optional(),
})

export const discountApplySchema = z.object({
  cardId: z.number().int().positive(),
  purchaseAmt: z.number().min(0).optional(),
  notes: z.string().max(200).optional(),
})

export const couponUseSchema = z.object({
  cardId: z.number().int().positive(),
  notes: z.string().max(200).optional(),
})

export const publicLookupSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().min(1).max(120).optional(),
})
