/** Loyalty submodule — feature flag and guards */

export const LOYALTY_PROGRAM_TYPES_V1 = [
  "STAMP",
  "SERVICE",
  "GIFT",
  "DISCOUNT",
  "COUPON",
  "PREPAID",
  "CASHBACK",
] as const

export type LoyaltyProgramTypeV1 = (typeof LOYALTY_PROGRAM_TYPES_V1)[number]

export const LOYALTY_TYPE_LABELS: Record<string, string> = {
  STAMP: "Sellos",
  SERVICE: "Prepago servicios",
  GIFT: "Tarjeta regalo",
  DISCOUNT: "Descuento",
  COUPON: "Cupón",
  PREPAID: "Prepago saldo",
  CASHBACK: "Cashback",
}

export const LOYALTY_TYPE_ICONS: Record<string, string> = {
  STAMP: "🎫",
  SERVICE: "📋",
  GIFT: "🎁",
  DISCOUNT: "🏷️",
  COUPON: "🎟️",
  PREPAID: "💳",
  CASHBACK: "💵",
}

export function isLoyaltyEnabled(): boolean {
  return process.env.LOYALTY_ENABLED === "true"
}

export function assertLoyaltyEnabled(): void {
  if (!isLoyaltyEnabled()) {
    throw new Error("Módulo de lealtad no habilitado")
  }
}

export function isLoyaltyTypeSupportedInV1(type: string): type is LoyaltyProgramTypeV1 {
  return (LOYALTY_PROGRAM_TYPES_V1 as readonly string[]).includes(type)
}

export const LOYALTY_TYPE_COLORS: Record<string, string> = {
  STAMP: "#378ADD",
  SERVICE: "#0f766e",
  GIFT: "#b45309",
  DISCOUNT: "#639922",
  COUPON: "#D4537E",
  PREPAID: "#7F77DD",
  CASHBACK: "#D85A30",
}

/** Tipos con saldo monetario canjeable / recargable */
export const BALANCE_TYPES = ["GIFT", "PREPAID", "CASHBACK"] as const
