import { NextResponse } from "next/server"
import { withLoyaltyAuth } from "@/lib/loyalty-api"
import * as transactionService from "@/services/loyalty/transaction.service"

export const POST = withLoyaltyAuth(async (req, _ctx, staff) => {
  const body = await req.json()
  const tx = await transactionService.stampCard(body, staff.id)
  return NextResponse.json(tx, { status: 201 })
}, { permission: "stampCards" })
