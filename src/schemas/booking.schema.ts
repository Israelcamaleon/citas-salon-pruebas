import { z } from "zod"

export const createBookingSchema = z.object({
  date: z.string().min(1),
  durationMin: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  staffId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  customerId: z.number().int().positive(),
})
