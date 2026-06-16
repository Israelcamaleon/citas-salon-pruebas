export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import * as locationService from "@/services/location.service"

export async function GET() {
  const data = await locationService.listLocations()
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const created = await locationService.createLocation(body)
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error inesperado"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
