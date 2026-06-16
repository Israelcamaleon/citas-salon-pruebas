export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import * as locationService from "@/services/location.service"

function parseId(raw: string | undefined) {
  const id = Number(raw)
  return isNaN(id) ? null : id
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const row = await locationService.getLocation(id)
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    const body = await req.json()
    const updated = await locationService.updateLocation(id, body)
    return NextResponse.json(updated)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "No se pudo actualizar la sucursal"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    await locationService.deleteLocation(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "No se pudo eliminar la sucursal"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
