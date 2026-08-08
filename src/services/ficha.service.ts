import { prisma } from "@/lib/prisma"

/** Zonas de fórmula permitidas */
export type FormulaZona = { producto?: string; oxidante?: string; tiempo?: string }
export type Formula = {
  raiz?: FormulaZona
  longitudes?: FormulaZona
  puntas?: FormulaZona
  tonalizacion?: FormulaZona
}

export type FichaInput = {
  alergiasTiene?: boolean
  alergiasDetalle?: string | null
  pruebaAlergiaHasta?: string | null
  embarazoLactancia?: boolean
  tipoCabello?: string | null
  grosor?: string | null
  alertas?: string[]
  nivelBase?: number | null
  subtono?: string | null
  porcentajeCanas?: number | null
  colorHex?: string | null
  elasticidad?: number | null
  porosidad?: number | null
  hidratacion?: number | null
  cuidados?: string | null
  notasCuidados?: string | null
}

export type RecordInput = {
  fecha?: string
  servicio: string
  formula?: Formula
  resultado?: string | null
  nivelDano?: number | null
  fotos?: string[]
  mapaTecnica?: unknown
  cuidados?: string | null
  observaciones?: string | null
}

function toFicha(row: {
  id: number
  customerId: number
  alergiasTiene: boolean
  alergiasDetalle: string | null
  pruebaAlergiaHasta: Date | null
  embarazoLactancia: boolean
  tipoCabello: string | null
  grosor: string | null
  alertas: unknown
  nivelBase: number | null
  subtono: string | null
  porcentajeCanas: number | null
  colorHex: string | null
  elasticidad: number | null
  porosidad: number | null
  hidratacion: number | null
  cuidados: string | null
  notasCuidados: string | null
}) {
  return {
    id: row.id,
    customerId: row.customerId,
    alergiasTiene: row.alergiasTiene,
    alergiasDetalle: row.alergiasDetalle,
    pruebaAlergiaHasta: row.pruebaAlergiaHasta ? row.pruebaAlergiaHasta.toISOString() : null,
    embarazoLactancia: row.embarazoLactancia,
    tipoCabello: row.tipoCabello,
    grosor: row.grosor,
    alertas: (row.alertas as string[] | null) ?? [],
    nivelBase: row.nivelBase,
    subtono: row.subtono,
    porcentajeCanas: row.porcentajeCanas,
    colorHex: row.colorHex,
    elasticidad: row.elasticidad,
    porosidad: row.porosidad,
    hidratacion: row.hidratacion,
    cuidados: row.cuidados,
    notasCuidados: row.notasCuidados,
  }
}

function toRecord(row: {
  id: number
  customerId: number
  fecha: Date
  servicio: string
  formula: unknown
  resultado: string | null
  nivelDano: number | null
  fotos: unknown
  mapaTecnica: unknown
  cuidados: string | null
  observaciones: string | null
}) {
  return {
    id: row.id,
    customerId: row.customerId,
    fecha: row.fecha.toISOString(),
    servicio: row.servicio,
    formula: (row.formula as Formula | null) ?? null,
    resultado: row.resultado,
    nivelDano: row.nivelDano,
    fotos: (row.fotos as string[] | null) ?? [],
    mapaTecnica: row.mapaTecnica ?? null,
    cuidados: row.cuidados,
    observaciones: row.observaciones,
  }
}

/** Ficha completa: cliente + datos fijos + historial + conteo de visitas */
export async function getFichaCompleta(customerId: number) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) throw new Error("Cliente no encontrado")

  const [ficha, records, visitas] = await Promise.all([
    prisma.customerFicha.findUnique({ where: { customerId } }),
    prisma.hairServiceRecord.findMany({
      where: { customerId },
      orderBy: { fecha: "desc" },
    }),
    prisma.booking.count({ where: { customerId } }),
  ])

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    },
    visitas,
    ficha: ficha ? toFicha(ficha) : null,
    historial: records.map(toRecord),
  }
}

export async function upsertFicha(customerId: number, body: FichaInput) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) throw new Error("Cliente no encontrado")

  if (body.tipoCabello && !["liso", "ondulado", "rizado", "afro"].includes(body.tipoCabello)) {
    throw new Error("Tipo de cabello inválido")
  }
  if (body.grosor && !["fino", "medio", "grueso"].includes(body.grosor)) {
    throw new Error("Grosor inválido")
  }
  if (body.nivelBase != null && (body.nivelBase < 1 || body.nivelBase > 10)) {
    throw new Error("El nivel base debe ser 1-10")
  }

  const data = {
    alergiasTiene: body.alergiasTiene ?? false,
    alergiasDetalle: body.alergiasDetalle ?? null,
    pruebaAlergiaHasta: body.pruebaAlergiaHasta ? new Date(body.pruebaAlergiaHasta) : null,
    embarazoLactancia: body.embarazoLactancia ?? false,
    tipoCabello: body.tipoCabello ?? null,
    grosor: body.grosor ?? null,
    alertas: body.alertas ?? [],
    nivelBase: body.nivelBase ?? null,
    subtono: body.subtono ?? null,
    porcentajeCanas: body.porcentajeCanas ?? null,
    colorHex: body.colorHex ?? null,
    elasticidad: body.elasticidad ?? null,
    porosidad: body.porosidad ?? null,
    hidratacion: body.hidratacion ?? null,
    cuidados: body.cuidados ?? null,
    notasCuidados: body.notasCuidados ?? null,
  }

  const row = await prisma.customerFicha.upsert({
    where: { customerId },
    update: data,
    create: { customerId, ...data },
  })
  return toFicha(row)
}

export async function addRecord(customerId: number, body: RecordInput) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) throw new Error("Cliente no encontrado")
  if (!body.servicio?.trim()) throw new Error("El servicio es requerido")
  if (body.nivelDano != null && (body.nivelDano < 1 || body.nivelDano > 5)) {
    throw new Error("El nivel de daño debe ser 1-5")
  }

  const row = await prisma.hairServiceRecord.create({
    data: {
      customerId,
      fecha: body.fecha ? new Date(body.fecha) : new Date(),
      servicio: body.servicio.trim(),
      formula: body.formula ?? undefined,
      resultado: body.resultado ?? null,
      nivelDano: body.nivelDano ?? null,
      fotos: body.fotos ?? [],
      mapaTecnica: body.mapaTecnica ?? undefined,
      cuidados: body.cuidados ?? null,
      observaciones: body.observaciones ?? null,
    },
  })
  return toRecord(row)
}

export async function updateRecord(recordId: number, body: Partial<RecordInput>) {
  const existing = await prisma.hairServiceRecord.findUnique({ where: { id: recordId } })
  if (!existing) throw new Error("Servicio no encontrado en el historial")

  const row = await prisma.hairServiceRecord.update({
    where: { id: recordId },
    data: {
      ...(body.fecha ? { fecha: new Date(body.fecha) } : {}),
      ...(body.servicio ? { servicio: body.servicio.trim() } : {}),
      ...(body.formula !== undefined ? { formula: body.formula } : {}),
      ...(body.resultado !== undefined ? { resultado: body.resultado } : {}),
      ...(body.nivelDano !== undefined ? { nivelDano: body.nivelDano } : {}),
      ...(body.fotos !== undefined ? { fotos: body.fotos } : {}),
      ...(body.mapaTecnica !== undefined ? { mapaTecnica: body.mapaTecnica as object } : {}),
      ...(body.cuidados !== undefined ? { cuidados: body.cuidados } : {}),
      ...(body.observaciones !== undefined ? { observaciones: body.observaciones } : {}),
    },
  })
  return toRecord(row)
}

export async function deleteRecord(recordId: number) {
  const existing = await prisma.hairServiceRecord.findUnique({ where: { id: recordId } })
  if (!existing) throw new Error("Servicio no encontrado en el historial")
  await prisma.hairServiceRecord.delete({ where: { id: recordId } })
  return { ok: true }
}
