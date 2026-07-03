import type { LoyaltyCard, LoyaltyProgram } from "@/types/loyalty"
import type { ProgramConfig } from "@/schemas/loyalty/program-config.schema"

type PreviewProps = {
  name: string
  type: "STAMP" | "SERVICE"
  color: string
  config: ProgramConfig
  balance?: number
  serviceUsage?: Record<string, number> | null
  status?: string
  compact?: boolean
}

export default function CardPreview({
  name,
  type,
  color,
  config,
  balance = 0,
  serviceUsage = null,
  status = "ACTIVE",
  compact = false,
}: PreviewProps) {
  const height = compact ? "min-h-[140px]" : "min-h-[200px]"

  return (
    <div
      className={`rounded-2xl p-4 text-white shadow-lg ${height} flex flex-col`}
      style={{ background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -30)} 100%)` }}
    >
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide opacity-80">
            {type === "STAMP" ? "Sellos" : "Paquete"}
          </p>
          <h3 className={`font-semibold ${compact ? "text-base" : "text-lg"}`}>{name || "Programa"}</h3>
        </div>
        {status !== "ACTIVE" && (
          <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{status}</span>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center py-3">
        {type === "STAMP" && config.type === "STAMP" && (
          <StampVisual balance={balance} needed={config.stampsNeeded} compact={compact} />
        )}
        {type === "SERVICE" && config.type === "SERVICE" && (
          <ServiceVisual
            services={config.services as { name: string; total: number; icon?: string }[]}
            usage={serviceUsage}
            compact={compact}
          />
        )}
      </div>
    </div>
  )
}

function StampVisual({
  balance,
  needed,
  compact,
}: {
  balance: number
  needed: number
  compact?: boolean
}) {
  const slots = Math.min(needed, compact ? 8 : 10)
  return (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {Array.from({ length: slots }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full border-2 border-white/60 ${
            compact ? "w-6 h-6" : "w-8 h-8"
          } ${i < balance ? "bg-white" : "bg-white/10"}`}
        />
      ))}
      {needed > slots && (
        <span className="text-xs self-center opacity-80">+{needed - slots}</span>
      )}
      <p className="w-full text-center text-sm mt-1 opacity-90">
        {balance} / {needed} sellos
      </p>
    </div>
  )
}

function ServiceVisual({
  services,
  usage,
  compact,
}: {
  services: { name: string; total: number; icon?: string }[]
  usage: Record<string, number> | null
  compact?: boolean
}) {
  return (
    <div className={`space-y-1 w-full ${compact ? "text-xs" : "text-sm"}`}>
      {services.map((s) => {
        const used = usage?.[s.name] ?? 0
        const left = s.total - used
        return (
          <div key={s.name} className="flex justify-between bg-white/10 rounded-lg px-2 py-1">
            <span>{s.icon ? `${s.icon} ` : ""}{s.name}</span>
            <span className="font-medium">{left} / {s.total}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Oscurece un color hex para el gradiente */
function adjustColor(hex: string, amount: number): string {
  const n = hex.replace("#", "")
  if (n.length !== 6) return hex
  const r = Math.max(0, Math.min(255, parseInt(n.slice(0, 2), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(n.slice(2, 4), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(n.slice(4, 6), 16) + amount))
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

export function previewFromProgram(program: LoyaltyProgram, card?: LoyaltyCard) {
  return {
    name: program.name,
    type: program.type as "STAMP" | "SERVICE",
    color: program.color,
    config: program.config,
    balance: card?.balance ?? (program.config.type === "STAMP" ? program.config.welcomeStamps : 0),
    serviceUsage: card?.serviceUsage ?? null,
    status: card?.status ?? "ACTIVE",
  }
}
