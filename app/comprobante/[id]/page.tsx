"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { generarComprobante, type ComprobanteData } from "@/lib/comprobante"

interface ComprobanteResponse {
  premio: string
  comprador: ComprobanteData
}

// Comprobante público al que apunta el botón del WhatsApp de transferencia
// aprobada (/comprobante/{compradorId}).
export default function ComprobantePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [data, setData] = useState<ComprobanteResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    if (!id) return
    let activo = true
    ;(async () => {
      try {
        const res = await fetch(`/api/comprobante/${id}`)
        const body = await res.json()
        if (!activo) return
        if (!res.ok) setError(body?.error || "No se pudo cargar el comprobante")
        else setData(body)
      } catch {
        if (activo) setError("No se pudo cargar el comprobante")
      } finally {
        if (activo) setCargando(false)
      }
    })()
    return () => {
      activo = false
    }
  }, [id])

  const descargar = () => {
    if (!data) return
    setDescargando(true)
    generarComprobante(data.comprador, data.premio, () => setDescargando(false))
    // toBlob puede no llamar al callback si falla; no dejar el botón trabado.
    setTimeout(() => setDescargando(false), 4000)
  }

  const numeros = data ? [...data.comprador.numeros_asignados].sort((a, b) => a - b) : []

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#262626] bg-[#141414] p-6 text-center shadow-xl">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
          Sosa Motos
        </p>

        {cargando && <p className="text-gray-400">Cargando comprobante…</p>}

        {!cargando && error && (
          <div>
            <h1 className="mb-2 text-xl font-bold text-white">Comprobante no disponible</h1>
            <p className="text-gray-400">{error}</p>
          </div>
        )}

        {!cargando && !error && data && (
          <div>
            <h1 className="mb-1 text-2xl font-bold text-white">¡Tu comprobante!</h1>
            <p className="mb-5 text-sm text-gray-400">
              Estás participando por <span className="text-white">{data.premio}</span>
            </p>

            <div className="mb-5 rounded-xl border border-[#262626] bg-[#0a0a0a] p-4 text-left text-sm">
              <p className="mb-1">
                <span className="text-gray-400">Participante:</span>{" "}
                <span className="text-white font-semibold">{data.comprador.nombre}</span>
              </p>
              <p className="mb-3">
                <span className="text-gray-400">Chances:</span>{" "}
                <span className="text-white font-semibold">{data.comprador.cantidad_chances}</span>
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {numeros.map((n) => (
                  <span
                    key={n}
                    className="rounded-lg bg-gradient-to-br from-[#ff0040] to-[#cc0033] px-3 py-1.5 font-mono text-base font-extrabold text-white"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={descargar}
              disabled={descargando}
              className="w-full rounded-xl bg-[#ff0040] px-6 py-3 font-bold text-white transition hover:bg-[#cc0033] disabled:opacity-60"
            >
              {descargando ? "Generando…" : "Descargar comprobante"}
            </button>

            {/* El contenido digital ya no se entrega con la compra.
            <a
              href={`/api/descargar/${id}`}
              className="mt-3 block w-full rounded-xl border border-[#262626] bg-[#0a0a0a] px-6 py-3 font-bold text-white transition hover:bg-[#1b1b1b]"
            >
              Descargá tu contenido
            </a> */}

            <p className="mt-4 text-xs text-gray-500">¡Mucha suerte! 🍀</p>
          </div>
        )}
      </div>
    </div>
  )
}
