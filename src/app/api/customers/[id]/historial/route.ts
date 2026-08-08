import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-auth"
import * as fichaService from "@/services/ficha.service"

/** POST /api/customers/:id/historial → agrega servicio al historial */
export const POST = withAuth(async (req, ctx) => {
  const { id: raw } = await ctx.params
  const id = Number(raw)
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const body = await req.json()
  const record = await fichaService.addRecord(id, body)
  return NextResponse.json(record, { status: 201 })
}, { permission: "manageCustomers" })
