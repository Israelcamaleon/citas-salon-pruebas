export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth"

export async function GET() {
  const ctx = await getAuthContext()

  if (!ctx?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  return NextResponse.json({
    user: { id: ctx.user.id, email: ctx.user.email },
    staff: ctx.staff
      ? {
          id: ctx.staff.id,
          name: ctx.staff.name,
          email: ctx.staff.email,
          role: ctx.staff.role.name,
        }
      : null,
    permissions: ctx.permissions,
  })
}
