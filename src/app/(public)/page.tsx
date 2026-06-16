import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-xl w-full px-4 space-y-6 text-center">
        <h1 className="text-3xl font-bold">Glam Shedule</h1>
        <p className="text-gray-600">
          Administra y crea tus citas desde el panel principal.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard" className="btn btn-primary">
            Ir al Dashboard
          </Link>
          <Link href="/dashboard#bookings" className="btn">
            Crear cita
          </Link>
        </div>
      </div>
    </main>
  )
}
