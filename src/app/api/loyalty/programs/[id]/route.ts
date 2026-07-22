import { NextResponse } from "next/server"
import { withLoyaltyAuth } from "@/lib/loyalty-api"
import * as programService from "@/services/loyalty/program.service"

type Params = { params: Promise<{ id: string }> }

export const GET = withLoyaltyAuth(async (_req, { params }: Params) => {
  const { id } = await params
  const program = await programService.getProgram(Number(id))
  if (!program) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(program)
})

export const PUT = withLoyaltyAuth(async (req, { params }: Params) => {
  const { id } = await params
  const body = await req.json()
  const program = await programService.updateProgram(Number(id), body)
  return NextResponse.json(program)
}, { permission: "manageLoyalty" })

export const DELETE = withLoyaltyAuth(async (_req, { params }: Params) => {
  const { id } = await params
  try {
    await programService.deleteProgram(Number(id))
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo eliminar"
    const status = msg === "Programa no encontrado" ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}, { permission: "manageLoyalty" })
