import { NextResponse } from "next/server"
import { withLoyaltyAuth } from "@/lib/loyalty-api"
import * as programService from "@/services/loyalty/program.service"

export const GET = withLoyaltyAuth(async () => {
  const programs = await programService.listPrograms()
  return NextResponse.json(programs)
})

export const POST = withLoyaltyAuth(async (req) => {
  const body = await req.json()
  const program = await programService.createProgram(body)
  return NextResponse.json(program, { status: 201 })
}, { permission: "manageLoyalty" })
