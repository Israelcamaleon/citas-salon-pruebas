'use client'

import { useEffect, useState } from "react"

type ToastType = "ok" | "error"
type ToastItem = { id: number; msg: string; type: ToastType }

let push: ((msg: string, type: ToastType) => void) | null = null

/** Muestra un aviso breve en pantalla. Uso: toast("Cita creada") o toast("Error", "error") */
export function toast(msg: string, type: ToastType = "ok") {
  if (push) push(msg, type)
  else if (typeof window !== "undefined") window.alert(msg) // respaldo
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    push = (msg, type = "ok") => {
      const id = Date.now() + Math.random()
      setItems((x) => [...x, { id, msg, type }])
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4000)
    }
    return () => { push = null }
  }, [])

  if (!items.length) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] space-y-2 w-[92%] max-w-sm pointer-events-none">
      {items.map((i) => (
        <div
          key={i.id}
          className={`rounded-xl px-4 py-3 text-sm text-white shadow-lg text-center ${
            i.type === "error" ? "bg-red-600" : "bg-neutral-800"
          }`}
        >
          {i.msg}
        </div>
      ))}
    </div>
  )
}
