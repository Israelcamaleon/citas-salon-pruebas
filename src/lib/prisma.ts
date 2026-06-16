/**
 * Prisma singleton (safe for Next.js + hot reload)
 * We use require() to avoid TS export-resolution issues in some deployments.
 */
/* eslint-disable @typescript-eslint/no-var-requires */

const globalForPrisma = global as unknown as { prisma?: any };

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const mod = require("@prisma/client") as any;
    const PrismaClient = mod?.PrismaClient || mod?.default?.PrismaClient;
    if (!PrismaClient) {
      throw new Error("PrismaClient no disponible en @prisma/client. Reinstala y ejecuta prisma generate.");
    }
    return new PrismaClient({ log: ["error"] });
  })();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
