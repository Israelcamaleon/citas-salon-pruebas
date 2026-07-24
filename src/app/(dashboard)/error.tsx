'use client'

function clearAuthCookies() {
  if (typeof document === "undefined") return
  const cookies = document.cookie.split(";")
  for (const c of cookies) {
    const name = c.split("=")[0]?.trim()
    if (!name) continue
    if (name.startsWith("sb-") || name.includes("auth-token")) {
      document.cookie = `${name}=; Max-Age=0; path=/`
    }
  }
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-lg font-semibold">Algo falló al cargar esta pantalla</h2>
      <p className="text-sm text-neutral-600 max-w-lg break-words">
        {error?.message || "Error desconocido"}
      </p>
      {error?.digest && (
        <p className="text-xs text-neutral-400">Código: {error.digest}</p>
      )}
      {process.env.NODE_ENV === "development" && error?.stack && (
        <pre className="text-left text-[10px] max-w-full overflow-auto bg-neutral-100 p-3 rounded max-h-40">
          {error.stack}
        </pre>
      )}
      <div className="flex flex-wrap gap-2 justify-center">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Reintentar
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            clearAuthCookies()
            window.location.href = "/login"
          }}
        >
          Limpiar sesión e ir al login
        </button>
      </div>
    </div>
  )
}
