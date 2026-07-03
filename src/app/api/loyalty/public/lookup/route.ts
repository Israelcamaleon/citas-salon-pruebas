import { NextResponse } from "next/server"
import { withLoyaltyGuard } from "@/lib/loyalty-api"
import * as lookupService from "@/services/loyalty/customer-lookup.service"

export const POST = withLoyaltyGuard(async (req: Request) => {
  try {
    const body = await req.json()
    const result = await lookupService.lookupOrCreateCustomer(body)
    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
