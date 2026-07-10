import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Glam Schedule",
  description: "Agenda de citas y lealtad para salones y estéticas",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-lh-bg text-lh-text antialiased">
        {children}
      </body>
    </html>
  )
}
