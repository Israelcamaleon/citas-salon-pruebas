import { NextResponse } from "next/server"
import * as roleService from "@/services/role.service"

export async function GET() {
  const list = await roleService.listRoles()
  return NextResponse.json(list)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const role = await roleService.createRole(body)
    return NextResponse.json(role, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error creando rol"
    const status = message === "El nombre ya existe" ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
