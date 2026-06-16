import { NextResponse } from "next/server"
import * as settingsService from "@/services/settings.service"

export async function GET() {
  const settings = await settingsService.getSettings()
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const settings = await settingsService.updateSettings(body)
    return NextResponse.json(settings)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "No se pudieron guardar los ajustes"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
