import { prisma } from "@/lib/prisma"
import type { AppSettings } from "@/types"
import { updateSettingsSchema } from "@/schemas/settings.schema"

export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, businessName: "", address: "", logoUrl: null },
  })

  return {
    businessName: row.businessName,
    address: row.address,
    logoUrl: row.logoUrl,
  }
}

export async function updateSettings(body: unknown): Promise<AppSettings> {
  const parsed = updateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Datos inválidos")
  }

  const row = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {
      businessName: parsed.data.businessName,
      address: parsed.data.address,
      logoUrl: parsed.data.logoUrl ?? null,
    },
    create: {
      id: 1,
      businessName: parsed.data.businessName,
      address: parsed.data.address,
      logoUrl: parsed.data.logoUrl ?? null,
    },
  })

  return {
    businessName: row.businessName,
    address: row.address,
    logoUrl: row.logoUrl,
  }
}
