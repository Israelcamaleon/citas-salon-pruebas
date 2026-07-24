import { NextResponse, type NextRequest } from "next/server"
import {
  createSupabaseMiddleware,
  isProtectedPage,
  requiresApiAuth,
} from "@/lib/supabase/middleware"

/** Copia cookies del response de Supabase (refresh de sesión) a otra respuesta. */
function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value)
  })
  return to
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddleware(request)
  const { pathname } = request.nextUrl
  const method = request.method

  const { data: { user } } = await supabase.auth.getUser()

  if (isProtectedPage(pathname) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", pathname)
    return copyCookies(response, NextResponse.redirect(loginUrl))
  }

  if ((pathname === "/" || pathname === "/book") && !user) {
    return copyCookies(response, NextResponse.redirect(new URL("/login", request.url)))
  }

  if (pathname === "/" && user) {
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard", request.url)))
  }

  if (pathname === "/book" && user) {
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard", request.url)))
  }

  if (pathname === "/login" && user) {
    const next = request.nextUrl.searchParams.get("next") || "/dashboard"
    return copyCookies(response, NextResponse.redirect(new URL(next, request.url)))
  }

  if (requiresApiAuth(pathname, method) && !user) {
    return copyCookies(
      response,
      NextResponse.json({ error: "No autorizado" }, { status: 401 })
    )
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
