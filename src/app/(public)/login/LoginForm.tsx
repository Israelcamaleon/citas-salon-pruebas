'use client'

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createSupabaseBrowser } from "@/lib/supabase/client"

export default function LoginForm() {
  const router = useRouter()
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

      router.push(next)
      router.refresh()
    } catch {
      setError("No se pudo iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-semibold mb-6 text-center">Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-6 bg-white">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-md py-2 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  )
}
