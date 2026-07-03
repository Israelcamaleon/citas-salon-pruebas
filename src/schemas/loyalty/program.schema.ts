import { z } from "zod"
import { LOYALTY_PROGRAM_TYPES_V1 } from "@/lib/loyalty"

export const createLoyaltyProgramSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["STAMP", "SERVICE", "DISCOUNT", "GIFT", "COUPON", "PREPAID", "CASHBACK"]),
  config: z.record(z.unknown()),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
}).refine(
  (data) => (LOYALTY_PROGRAM_TYPES_V1 as readonly string[]).includes(data.type),
  { message: "Solo STAMP y SERVICE están disponibles en V1", path: ["type"] }
)

export const updateLoyaltyProgramSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  config: z.record(z.unknown()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
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

export const publicLookupSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().min(1).max(120).optional(),
})
