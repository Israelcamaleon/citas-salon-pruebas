import "./globals.css"
import type { Metadata } from "next"
import BrandBar from "@/components/layout/BrandBar"
import AuthNav from "@/components/layout/AuthNav"
import { isLoyaltyEnabled } from "@/lib/loyalty"

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
            <AuthNav loyaltyEnabled={isLoyaltyEnabled()} />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
