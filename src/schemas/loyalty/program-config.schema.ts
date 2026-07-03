import { z } from "zod"

/** STAMP — sellos por visita */
export const stampConfigSchema = z.object({
  type: z.literal("STAMP"),
  stampsNeeded: z.number().int().min(1).max(50),
  welcomeStamps: z.number().int().min(0).max(20).default(0),
  rewards: z.record(z.string(), z.string()).optional(),
})

/** SERVICE — paquetes prepagados de servicios */
export const serviceItemSchema = z.object({
  name: z.string().min(1).max(80),
  total: z.number().int().min(1).max(100),
  icon: z.string().max(8).optional(),
})

export const serviceConfigSchema = z.object({
  type: z.literal("SERVICE"),
  services: z.array(serviceItemSchema).min(1).max(20),
  price: z.number().int().min(0).optional(),
})

/** Placeholders V2 — validación lista para activar sin cambios de schema */
export const discountConfigSchema = z.object({
  type: z.literal("DISCOUNT"),
  discountType: z.enum(["percent", "fixed"]),
  value: z.number().min(0),
  minPurchase: z.number().int().min(0).optional(),
})

export const giftConfigSchema = z.object({
  type: z.literal("GIFT"),
  initialBalance: z.number().int().min(0),
  rechargeable: z.boolean().default(false),
  message: z.string().max(200).optional(),
  image: z.string().url().optional(),
})

export const couponConfigSchema = z.object({
  type: z.literal("COUPON"),
  code: z.string().min(1).max(32),
  discount: z.number().min(0),
  maxUses: z.number().int().min(1).optional(),
  usesPerCustomer: z.number().int().min(1).default(1),
  validDays: z.number().int().min(1).optional(),
})

export const prepaidConfigSchema = z.object({
  type: z.literal("PREPAID"),
  minLoad: z.number().int().min(0),
  bonusPercent: z.number().min(0).max(100).default(0),
  maxBalance: z.number().int().min(0).optional(),
})

export const cashbackConfigSchema = z.object({
  type: z.literal("CASHBACK"),
  percent: z.number().min(0).max(100),
  minPurchase: z.number().int().min(0).optional(),
  maxPerTx: z.number().int().min(0).optional(),
})

export const programConfigSchema = z.discriminatedUnion("type", [
  stampConfigSchema,
  serviceConfigSchema,
  discountConfigSchema,
  giftConfigSchema,
  couponConfigSchema,
  prepaidConfigSchema,
  cashbackConfigSchema,
])

export type StampConfig = z.infer<typeof stampConfigSchema>
export type ServiceConfig = z.infer<typeof serviceConfigSchema>
export type ProgramConfig = z.infer<typeof programConfigSchema>

/** Valida config según tipo; V1 solo permite STAMP y SERVICE en creación */
export function parseProgramConfig(
  programType: string,
  config: unknown,
  options?: { v1Only?: boolean }
): ProgramConfig {
  const parsed = programConfigSchema.safeParse({ ...(config as object), type: programType })
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Configuración de programa inválida")
  }
  if (options?.v1Only && !["STAMP", "SERVICE"].includes(parsed.data.type)) {
    throw new Error(`Tipo ${programType} no disponible en esta versión`)
  }
  return parsed.data
}
