/** Loyalty submodule — feature flag and guards */

export const LOYALTY_PROGRAM_TYPES_V1 = ["STAMP", "SERVICE"] as const

export type LoyaltyProgramTypeV1 = (typeof LOYALTY_PROGRAM_TYPES_V1)[number]

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
