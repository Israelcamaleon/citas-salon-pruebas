export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import * as bookingService from "@/services/booking.service"

export async function GET() {
  try {
    const data = await bookingService.listBookings()
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error obteniendo citas"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const created = await bookingService.createBooking(body)
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error creando cita"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
