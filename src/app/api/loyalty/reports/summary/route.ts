import { NextResponse } from "next/server"
import { withLoyaltyAuth } from "@/lib/loyalty-api"
import * as transactionService from "@/services/loyalty/transaction.service"

export const GET = withLoyaltyAuth(async () => {
  const summary = await transactionService.getSummary()
  return NextResponse.json(summary)
})
