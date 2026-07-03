import { NextResponse } from "next/server"
import { isLoyaltyEnabled } from "@/lib/loyalty"
import { withAuth } from "@/lib/api-auth"
import type { Staff } from "@prisma/client"

export function loyaltyDisabledResponse() {
  return NextResponse.json(
    { error: "Módulo de lealtad no habilitado" },
    { status: 404 }
  )
}

export function withLoyaltyGuard<T extends (...args: never[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    if (!isLoyaltyEnabled()) return loyaltyDisabledResponse()
    return handler(...args)
  }) as T
}

type RouteContext = { params: Promise<Record<string, string>> }

type LoyaltyHandler = (
  req: Request,
  ctx: RouteContext,
  staff: Staff
) => Promise<Response>

export function withLoyaltyAuth(
  handler: LoyaltyHandler,
  options?: { permission?: string }
) {
  return withLoyaltyGuard(withAuth(handler, options))
}
