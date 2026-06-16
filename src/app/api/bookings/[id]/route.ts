export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import * as bookingService from "@/services/booking.service"

function parseId(raw: string | undefined) {
  const id = Number(raw)
  return isNaN(id) ? null : id
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    const row = await bookingService.getBooking(id)
    if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json(row)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error obteniendo cita"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    const body = await req.json()
    const updated = await bookingService.updateBooking(id, body)
    return NextResponse.json(updated)
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string }
    if (err?.code === "P2025") return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    const message = e instanceof Error ? e.message : "No se pudo actualizar la cita"
    const status = message === "Nada que actualizar" ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(req, context)
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    await bookingService.deleteBooking(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "P2025") return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    const message = e instanceof Error ? e.message : "No se pudo eliminar la cita"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
