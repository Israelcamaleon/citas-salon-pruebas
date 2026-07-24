'use client'

import { useState } from "react"
import Tabs from "@/components/ui/Tabs"
import LoyaltyDashboard from "./LoyaltyDashboard"
import LoyaltyPrograms from "./LoyaltyPrograms"
import LoyaltyOperate from "./LoyaltyOperate"
import IssueCard from "./IssueCard"

export default function LoyaltyPanel() {
  const [tab, setTab] = useState("dashboard")

  return (
    <div className="space-y-4">
      <h1 className="page-title">Mis tarjetas</h1>
      <Tabs
        activeKey={tab}
        onActiveChange={setTab}
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
