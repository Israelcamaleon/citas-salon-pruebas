'use client'

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import axios from "axios"
import dayjs from "dayjs"

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Ficha = {
  alergiasTiene: boolean
  alergiasDetalle: string | null
  pruebaAlergiaHasta: string | null
  embarazoLactancia: boolean
  tipoCabello: string | null
  grosor: string | null
  alertas: string[]
  nivelBase: number | null
  subtono: string | null
  porcentajeCanas: number | null
  colorHex: string | null
  elasticidad: number | null
  porosidad: number | null
  hidratacion: number | null
  cuidados: string | null
  notasCuidados: string | null
}

type Zona = { producto: string; oxidante: string; tiempo: string }
type Formula = { raiz: Zona; longitudes: Zona; puntas: Zona; tonalizacion: Zona }

type Record_ = {
  id: number
  fecha: string
  servicio: string
  formula: Formula | null
  resultado: string | null
  nivelDano: number | null
  cuidados: string | null
  observaciones: string | null
}

type FichaCompleta = {
  customer: { id: number; name: string; phone: string | null; email: string | null }
  visitas: number
  ficha: Ficha | null
  historial: Record_[]
}

const ZONAS = [
  { key: "raiz", label: "RAÍZ" },
  { key: "longitudes", label: "LONGITUDES" },
  { key: "puntas", label: "PUNTAS" },
  { key: "tonalizacion", label: "TONALIZACIÓN" },
] as const

const ZONA_VACIA: Zona = { producto: "", oxidante: "", tiempo: "" }

const TIPOS_CABELLO = ["liso", "ondulado", "rizado", "afro"]
const GROSORES = ["fino", "medio", "grueso"]

// ─── Componentes auxiliares ─────────────────────────────────────────────────

function Barra({ label, valor }: { label: string; valor: number | null }) {
  const v = valor ?? 0
  const color = v >= 70 ? "bg-green-500" : v >= 40 ? "bg-amber-400" : "bg-red-400"
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span>{valor == null ? "—" : `${v}%`}</span>
      </div>
      <div className="h-2.5 bg-neutral-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

function NivelDano({ nivel }: { nivel: number | null }) {
  if (nivel == null) return <span className="text-neutral-400 text-xs">—</span>
  return (
    <span className="text-xs" title={`Daño ${nivel}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < nivel ? "text-red-500" : "text-neutral-300"}>●</span>
      ))}
    </span>
  )
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function FichaPage() {
  const params = useParams()
  const customerId = Number(params?.id)

  const [data, setData] = useState<FichaCompleta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<"resumen" | "historial" | "formula">("resumen")
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const emptyFicha: Ficha = {
    alergiasTiene: false, alergiasDetalle: null, pruebaAlergiaHasta: null,
    embarazoLactancia: false, tipoCabello: null, grosor: null, alertas: [],
    nivelBase: null, subtono: null, porcentajeCanas: null, colorHex: null,
    elasticidad: null, porosidad: null, hidratacion: null,
    cuidados: null, notasCuidados: null,
  }
  const [form, setForm] = useState<Ficha>(emptyFicha)
  const [nuevaAlerta, setNuevaAlerta] = useState("")

  // Formulario de servicio (pestaña fórmula)
  const [servicio, setServicio] = useState("")
  const [formula, setFormula] = useState<Formula>({ raiz: {...ZONA_VACIA}, longitudes: {...ZONA_VACIA}, puntas: {...ZONA_VACIA}, tonalizacion: {...ZONA_VACIA} })
  const [resultado, setResultado] = useState("")
  const [nivelDano, setNivelDano] = useState<number | null>(null)
  const [cuidadosRec, setCuidadosRec] = useState("")
  const [observaciones, setObservaciones] = useState("")

  async function cargar() {
    try {
      const res = await axios.get<FichaCompleta>(`/api/customers/${customerId}/ficha`)
      setData(res.data)
      setForm(res.data.ficha ?? emptyFicha)
    } catch {
      setError("No se pudo cargar la ficha")
    }
  }

  useEffect(() => { if (customerId) void cargar() }, [customerId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function guardarFicha() {
    setGuardando(true)
    try {
      await axios.put(`/api/customers/${customerId}/ficha`, form)
      await cargar()
      setEditando(false)
    } catch (err: unknown) {
      alert(axios.isAxiosError(err) ? err.response?.data?.error : "Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  async function guardarServicio() {
    if (!servicio.trim()) { alert("Escribe el nombre del servicio"); return }
    setGuardando(true)
    try {
      const formulaLimpia: Record<string, Zona> = {}
      for (const z of ZONAS) {
        const zona = formula[z.key]
        if (zona.producto || zona.oxidante || zona.tiempo) formulaLimpia[z.key] = zona
      }
      await axios.post(`/api/customers/${customerId}/historial`, {
        servicio: servicio.trim(),
        formula: Object.keys(formulaLimpia).length ? formulaLimpia : undefined,
        resultado: resultado || null,
        nivelDano,
        cuidados: cuidadosRec || null,
        observaciones: observaciones || null,
      })
      setServicio(""); setResultado(""); setNivelDano(null)
      setCuidadosRec(""); setObservaciones("")
      setFormula({ raiz: {...ZONA_VACIA}, longitudes: {...ZONA_VACIA}, puntas: {...ZONA_VACIA}, tonalizacion: {...ZONA_VACIA} })
      await cargar()
      setTab("historial")
    } catch (err: unknown) {
      alert(axios.isAxiosError(err) ? err.response?.data?.error : "Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarRecord(recordId: number) {
    if (!confirm("¿Eliminar este servicio del historial?")) return
    await axios.delete(`/api/customers/${customerId}/historial/${recordId}`)
    await cargar()
  }

  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!data) return <div className="p-4 text-neutral-500">Cargando ficha…</div>

  const f = data.ficha
  const pruebaVencida = f?.pruebaAlergiaHasta && dayjs(f.pruebaAlergiaHasta).isBefore(dayjs(), "day")
  const hayAlertas = f && (f.alergiasTiene || f.embarazoLactancia || pruebaVencida || f.alertas.length > 0)

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="btn text-sm">← Volver</Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{data.customer.name}</h1>
          <p className="text-xs text-neutral-500">
            {data.customer.phone ?? "sin teléfono"} · {data.visitas} visita{data.visitas === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Alertas siempre visibles */}
      {hayAlertas && (
        <div className="space-y-2">
          {f.alergiasTiene && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 font-semibold">
              ⚠️ ALERGIA: {f.alergiasDetalle || "revisar detalle"}
            </div>
          )}
          {pruebaVencida && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 font-semibold">
              ⚠️ Prueba de alergia VENCIDA ({dayjs(f.pruebaAlergiaHasta).format("DD/MM/YYYY")}) — renovar antes de aplicar químicos
            </div>
          )}
          {f.embarazoLactancia && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 font-semibold">
              🤰 Embarazo / lactancia — consultar antes de químicos
            </div>
          )}
          {f.alertas.map((a, i) => (
            <div key={i} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              ⚠️ {a}
            </div>
          ))}
        </div>
      )}

      {/* Pestañas */}
      <div className="flex gap-1 border-b">
        {(["resumen", "historial", "formula"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${
              tab === t ? "bg-white border border-b-white -mb-px" : "text-neutral-500"
            }`}
          >
            {t === "resumen" ? "Resumen" : t === "historial" ? `Historial (${data.historial.length})` : "Fórmula"}
          </button>
        ))}
      </div>

      {/* ─── RESUMEN ─── */}
      {tab === "resumen" && (
        <div className="space-y-4">
          {/* Color actual */}
          <div className="border rounded-lg p-3 space-y-2">
            <h3 className="font-semibold text-sm">Color actual</h3>
            {f?.nivelBase || f?.colorHex ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg border flex-shrink-0"
                  style={{ backgroundColor: f.colorHex ?? "#eee" }}
                />
                <div className="text-sm">
                  {f.nivelBase != null && <div>Nivel base: <strong>{f.nivelBase}</strong>{f.subtono ? `.${f.subtono}` : ""}</div>}
                  {f.porcentajeCanas != null && <div>Canas: <strong>{f.porcentajeCanas}%</strong></div>}
                  {(f.tipoCabello || f.grosor) && (
                    <div className="text-neutral-500">{[f.tipoCabello, f.grosor].filter(Boolean).join(" · ")}</div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-400">Sin datos de color aún.</p>
            )}
          </div>

          {/* Estado del cabello */}
          <div className="border rounded-lg p-3 space-y-3">
            <h3 className="font-semibold text-sm">Estado del cabello</h3>
            <Barra label="Elasticidad" valor={f?.elasticidad ?? null} />
            <Barra label="Porosidad" valor={f?.porosidad ?? null} />
            <Barra label="Hidratación" valor={f?.hidratacion ?? null} />
          </div>

          {/* Cuidados vigentes */}
          {(f?.cuidados || f?.notasCuidados) && (
            <div className="border rounded-lg p-3 space-y-1">
              <h3 className="font-semibold text-sm">Cuidados post-servicio</h3>
              {f.cuidados && <p className="text-sm whitespace-pre-line">{f.cuidados}</p>}
              {f.notasCuidados && <p className="text-xs text-neutral-500 whitespace-pre-line">{f.notasCuidados}</p>}
            </div>
          )}

          <button className="btn w-full" onClick={() => setEditando(!editando)}>
            {editando ? "Cancelar edición" : "✏️ Editar datos de la ficha"}
          </button>

          {/* Formulario de edición */}
          {editando && (
            <div className="border rounded-lg p-3 space-y-3 bg-neutral-50">
              <h3 className="font-semibold text-sm">Datos fijos</h3>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.alergiasTiene} onChange={(e) => setForm({ ...form, alergiasTiene: e.target.checked })} />
                Tiene alergias
              </label>
              {form.alergiasTiene && (
                <input className="input" placeholder="Detalle de la alergia" value={form.alergiasDetalle ?? ""} onChange={(e) => setForm({ ...form, alergiasDetalle: e.target.value })} />
              )}

              <label className="flex flex-col gap-1 text-sm">
                <span>Prueba de alergia vigente hasta</span>
                <input type="date" className="input" value={form.pruebaAlergiaHasta ? dayjs(form.pruebaAlergiaHasta).format("YYYY-MM-DD") : ""} onChange={(e) => setForm({ ...form, pruebaAlergiaHasta: e.target.value || null })} />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.embarazoLactancia} onChange={(e) => setForm({ ...form, embarazoLactancia: e.target.checked })} />
                Embarazo / lactancia
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span>Tipo de cabello</span>
                  <select className="input" value={form.tipoCabello ?? ""} onChange={(e) => setForm({ ...form, tipoCabello: e.target.value || null })}>
                    <option value="">—</option>
                    {TIPOS_CABELLO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Grosor</span>
                  <select className="input" value={form.grosor ?? ""} onChange={(e) => setForm({ ...form, grosor: e.target.value || null })}>
                    <option value="">—</option>
                    {GROSORES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
              </div>

              {/* Alertas permanentes */}
              <div className="space-y-1">
                <span className="text-sm">Alertas permanentes</span>
                {form.alertas.map((a, i) => (
                  <div key={i} className="flex gap-2 items-center text-sm bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    <span className="flex-1">{a}</span>
                    <button type="button" className="text-red-500" onClick={() => setForm({ ...form, alertas: form.alertas.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input className="input flex-1" placeholder="Ej. piel sensible, medicamentos…" value={nuevaAlerta} onChange={(e) => setNuevaAlerta(e.target.value)} />
                  <button type="button" className="btn" onClick={() => { if (nuevaAlerta.trim()) { setForm({ ...form, alertas: [...form.alertas, nuevaAlerta.trim()] }); setNuevaAlerta("") } }}>+</button>
                </div>
              </div>

              {/* Color */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span>Nivel base (1-10)</span>
                  <input type="number" min={1} max={10} className="input" value={form.nivelBase ?? ""} onChange={(e) => setForm({ ...form, nivelBase: e.target.value ? Number(e.target.value) : null })} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Subtono</span>
                  <input className="input" placeholder="Ej. 1, 3, 7.1" value={form.subtono ?? ""} onChange={(e) => setForm({ ...form, subtono: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>% canas</span>
                  <input type="number" min={0} max={100} className="input" value={form.porcentajeCanas ?? ""} onChange={(e) => setForm({ ...form, porcentajeCanas: e.target.value ? Number(e.target.value) : null })} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Color</span>
                  <input type="color" className="input h-10 p-1" value={form.colorHex ?? "#8b5e3c"} onChange={(e) => setForm({ ...form, colorHex: e.target.value })} />
                </label>
              </div>

              {/* Estado */}
              <div className="grid grid-cols-3 gap-2">
                {(["elasticidad", "porosidad", "hidratacion"] as const).map((k) => (
                  <label key={k} className="flex flex-col gap-1 text-sm">
                    <span className="capitalize">{k} %</span>
                    <input type="number" min={0} max={100} className="input" value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value ? Number(e.target.value) : null })} />
                  </label>
                ))}
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span>Cuidados post-servicio</span>
                <textarea className="input" rows={2} placeholder="Shampoo, mascarilla, frecuencia de lavado, próximo retoque…" value={form.cuidados ?? ""} onChange={(e) => setForm({ ...form, cuidados: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Notas de cuidados</span>
                <textarea className="input" rows={2} value={form.notasCuidados ?? ""} onChange={(e) => setForm({ ...form, notasCuidados: e.target.value })} />
              </label>

              <button className="btn btn-primary w-full" disabled={guardando} onClick={guardarFicha}>
                {guardando ? "Guardando…" : "Guardar ficha"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── HISTORIAL ─── */}
      {tab === "historial" && (
        <div className="space-y-3">
          {data.historial.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">
              Sin servicios registrados. Usa la pestaña <strong>Fórmula</strong> para registrar el primero.
            </p>
          ) : (
            data.historial.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm">{r.servicio}</div>
                    <div className="text-xs text-neutral-500">{dayjs(r.fecha).format("DD/MM/YYYY")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NivelDano nivel={r.nivelDano} />
                    <button className="text-red-500 text-sm" onClick={() => eliminarRecord(r.id)}>🗑</button>
                  </div>
                </div>
                {r.formula && (
                  <div className="text-xs bg-neutral-50 rounded p-2 space-y-1">
                    {ZONAS.filter((z) => r.formula?.[z.key]).map((z) => {
                      const zona = r.formula![z.key]
                      return (
                        <div key={z.key}>
                          <strong>{z.label}:</strong> {zona.producto}
                          {zona.oxidante ? ` · Ox. ${zona.oxidante}` : ""}
                          {zona.tiempo ? ` · ${zona.tiempo}` : ""}
                        </div>
                      )
                    })}
                  </div>
                )}
                {r.resultado && <p className="text-sm"><span className="text-neutral-500">Resultado:</span> {r.resultado}</p>}
                {r.cuidados && <p className="text-sm"><span className="text-neutral-500">Cuidados:</span> {r.cuidados}</p>}
                {r.observaciones && <p className="text-xs text-neutral-500 whitespace-pre-line">{r.observaciones}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── FÓRMULA ─── */}
      {tab === "formula" && (
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Servicio realizado *</span>
            <input className="input" placeholder="Ej. Balayage + corte" value={servicio} onChange={(e) => setServicio(e.target.value)} />
          </label>

          {ZONAS.map((z) => (
            <div key={z.key} className="border rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-xs tracking-wide text-neutral-600">{z.label}</h4>
              <input
                className="input"
                placeholder="Producto / tinte (Ej. 7.1 + 8.3)"
                value={formula[z.key].producto}
                onChange={(e) => setFormula({ ...formula, [z.key]: { ...formula[z.key], producto: e.target.value } })}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder="Oxidante (Ej. 20 vol)"
                  value={formula[z.key].oxidante}
                  onChange={(e) => setFormula({ ...formula, [z.key]: { ...formula[z.key], oxidante: e.target.value } })}
                />
                <input
                  className="input"
                  placeholder="Tiempo (Ej. 35 min)"
                  value={formula[z.key].tiempo}
                  onChange={(e) => setFormula({ ...formula, [z.key]: { ...formula[z.key], tiempo: e.target.value } })}
                />
              </div>
            </div>
          ))}

          <label className="flex flex-col gap-1 text-sm">
            <span>Resultado</span>
            <input className="input" placeholder="Ej. Quedó parejo, tono deseado" value={resultado} onChange={(e) => setResultado(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span>Nivel de daño (1-5)</span>
            <select className="input" value={nivelDano ?? ""} onChange={(e) => setNivelDano(e.target.value ? Number(e.target.value) : null)}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {n === 1 ? "(sano)" : n === 5 ? "(muy dañado)" : ""}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span>Cuidados recomendados</span>
            <textarea className="input" rows={2} placeholder="Shampoo, mascarilla, próximo retoque…" value={cuidadosRec} onChange={(e) => setCuidadosRec(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span>Observaciones</span>
            <textarea className="input" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>

          <button className="btn btn-primary w-full text-base py-3" disabled={guardando} onClick={guardarServicio}>
            {guardando ? "Guardando…" : "✅ Finalizar servicio y guardar"}
          </button>
        </div>
      )}
    </div>
  )
}
