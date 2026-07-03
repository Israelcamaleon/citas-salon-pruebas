/**
 * Crea usuario Supabase Auth + Staff vinculado + roles default.
 * Uso: npm run seed:auth
 * Requiere .env.local con SUPABASE_SERVICE_ROLE_KEY y DATABASE_URL.
 */
import { PrismaClient } from "@prisma/client"
import { createClient } from "@supabase/supabase-js"

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com"
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "demo1234"
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Administrador"

const DEFAULT_ROLES = [
  {
    name: "Administrador",
    description: "Acceso total",
    permissions: {
      manageBookings: true, manageCustomers: true, manageStaff: true, manageServices: true,
      manageLocations: true, manageReports: true, manageSettings: true, manageRoles: true,
      manageLoyalty: true, stampCards: true,
    },
  },
  {
    name: "Gerente",
    description: "Gestión operativa",
    permissions: {
      manageBookings: true, manageCustomers: true, manageStaff: true, manageServices: true,
      manageLocations: true, manageReports: true, manageSettings: false, manageRoles: false,
      manageLoyalty: true, stampCards: true,
    },
  },
  {
    name: "Colaborador",
    description: "Acceso limitado",
    permissions: {
      manageBookings: true, manageCustomers: true, manageStaff: false, manageServices: false,
      manageLocations: false, manageReports: false, manageSettings: false, manageRoles: false,
      manageLoyalty: false, stampCards: true,
    },
  },
]

async function ensureRoles() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions, description: role.description },
      create: role,
    })
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
  }

  await ensureRoles()

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let authUserId

  const { data: existingList } = await supabase.auth.admin.listUsers()
  const existing = existingList?.users?.find((u) => u.email === ADMIN_EMAIL)

  if (existing) {
    authUserId = existing.id
    console.log(`Usuario Supabase ya existe: ${ADMIN_EMAIL}`)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    })
    if (error) throw error
    authUserId = data.user.id
    console.log(`Usuario Supabase creado: ${ADMIN_EMAIL}`)
  }

  await prisma.staff.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      role: "Administrador",
      authUserId,
      isActive: true,
    },
    create: {
      name: ADMIN_NAME,
      role: "Administrador",
      email: ADMIN_EMAIL,
      authUserId,
      isActive: true,
    },
  })

  console.log("")
  console.log("Seed auth OK")
  console.log(`  Email:    ${ADMIN_EMAIL}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
  console.log(`  Rol:      Administrador`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
