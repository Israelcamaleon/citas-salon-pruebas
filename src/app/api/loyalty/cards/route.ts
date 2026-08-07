import { NextResponse } from "next/server"
import { withLoyaltyAuth } from "@/lib/loyalty-api"
import * as cardService from "@/services/loyalty/card.service"

export const GET = withLoyaltyAuth(async (req) => {
  const params = new URL(req.url).searchParams
  const customerId = Number(params.get("customerId"))

  // Sin customerId: lista completa para el panel (con filtros opcionales)
  if (!customerId || Number.isNaN(customerId)) {
    const cards = await cardService.listAllCards({
      status: params.get("status") ?? undefined,
      q: params.get("q") ?? undefined,
    })
    return NextResponse.json(cards)
  }

  const cards = await cardService.listCardsByCustomer(customerId)
  return NextResponse.json(cards)
})
