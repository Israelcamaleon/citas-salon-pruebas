export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import * as servicesService from "@/services/services.service"

type Ctx = { params: Promise<{ id: string }> }

function parseId(id: string) {
  const n = Number(id)
  return Number.isFinite(n) ? n : null
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const serviceId = parseId(id)
  if (serviceId === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const service = await servicesService.getService(serviceId)
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(service)
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params
  const serviceId = parseId(id)
  if (serviceId === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const body = await req.json()
  const updated = await servicesService.updateService(serviceId, body)
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const serviceId = parseId(id)
  if (serviceId === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  await servicesService.deleteService(serviceId)
  return NextResponse.json({ ok: true })
}
