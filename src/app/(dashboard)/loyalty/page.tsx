import { isLoyaltyEnabled } from "@/lib/loyalty"
import LoyaltyPanel from "@/features/loyalty/components/LoyaltyPanel"

export default function LoyaltyPage() {
  if (!isLoyaltyEnabled()) {
    return (
      <div className="text-center py-12 text-neutral-500">
        Módulo de lealtad no habilitado en este despliegue.
      </div>
    )
  }

  return <LoyaltyPanel />
}
