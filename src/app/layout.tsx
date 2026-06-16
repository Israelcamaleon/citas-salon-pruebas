import "./globals.css"
import type { Metadata } from "next"
import Link from "next/link"
import BrandBar from "@/components/layout/BrandBar"

export const metadata: Metadata = {
  title: "Glam Schedule",
  description: "Agenda de citas para salones y estéticas",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <BrandBar />
            <nav className="flex gap-4">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/ajustes" className="hover:underline">
                Ajustes
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
