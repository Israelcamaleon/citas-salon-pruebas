import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-auth"
import * as fichaService from "@/services/ficha.service"

function parseId(raw: string | undefined) {
  const id = Number(raw)
  return isNaN(id) ? null : id
}

/** GET /api/customers/:id/ficha → cliente + ficha + historial + visitas */
export const GET = withAuth(async (_req, ctx) => {
  const { id: raw } = await ctx.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const data = await fichaService.getFichaCompleta(id)
  return NextResponse.json(data)
}, { permission: "manageCustomers" })

/** PUT /api/customers/:id/ficha → crea/actualiza datos fijos de la ficha */
export const PUT = withAuth(async (req, ctx) => {
  const { id: raw } = await ctx.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const body = await req.json()
  const ficha = await fichaService.upsertFicha(id, body)
  return NextResponse.json(ficha)
}, { permission: "manageCustomers" })
