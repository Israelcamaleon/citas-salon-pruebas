import { prisma } from "@/lib/prisma"
import type { DayKey, LocationSchedule } from "@/types"
import type { Prisma } from "@prisma/client"

export function defaultSchedule(): LocationSchedule {
  return {
    mon: { open: true, start: "09:00", end: "18:00" },
    tue: { open: true, start: "09:00", end: "18:00" },
    wed: { open: true, start: "09:00", end: "18:00" },
    thu: { open: true, start: "09:00", end: "18:00" },
    fri: { open: true, start: "09:00", end: "18:00" },
    sat: { open: true, start: "10:00", end: "14:00" },
    sun: { open: false, start: "00:00", end: "00:00" },
  }
}

export async function getLocationSchedule(id: number): Promise<LocationSchedule> {
  const row = await prisma.locationSchedule.findUnique({ where: { locationId: id } })
  if (row?.schedule) return row.schedule as LocationSchedule

  const schedule = defaultSchedule()
  await prisma.locationSchedule.upsert({
    where: { locationId: id },
    update: { schedule: schedule as Prisma.InputJsonValue },
    create: { locationId: id, schedule: schedule as Prisma.InputJsonValue },
  })
  return schedule
}

export async function updateLocationSchedule(id: number, body: Record<string, unknown>) {
  const days: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

  for (const d of days) {
    const v = body[d] as Record<string, unknown> | undefined
    if (!v) continue
    if (typeof v.open !== "boolean") throw new Error(`invalid ${d}.open`)
    if (typeof v.start !== "string" || !/^\d{2}:\d{2}$/.test(v.start)) {
      throw new Error(`invalid ${d}.start`)
    }
    if (typeof v.end !== "string" || !/^\d{2}:\d{2}$/.test(v.end)) {
      throw new Error(`invalid ${d}.end`)
    }
  }

  const schedule: LocationSchedule = { ...defaultSchedule(), ...(body as Partial<LocationSchedule>) }

  await prisma.locationSchedule.upsert({
    where: { locationId: id },
    update: { schedule: schedule as Prisma.InputJsonValue },
    create: { locationId: id, schedule: schedule as Prisma.InputJsonValue },
  })

  return schedule
}
