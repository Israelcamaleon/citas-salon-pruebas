/**
 * Convierte Staff.role (texto libre) en Staff.roleId (llave foránea a Role).
 *
 * Es idempotente: se puede correr varias veces sin efecto adicional.
 * Uso: dotenv -e .env.local -- node scripts/migrate-staff-role.mjs
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function columnExists(column) {
  const rows = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Staff' AND column_name = ${column}
  `
  return rows.length > 0
}

async function main() {
  const hasRole = await columnExists("role")
  const hasRoleId = await columnExists("roleId")

  if (!hasRole && hasRoleId) {
    console.log("Ya migrado: Staff.roleId existe y Staff.role fue eliminada.")
    return
  }

  if (!hasRoleId) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Staff" ADD COLUMN "roleId" INTEGER`)
    console.log('Columna "roleId" agregada.')
  }

  // Cualquier rol referenciado por un colaborador pero ausente de Role se crea
  // sin permisos, para no perder la referencia ni otorgar accesos por accidente.
  const orphans = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT TRIM(s."role") AS name
    FROM "Staff" s
    WHERE s."roleId" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "Role" r WHERE LOWER(r."name") = LOWER(TRIM(s."role"))
      )
  `)
  for (const { name } of orphans) {
    await prisma.role.create({
      data: { name, description: "Creado durante la migración de roles", permissions: {} },
    })
    console.log(`Rol faltante creado sin permisos: "${name}"`)
  }

  const updated = await prisma.$executeRawUnsafe(`
    UPDATE "Staff" s
    SET "roleId" = r."id"
    FROM "Role" r
    WHERE LOWER(r."name") = LOWER(TRIM(s."role"))
      AND s."roleId" IS NULL
  `)
  console.log(`Colaboradores ligados a su rol: ${updated}`)

  const [{ count }] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "Staff" WHERE "roleId" IS NULL`
  )
  if (count > 0) {
    throw new Error(`Quedaron ${count} colaboradores sin roleId; se aborta sin destruir datos.`)
  }

  await prisma.$executeRawUnsafe(`ALTER TABLE "Staff" ALTER COLUMN "roleId" SET NOT NULL`)

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Staff_roleId_fkey'
      ) THEN
        ALTER TABLE "Staff"
          ADD CONSTRAINT "Staff_roleId_fkey"
          FOREIGN KEY ("roleId") REFERENCES "Role"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `)

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Staff_roleId_idx" ON "Staff"("roleId")`
  )

  await prisma.$executeRawUnsafe(`ALTER TABLE "Staff" DROP COLUMN "role"`)
  console.log('Columna "role" eliminada. Migración completa.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
