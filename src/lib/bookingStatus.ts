// Estados de cita y su presentación (etiqueta + colores)

export type BookingStatus = "scheduled" | "confirmed" | "completed" | "cancelled"

export const BOOKING_STATUS: Record<string, { label: string; chip: string; card: string }> = {
  scheduled: {
    label: "Programada",
    chip: "bg-blue-100 text-blue-800",
    card: "",
  },
  confirmed: {
    label: "Confirmada",
    chip: "bg-green-100 text-green-800",
    card: "border-green-400",
  },
  completed: {
    label: "Completada",
    chip: "bg-neutral-200 text-neutral-600",
    card: "opacity-60",
  },
  cancelled: {
    label: "Cancelada",
    chip: "bg-red-100 text-red-700 line-through",
    card: "opacity-50 border-red-300",
  },
}

export function statusLabel(status?: string | null): string {
  return BOOKING_STATUS[status ?? "scheduled"]?.label ?? status ?? "Programada"
}

export function statusChipClass(status?: string | null): string {
  return BOOKING_STATUS[status ?? "scheduled"]?.chip ?? "bg-neutral-100 text-neutral-700"
}

export function statusCardClass(status?: string | null): string {
  return BOOKING_STATUS[status ?? "scheduled"]?.card ?? ""
}
