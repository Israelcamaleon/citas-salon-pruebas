import { NextResponse } from "next/server"
import { withLoyaltyAuth } from "@/lib/loyalty-api"
import * as cardService from "@/services/loyalty/card.service"

export const GET = withLoyaltyAuth(async (req) => {
  const customerId = Number(new URL(req.url).searchParams.get("customerId"))
  if (!customerId || Number.isNaN(customerId)) {
    return NextResponse.json({ error: "customerId requerido" }, { status: 400 })
  }
  const cards = await cardService.listCardsByCustomer(customerId)
  return NextResponse.json(cards)
})
