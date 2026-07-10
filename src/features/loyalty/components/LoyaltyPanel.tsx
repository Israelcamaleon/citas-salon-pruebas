'use client'

import Tabs from "@/components/ui/Tabs"
import LoyaltyDashboard from "./LoyaltyDashboard"
import LoyaltyPrograms from "./LoyaltyPrograms"
import LoyaltyOperate from "./LoyaltyOperate"
import IssueCard from "./IssueCard"

export default function LoyaltyPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="page-title">Lealtad</h1>
      </div>
      <Tabs
        tabs={[
          { key: "dashboard", label: "Resumen", content: <LoyaltyDashboard /> },
          { key: "programs", label: "Mis tarjetas", content: <LoyaltyPrograms /> },
          { key: "operate", label: "Sellar / Canjear", content: <LoyaltyOperate /> },
          { key: "issue", label: "Emitir", content: <IssueCard /> },
        ]}
      />
    </div>
  )
}
