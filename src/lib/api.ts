/** SWR fetcher: solo resuelve JSON de respuestas OK; si no, lanza (SWR marca error). */
export async function fetcher(url: string) {
  const res = await fetch(url)
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
