import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-auth"
import * as fichaService from "@/services/ficha.service"

/** PUT /api/customers/:id/historial/:recordId → edita un servicio */
export const PUT = withAuth(async (req, ctx) => {
  const params = (await ctx.params) as { id: string; recordId: string }
  const recordId = Number(params.recordId)
  if (isNaN(recordId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const body = await req.json()
  const record = await fichaService.updateRecord(recordId, body)
  return NextResponse.json(record)
}, { permission: "manageCustomers" })

/** DELETE /api/customers/:id/historial/:recordId → elimina un servicio */
export const DELETE = withAuth(async (_req, ctx) => {
  const params = (await ctx.params) as { id: string; recordId: string }
  const recordId = Number(params.recordId)
  if (isNaN(recordId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const result = await fichaService.deleteRecord(recordId)
  return NextResponse.json(result)
}, { permission: "manageCustomers" })
