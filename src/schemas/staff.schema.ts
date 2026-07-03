import { z } from "zod"

export const createStaffSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.string().min(1, "Rol requerido"),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
})
