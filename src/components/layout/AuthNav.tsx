'use client'

import useSWR from "swr"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createSupabaseBrowser } from "@/lib/supabase/client"
import { isLoyaltyEnabled } from "@/lib/loyalty"

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null))

type Props = { loyaltyEnabled: boolean }

export default function AuthNav({ loyaltyEnabled }: Props) {
  const router = useRouter()
  const { data: me, mutate } = useSWR("/api/auth/me", fetcher)

  async function handleLogout() {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    await mutate(null, false)
    router.push("/login")
    router.refresh()
  }

  if (!me) {
    return (
      <nav className="flex gap-4 items-center">
        <Link href="/book" className="hover:underline text-sm">
          Reservar
        </Link>
        <Link href="/login" className="hover:underline text-sm">
          Iniciar sesión
        </Link>
      </nav>
    )
  }

  if (!me.staff) {
    return (
      <nav className="flex gap-4 items-center">
        <span className="text-sm text-amber-700">Sin acceso de personal</span>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-neutral-600 hover:underline"
        >
          Salir
        </button>
      </nav>
    )
  }

  return (
    <nav className="flex gap-4 items-center">
      <span className="text-sm text-neutral-600 hidden sm:inline">
        {me.staff.name}
      </span>
      <Link href="/dashboard" className="hover:underline text-sm">
        Dashboard
      </Link>
      {loyaltyEnabled && (
        <Link href="/loyalty" className="hover:underline text-sm">
          Lealtad
        </Link>
      )}
      <Link href="/ajustes" className="hover:underline text-sm">
        Ajustes
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="text-sm text-neutral-600 hover:underline"
      >
        Salir
      </button>
    </nav>
  )
}
