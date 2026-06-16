import { NextResponse } from "next/server"
import * as uploadService from "@/services/upload.service"

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file") as unknown as File | null
    if (!file) return NextResponse.json({ error: "file requerido" }, { status: 400 })

    const result = await uploadService.saveUpload(file)
    return NextResponse.json(result, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error subiendo archivo"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
