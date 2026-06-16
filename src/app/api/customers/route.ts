import { NextResponse } from "next/server"
import * as customerService from "@/services/customer.service"

export async function GET() {
  try {
    const customers = await customerService.listCustomers()
    return NextResponse.json(customers)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error obteniendo clientes"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const created = await customerService.createCustomer(body)
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error creando cliente"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
