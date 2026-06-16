export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import * as customerService from "@/services/customer.service"

function parseId(raw: string | undefined) {
  const id = Number(raw)
  return isNaN(id) ? null : id
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    const row = await customerService.getCustomer(id)
    if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json(row)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error obteniendo cliente"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    const body = await req.json()
    const updated = await customerService.updateCustomer(id, body)
    return NextResponse.json(updated)
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Teléfono o email ya están en uso" }, { status: 409 })
    }
    const message = e instanceof Error ? e.message : "No se pudo actualizar el cliente"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    await customerService.deleteCustomer(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "No se pudo eliminar el cliente"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
