import { NextResponse } from "next/server"
import * as roleService from "@/services/role.service"

function parseId(raw: string | undefined) {
  const id = Number(raw)
  return isNaN(id) || !id ? null : id
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const role = await roleService.getRole(id)
  if (!role) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(role)
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    const body = await req.json()
    const role = await roleService.updateRole(id, body)
    return NextResponse.json(role)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error actualizando rol"
    const status = message === "No encontrado" ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params
  const id = parseId(raw)
  if (id === null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    const removed = await roleService.deleteRole(id)
    return NextResponse.json(removed)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error eliminando rol"
    const status = message === "No encontrado" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
