import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export function createSupabaseMiddleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  return { supabase, response }
}

const PROTECTED_PAGES = ["/dashboard", "/ajustes", "/loyalty"]

export function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function isPublicApi(pathname: string, method: string): boolean {
  if (pathname.startsWith("/api/auth/")) return true

  if (pathname === "/api/loyalty/public/lookup" && method === "POST") return true

  if (method === "GET") {
    if (pathname === "/api/services") return true
    if (pathname === "/api/staffs") return true
    if (pathname === "/api/locations") return true
    if (pathname === "/api/customers") return true
    if (/^\/api\/locations\/\d+\/schedule$/.test(pathname)) return true
  }

  if (method === "POST") {
    if (pathname === "/api/bookings") return true
    if (pathname === "/api/customers") return true
  }

  return false
}

/** API bajo /api/ que requiere sesión (evalúa método HTTP) */
export function requiresApiAuth(pathname: string, method: string): boolean {
  if (!pathname.startsWith("/api/")) return false
  return !isPublicApi(pathname, method)
}
