export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-auth"
import * as staffService from "@/services/staff.service"

function parseId(raw: string | undefined) {
  const id = Number(raw)
  return isNaN(id) ? null : id
}

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id: raw } = await params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const row = await staffService.getStaff(id)
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(row)
}

export const PATCH = withAuth(async (req, { params }, actor) => {
  const { id: raw } = await params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const body = await req.json()
  const updated = await staffService.updateStaff(id, body, actor.id)
  return NextResponse.json(updated)
}, { permission: "manageStaff" })

export const DELETE = withAuth(async (_req, { params }, actor) => {
  const { id: raw } = await params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  await staffService.deleteStaff(id, actor.id)
  return NextResponse.json({ ok: true })
}, { permission: "manageStaff" })
