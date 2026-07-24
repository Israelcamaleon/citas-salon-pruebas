'use client'

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { createSupabaseBrowser } from "@/lib/supabase/client"

export default function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(
    () => searchParams.get("error") === "staff"
      ? "Tu cuenta no está vinculada a un colaborador. Contacta al administrador."
      : ""
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createSupabaseBrowser()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError(signInError.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos"
          : signInError.message)
        return
      }

      // Asegura que la sesión quedó persistida en cookies antes de navegar
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        setError("No se pudo guardar la sesión. Intenta de nuevo.")
        return
      }

      // Navegación completa para que el middleware lea las cookies nuevas
      window.location.assign(next)
    } catch {
      setError("No se pudo iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-lh-bg">
      <div className="mb-8 text-center">
        <div className="text-4xl mb-3">☕</div>
        <h1 className="text-2xl font-bold tracking-tight">Glam Schedule</h1>
        <p className="text-sm text-lh-muted mt-1">Acceso del personal</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm card space-y-4 shadow-sm">
        <div>
          <label className="label block mb-1.5" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="tu@negocio.com"
          />
        </div>
        <div>
          <label className="label block mb-1.5" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>
        {error && <p className="text-sm text-lh-danger">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  )
}
