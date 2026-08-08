'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { createSupabaseBrowser } from "@/lib/supabase/client"
import BrandBar from "@/components/layout/BrandBar"
import { ToastHost } from "@/lib/toast"

const fetcher = (url: string) =>
  fetch(url, { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null))

type NavItem = { href: string; label: string; icon: string; section?: string }

type Props = {
  children: React.ReactNode
  loyaltyEnabled: boolean
}

export default function AppShell({ children, loyaltyEnabled }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const redirected = useRef(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { data: me, mutate, isLoading } = useSWR("/api/auth/me", fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  })

  useEffect(() => {
    // Solo redirigir cuando ya terminó la carga y no hay sesión
    if (isLoading || redirected.current) return
    if (me === null) {
      redirected.current = true
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [me, isLoading, pathname, router])

  // Cerrar el menú móvil al navegar
  useEffect(() => {
    setMenuAbierto(false)
  }, [pathname])

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Inicio", icon: "🏠", section: "General" },
    ...(loyaltyEnabled
      ? [{ href: "/loyalty", label: "Lealtad", icon: "🎫", section: "General" } as NavItem]
      : []),
    { href: "/ajustes", label: "Ajustes", icon: "⚙️", section: "Configuración" },
  ]

  async function handleLogout() {
    try {
      const supabase = createSupabaseBrowser()
      await supabase.auth.signOut()
    } catch {
      // ignore — igual limpiamos UI
    }
    await mutate(null, false)
    router.push("/login")
    router.refresh()
  }

  const initials =
    me?.staff?.name
      ?.split(" ")
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "—"

  const navContent = (
    <>
      <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-white text-[17px] font-bold leading-tight truncate">
            {me?.staff ? "Glam Schedule" : "…"}
          </div>
          <p className="text-lh-sidebar-text text-[11px] mt-0.5">Panel del salón</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuAbierto(false)}
          className="md:hidden text-lh-sidebar-text text-xl leading-none px-2"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      <nav className="flex-1 py-2">
        {groupNav(nav).map((group) => (
          <div key={group.section}>
            <div className="text-[10px] font-semibold text-white/30 px-[18px] pt-3.5 pb-1.5 tracking-wider uppercase">
              {group.section}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-[18px] py-2.5 text-[13px] border-l-[3px] transition-all ${
                    active
                      ? "bg-[rgba(55,138,221,0.15)] text-white border-lh-accent"
                      : "text-lh-sidebar-text border-transparent hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-sm w-5 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-lh-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-xs font-semibold truncate">
              {me?.staff?.name || "…"}
            </div>
            <div className="text-lh-sidebar-text text-[11px] truncate">
              {me?.staff?.role || ""}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-[11px] text-lh-sidebar-text hover:text-white"
            title="Salir"
          >
            Salir
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-lh-bg">
      {/* Menú lateral — solo escritorio */}
      <aside className="hidden md:flex w-[220px] flex-shrink-0 bg-lh-sidebar flex-col overflow-y-auto">
        {navContent}
      </aside>

      {/* Menú deslizable — solo celular */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuAbierto(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[260px] max-w-[80vw] bg-lh-sidebar flex flex-col overflow-y-auto">
            {navContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-lh-card border-b border-lh-border px-3 md:px-6 py-3 md:py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              className="md:hidden text-xl leading-none px-1.5 py-1"
              aria-label="Abrir menú"
            >
              ☰
            </button>
            <BrandBar compact />
          </div>
          <div className="text-xs text-lh-muted hidden sm:block">
            {me?.staff?.email}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 md:p-6">{children}</main>
      </div>
      <ToastHost />
    </div>
  )
}

function groupNav(items: NavItem[]) {
  const map = new Map<string, NavItem[]>()
  for (const item of items) {
    const s = item.section || "General"
    if (!map.has(s)) map.set(s, [])
    map.get(s)!.push(item)
  }
  return Array.from(map.entries()).map(([section, items]) => ({ section, items }))
}
