import { Suspense } from "react"
import { isLoyaltyEnabled } from "@/lib/loyalty"
import PublicTarjetasView from "@/features/loyalty/components/PublicTarjetasView"

export default function PublicTarjetasPage() {
  if (!isLoyaltyEnabled()) {
    return (
      <div className="text-center py-12 text-neutral-500">
        Tarjetas de lealtad no disponibles.
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500">Cargando…</div>}>
      <PublicTarjetasView />
    </Suspense>
  )
}
