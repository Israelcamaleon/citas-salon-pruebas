import { NextResponse } from "next/server"
import * as scheduleService from "@/services/schedule.service"

function parseId(raw: string | undefined) {
  const id = Number(raw)
  return isNaN(id) || !id ? null : id
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const data = await scheduleService.getLocationSchedule(id)
  return NextResponse.json(data)
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  try {
    const body = await req.json()
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid body" }, { status: 400 })
    }
    const data = await scheduleService.updateLocationSchedule(id, body)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error actualizando horario"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
