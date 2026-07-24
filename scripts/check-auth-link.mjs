/**
 * Diagnóstico de accesos: cruza colaboradores, roles y cuentas de Supabase Auth.
 * Uso: dotenv -e .env.local -- node scripts/check-auth-link.mjs
 */
import { PrismaClient } from "@prisma/client"
import { createClient } from "@supabase/supabase-js"

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const staff = await prisma.staff.findMany({
  include: { role: true },
  orderBy: { id: "asc" },
})
const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 })
if (error) throw error

const authIds = new Set(data.users.map((u) => u.id))
const canManage = (s) => s.role.permissions?.manageStaff === true

console.log("COLABORADORES:")
for (const s of staff) {
  const login = !s.authUserId
    ? "sin cuenta"
    : authIds.has(s.authUserId)
      ? "puede entrar"
      : "LIGADO A CUENTA INEXISTENTE"
  const flags = [s.isActive ? "activo" : "inactivo", login]
  if (canManage(s)) flags.push("administra personal")
  console.log(`  #${s.id} ${s.email} [${s.role.name}] ${flags.join(", ")}`)
}

const usableAdmins = staff.filter((s) => s.isActive && s.authUserId && canManage(s))
console.log(`\nADMINISTRADORES QUE PUEDEN ENTRAR: ${usableAdmins.length}`)
for (const a of usableAdmins) console.log(`  ${a.email}`)
if (usableAdmins.length === 0) console.log("  ¡NINGUNO! Corre: npm run seed:auth")

const staffAuthIds = new Set(staff.map((s) => s.authUserId).filter(Boolean))
const orphanAccounts = data.users.filter((u) => !staffAuthIds.has(u.id))
if (orphanAccounts.length > 0) {
  console.log("\nCUENTAS DE SUPABASE SIN COLABORADOR (no podrán usar el sistema):")
  for (const u of orphanAccounts) console.log(`  ${u.email}`)
}

await prisma.$disconnect()
