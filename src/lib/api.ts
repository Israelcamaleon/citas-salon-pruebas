import axios from "axios"

/** SWR fetcher: solo resuelve JSON de respuestas OK; si no, lanza (SWR marca error). */
export async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "same-origin" })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Error ${res.status}`
    throw new Error(msg)
  }
  return data
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/**
 * Mensaje legible a partir de un error de axios/fetch.
 * El servidor ya envía textos en español, así que se prefieren tal cual;
 * los casos de sesión se refuerzan porque requieren una acción del usuario.
 */
export function describeApiError(err: unknown, fallback = "Ocurrió un error"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown; code?: unknown } | undefined
    const serverMsg = data?.error ? String(data.error) : ""

    if (data?.code === "NO_SESSION") {
      return `${serverMsg || "Tu sesión expiró."} Recarga la página para volver a entrar.`
    }
    if (serverMsg) return serverMsg
    if (err.response?.status === 401) return "No autorizado. Vuelve a iniciar sesión."
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
