'use client'

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
      <p className="text-sm text-neutral-600 max-w-md break-words">
        {error?.message || "Error desconocido"}
      </p>
      {error?.digest && (
        <p className="text-xs text-neutral-400">Código: {error.digest}</p>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Reintentar
        </button>
        <a className="btn" href="/login">
          Ir al login
        </a>
      </div>
    </div>
  )
}
