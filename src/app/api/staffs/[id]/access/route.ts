export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-auth"
import * as staffService from "@/services/staff.service"

export const POST = withAuth(async (req, { params }) => {
  const { id: raw } = await params
  const id = Number(raw)
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const created = await staffService.createStaffAccess(id, body?.password)
  return NextResponse.json(created, { status: 201 })
}, { permission: "manageStaff" })
