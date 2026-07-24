import { NextResponse } from "next/server"
import { AuthError, requirePermission, requireStaff, type StaffWithRole } from "@/lib/auth"

type RouteContext = { params: Promise<Record<string, string>> }

type AuthedHandler = (
  req: Request,
  ctx: RouteContext,
  staff: StaffWithRole
) => Promise<Response>

type AuthOptions = {
  permission?: string
}

export function withAuth(handler: AuthedHandler, options?: AuthOptions) {
  return async (req: Request, ctx: RouteContext) => {
    try {
      const staff = options?.permission
        ? await requirePermission(options.permission)
        : await requireStaff()
      return handler(req, ctx, staff)
    } catch (e: unknown) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message, code: e.code }, { status: e.status })
      }
      const message = e instanceof Error ? e.message : "Error"
      const status = message.toLowerCase().includes("no encontrado") ? 404 : 400
      return NextResponse.json({ error: message }, { status })
    }
  }
}
