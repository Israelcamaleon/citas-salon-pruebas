'use client'

import Tabs from "@/components/ui/Tabs"
import LoyaltyDashboard from "./LoyaltyDashboard"
import LoyaltyPrograms from "./LoyaltyPrograms"
import LoyaltyOperate from "./LoyaltyOperate"
import IssueCard from "./IssueCard"

export default function LoyaltyPanel() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Lealtad</h1>
      <Tabs
        tabs={[
          { key: "dashboard", label: "Resumen", content: <LoyaltyDashboard /> },
          { key: "programs", label: "Programas", content: <LoyaltyPrograms /> },
          { key: "operate", label: "Sellar / Usar", content: <LoyaltyOperate /> },
          { key: "issue", label: "Emitir tarjeta", content: <IssueCard /> },
        ]}
      />
    </div>
  )
}
