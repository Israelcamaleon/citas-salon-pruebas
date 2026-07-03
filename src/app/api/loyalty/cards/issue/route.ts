import { NextResponse } from "next/server"
import { withLoyaltyAuth } from "@/lib/loyalty-api"
import * as cardService from "@/services/loyalty/card.service"

export const POST = withLoyaltyAuth(async (req) => {
  const body = await req.json()
  const card = await cardService.issueCard(body)
  return NextResponse.json(card, { status: 201 })
}, { permission: "manageLoyalty" })
