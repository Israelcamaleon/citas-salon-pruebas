/**
 * Normalización de teléfonos — llave de atribución Odoo ↔ Glam Schedule.
 *
 * Verificado contra la base real (10-ago-2026):
 *  - ~96% de los celulares vienen limpios a 10 dígitos ("4424750770")
 *  - Casos con lada/prefijo: "+52 442...", "52...", "1 442...", con espacios/guiones
 *  - ~1% vacíos, ~2% con menos de 10 dígitos
 *
 * Regla: quedarse con los ÚLTIMOS 10 dígitos. Comparar dígitos, nunca strings.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null; // no confiable para atribuir
  return digits.slice(-10);
}

/** Variante que intenta rescatar números cortos (uso interno, NO para matching) */
export function phoneDigits(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '');
}
