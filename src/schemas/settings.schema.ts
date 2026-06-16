import { z } from "zod"

export const updateSettingsSchema = z.object({
  businessName: z.string().trim().min(1, "businessName es requerido"),
  address: z.string().trim().optional().default(""),
  logoUrl: z.string().nullable().optional(),
})
