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
  { message: "Tipo de programa no válido", path: ["type"] }
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

/** Canjear saldo (gift / prepaid / cashback) */
export const redeemSchema = z.object({
  cardId: z.number().int().positive(),
  amount: z.number().positive(),
  notes: z.string().max(200).optional(),
})

/** Recargar prepago o gift recargable */
export const loadSchema = z.object({
  cardId: z.number().int().positive(),
  amount: z.number().positive(),
  notes: z.string().max(200).optional(),
})

/** Registrar compra con cashback */
export const cashbackSchema = z.object({
  cardId: z.number().int().positive(),
  purchaseAmt: z.number().positive(),
  notes: z.string().max(200).optional(),
})

/** Aplicar descuento (registro operativo) */
export const discountApplySchema = z.object({
  cardId: z.number().int().positive(),
  purchaseAmt: z.number().min(0).optional(),
  notes: z.string().max(200).optional(),
})

/** Usar cupón */
export const couponUseSchema = z.object({
  cardId: z.number().int().positive(),
  notes: z.string().max(200).optional(),
})

export const publicLookupSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().min(1).max(120).optional(),
})
