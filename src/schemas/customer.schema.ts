import { z } from "zod"

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  phone: z.string().trim().min(1, "El teléfono es obligatorio"),
  email: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  sexo: z.enum(["mujer", "hombre", "otro"]).optional().nullable(),
})
