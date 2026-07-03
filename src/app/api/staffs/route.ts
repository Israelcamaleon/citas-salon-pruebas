export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-auth"
import * as staffService from "@/services/staff.service"

export async function GET() {
  const data = await staffService.listStaff()
  return NextResponse.json(data)
}

export const POST = withAuth(async (req) => {
  const body = await req.json()
  const created = await staffService.createStaff(body)
  return NextResponse.json(created, { status: 201 })
}, { permission: "manageStaff" })
