"use client"

import { useState, useEffect } from "react"
import { obtenerGanadoresExpress } from "@/lib/database"
import type { GanadorExpress } from "@/lib/supabase"
import { Trophy } from "lucide-react"
import { CONTENIDO_DEFAULTS, type ContenidoSitio } from "@/lib/contenido"

interface GanadoresExpressProps {
  sorteoId?: string
  contenido?: ContenidoSitio
}

export function GanadoresExpress({
  sorteoId,
  contenido = CONTENIDO_DEFAULTS,
}: GanadoresExpressProps) {
  const [ganadores, setGanadores] = useState<GanadorExpress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarGanadores()
  }, [sorteoId])

  const cargarGanadores = async () => {
    try {
      const data = await obtenerGanadoresExpress(sorteoId)
      setGanadores(data)
    } catch (error) {
      console.error("Error cargando ganadores express:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || ganadores.length === 0) {
    return null
  }

  return (
    <section className="py-12 border-t border-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ff0040] mb-3">
            {contenido.express_kicker}
          </p>
          <h2 className="text-4xl lg:text-5xl font-display tracking-wider text-white flex items-center justify-center gap-3">
            <Trophy className="w-7 h-7 text-yellow-500" />
            {contenido.express_titulo}
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-2">
          {ganadores.map((ganador, index) => (
            <div
              key={ganador.id}
              className="bg-[#111] border border-gray-800 rounded-xl px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3 hover:border-gray-700 transition-colors duration-200"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Número */}
              <div className="bg-[#ff0040]/10 border border-[#ff0040]/20 rounded-lg px-3 py-2 flex-shrink-0 min-w-[60px] text-center">
                <p className="text-[#ff0040] font-mono font-bold text-base md:text-xl">
                  {ganador.numero_ganador}
                </p>
              </div>

              {/* Premio */}
              <div className="flex-1 text-center">
                <p className="text-white font-semibold text-sm md:text-base">
                  {ganador.premio_monto}
                </p>
              </div>

              {/* Nombre */}
              <div className="flex items-center gap-2 flex-shrink-0 max-w-[160px]">
                <p className="text-gray-400 text-sm font-medium truncate">
                  {ganador.nombre_ganador || "Anónimo"}
                </p>
                <Trophy className="w-4 h-4 text-yellow-500/70 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
