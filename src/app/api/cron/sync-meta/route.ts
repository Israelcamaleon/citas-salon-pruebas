/**
 * Cron diario: gasto e insights de Meta Ads → base de datos.
 * Re-sincroniza 7 días porque Meta ajusta métricas con lag.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { metaFromEnv } from "@/lib/meta/client"

function yyyymmdd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const meta = metaFromEnv()
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000)

    const [campaigns, insights] = await Promise.all([
      meta.campaigns(),
      meta.insightsDaily(yyyymmdd(weekAgo), yyyymmdd(today)),
    ])

    for (const c of campaigns) {
      await prisma.adCampaign.upsert({
        where: { metaId: c.id },
        update: { name: c.name, status: c.status, objective: c.objective ?? null },
        create: { metaId: c.id, name: c.name, status: c.status, objective: c.objective ?? null },
      })
    }

    let upserted = 0
    for (const i of insights) {
      const camp = await prisma.adCampaign.findUnique({ where: { metaId: i.campaign_id } })
      if (!camp) continue
      await prisma.adInsightDaily.upsert({
        where: { campaignId_date: { campaignId: camp.id, date: i.date_start } },
        update: {
          spend: Number(i.spend), impressions: Number(i.impressions),
          clicks: Number(i.clicks), reach: Number(i.reach),
        },
        create: {
          campaignId: camp.id, date: i.date_start,
          spend: Number(i.spend), impressions: Number(i.impressions),
          clicks: Number(i.clicks), reach: Number(i.reach),
        },
      })
      upserted++
    }

    return NextResponse.json({ ok: true, campaigns: campaigns.length, insightRows: upserted })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
