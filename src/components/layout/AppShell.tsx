'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import useSWR from "swr"
import { createSupabaseBrowser } from "@/lib/supabase/client"
import BrandBar from "@/components/layout/BrandBar"

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
  const { data: me, mutate, error: meError } = useSWR("/api/auth/me", fetcher, {
    shouldRetryOnError: false,
  })

  useEffect(() => {
    // Sesión perdida en cliente: volver a login en lugar de romper la UI
    if (meError || me === null) {
      const t = setTimeout(() => {
        if (pathname !== "/login") {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`)
          router.refresh()
        }
      }, 50)
      return () => clearTimeout(t)
    }
  }, [me, meError, pathname, router])

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "📊", section: "General" },
    ...(loyaltyEnabled
      ? [{ href: "/loyalty", label: "Lealtad", icon: "🎫", section: "General" } as NavItem]
      : []),
    { href: "/ajustes", label: "Ajustes", icon: "⚙️", section: "Sistema" },
  ]

  async function handleLogout() {
    try {
      const supabase = createSupabaseBrowser()
      await supabase.auth.signOut()
    } catch {
      // ignore
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

  return (
    <div className="flex h-screen overflow-hidden bg-lh-bg">
      <aside className="w-[220px] flex-shrink-0 bg-lh-sidebar flex flex-col overflow-y-auto">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="text-white text-[17px] font-bold leading-tight truncate">
            {me?.staff ? "Glam Schedule" : "…"}
          </div>
          <p className="text-lh-sidebar-text text-[11px] mt-0.5">Panel de administración</p>
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
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-lh-card border-b border-lh-border px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <BrandBar compact />
          <div className="text-xs text-lh-muted hidden sm:block">
            {me?.staff?.email}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
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
