export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import * as staffService from "@/services/staff.service"

export async function GET() {
  const data = await staffService.listStaff()
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const created = await staffService.createStaff(body)
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string }
    if (err?.code === "P2002") return NextResponse.json({ error: "Ese email ya existe" }, { status: 409 })
    const message = e instanceof Error ? e.message : "Error inesperado"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
