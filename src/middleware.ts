import { NextResponse, type NextRequest } from "next/server"
import {
  createSupabaseMiddleware,
  isProtectedPage,
  requiresApiAuth,
} from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddleware(request)
  const { pathname } = request.nextUrl
  const method = request.method

  const { data: { user } } = await supabase.auth.getUser()

  if (isProtectedPage(pathname) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if ((pathname === "/" || pathname === "/book") && !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (pathname === "/" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (pathname === "/book" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (pathname === "/login" && user) {
    const next = request.nextUrl.searchParams.get("next") || "/dashboard"
    return NextResponse.redirect(new URL(next, request.url))
  }

  if (requiresApiAuth(pathname, method) && !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
