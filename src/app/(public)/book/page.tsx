import { redirect } from "next/navigation"

/** Reserva pública deshabilitada: la entrada al sistema es el login. */
export default function BookPage() {
  redirect("/login")
}
