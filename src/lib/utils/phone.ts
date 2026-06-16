export function normalizePhoneMX(input: string | undefined | null): string {
  const raw = (input ?? "").replace(/\D+/g, "")
  if (!raw) return ""
  let d = raw
  if (d.startsWith("521") && d.length >= 13) d = d.slice(3)
  else if (d.startsWith("52") && d.length >= 12) d = d.slice(2)
  return d
}
