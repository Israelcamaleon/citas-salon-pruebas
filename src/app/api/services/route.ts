export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import * as servicesService from "@/services/services.service"

export async function GET() {
  const data = await servicesService.listServices()
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const created = await servicesService.createService(body)
  return NextResponse.json(created, { status: 201 })
}
