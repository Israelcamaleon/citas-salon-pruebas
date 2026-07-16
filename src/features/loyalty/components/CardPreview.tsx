import type { LoyaltyCard, LoyaltyProgram } from "@/types/loyalty"
import type { ProgramConfig } from "@/schemas/loyalty/program-config.schema"
import { LOYALTY_TYPE_LABELS } from "@/lib/loyalty"

type PreviewProps = {
  name: string
  type: "STAMP" | "SERVICE" | "GIFT" | "DISCOUNT" | "COUPON" | "PREPAID" | "CASHBACK"
  color: string
  config: ProgramConfig
  description?: string | null
  logoUrl?: string | null
  bgUrl?: string | null
  balance?: number
  serviceUsage?: Record<string, number> | null
  status?: string
  compact?: boolean
  footerLeft?: string
  footerRight?: string
}

export default function CardPreview({
  name,
  type,
  color,
  config,
  description,
  logoUrl,
  bgUrl,
  balance = 0,
  serviceUsage = null,
  status = "ACTIVE",
  compact = false,
  footerLeft = "Mi Negocio",
  footerRight = "Para: cliente",
}: PreviewProps) {
  const height = compact ? "min-h-[140px]" : "min-h-[200px]"

  return (
    <div
      className={`rounded-2xl p-5 text-white shadow-lg ${height} flex flex-col relative overflow-hidden`}
      style={
        bgUrl
          ? { backgroundColor: color }
          : {
              background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -28)} 100%)`,
            }
      }
    >
      {bgUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
          <div className="absolute inset-0 bg-black/35" />
        </>
      )}
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="absolute top-3 right-3 z-[2] w-11 h-11 rounded-lg object-contain bg-white/15 p-0.5"
        />
      )}
      <div className="relative z-[1] flex justify-between items-start gap-2">
        <div>
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full mb-2">
            {LOYALTY_TYPE_LABELS[type] || type}
          </span>
          <h3 className={`font-bold ${compact ? "text-base" : "text-xl"}`}>
            {name || "Nombre del programa"}
          </h3>
          {description !== undefined && (
            <p className="text-[13px] opacity-85 mt-1">{description || "Descripción"}</p>
          )}
        </div>
        {status !== "ACTIVE" && (
          <span className="text-xs bg-black/25 rounded-full px-2 py-0.5">{status}</span>
        )}
      </div>

      <div className="relative z-[1] flex-1 flex flex-col justify-end pt-4">
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
        {type === "GIFT" && (
          <BalanceRow value={`$${balance}`} label="disponibles" />
        )}
        {type === "PREPAID" && (
          <BalanceRow value={`$${balance}`} label="saldo prepago" />
        )}
        {type === "CASHBACK" && (
          <BalanceRow value={`$${balance}`} label="acumulados" />
        )}
        {type === "DISCOUNT" && config.type === "DISCOUNT" && (
          <BalanceRow
            value={config.discountType === "percent" ? `${config.value}%` : `$${config.value}`}
            label="de descuento"
          />
        )}
        {type === "COUPON" && config.type === "COUPON" && (
          <BalanceRow value={`${config.discount}%`} label={`código ${config.code}`} />
        )}
      </div>

      {!compact && (
        <div className="relative z-[1] flex justify-between text-[11px] opacity-80 mt-4 pt-2 border-t border-white/20">
          <span>{footerLeft}</span>
          <span className="italic">{footerRight}</span>
        </div>
      )}
    </div>
  )
}

function BalanceRow({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl font-extrabold tracking-tight">{value}</span>
      <span className="text-sm opacity-80">{label}</span>
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
  const slots = Math.min(needed, compact ? 8 : 12)
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-3xl font-extrabold">{balance}</span>
        <span className="text-sm opacity-80">/ {needed} sellos</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: slots }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full border-2 border-white/50 flex items-center justify-center ${
              compact ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm"
            } ${i < balance ? "bg-white/90 border-white" : "bg-white/10"}`}
          >
            {i < balance && <span className="text-lh-text font-bold">✓</span>}
          </div>
        ))}
        {needed > slots && (
          <span className="text-xs self-center opacity-80">+{needed - slots}</span>
        )}
      </div>
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
    <div className={`space-y-1.5 w-full ${compact ? "text-xs" : "text-sm"}`}>
      {services.map((s) => {
        const used = usage?.[s.name] ?? 0
        const left = s.total - used
        return (
          <div key={s.name} className="flex justify-between bg-black/15 rounded-lg px-2.5 py-1.5">
            <span>{s.icon ? `${s.icon} ` : ""}{s.name}</span>
            <span className="font-semibold">{left} / {s.total}</span>
          </div>
        )
      })}
    </div>
  )
}

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
    type: program.type as PreviewProps["type"],
    color: program.color,
    config: program.config,
    balance: card?.balance ?? (program.config.type === "STAMP" ? program.config.welcomeStamps : program.config.type === "GIFT" ? program.config.initialBalance : 0),
    serviceUsage: card?.serviceUsage ?? null,
    status: card?.status ?? "ACTIVE",
  }
}
