"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { GanadorPasado } from "@/lib/supabase"
import { obtenerGanadoresPasados } from "@/lib/database"
import { CONTENIDO_DEFAULTS, type ContenidoSitio } from "@/lib/contenido"

// Cada slide del carrusel representa la imagen de un ganador.
interface Slide {
  ganadorId: string
  nombre: string
  imagen: string | null
}

interface GanadorSlideProps {
  slide: Slide
}

function GanadorSlide({ slide }: GanadorSlideProps) {
  return (
    <Card className="bg-[#111] border-gray-800 overflow-hidden h-full">
      <CardContent className="p-0 h-full">
        <div className="grid md:grid-cols-2 gap-0 h-full">
          {/* Columna de imagen */}
          <div className="relative bg-[#0d0d0d] aspect-square md:aspect-auto md:min-h-[480px]">
            {slide.imagen ? (
              <div className="absolute inset-0 flex items-center justify-center p-2 md:p-3">
                <img
                  src={slide.imagen}
                  alt={slide.nombre}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 min-h-[300px]">
                <div className="w-24 h-24 rounded-full bg-yellow-500/8 flex items-center justify-center border border-yellow-500/15">
                  <Trophy className="h-12 w-12 text-yellow-500/40" />
                </div>
              </div>
            )}
          </div>

          {/* Columna de información */}
          <div className="p-8 md:p-10 flex flex-col justify-center space-y-6">
            <Badge
              variant="outline"
              className="bg-yellow-500/8 text-yellow-500/80 border-yellow-500/20 w-fit text-xs"
            >
              <Trophy className="h-3 w-3 mr-1" />
              Ganador
            </Badge>

            <div>
              <h3 className="text-3xl md:text-4xl font-display tracking-wide text-white mb-3">
                {slide.nombre}
              </h3>
              <div className="h-0.5 w-12 bg-[#ff0040]/40 rounded-full"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function GanadoresPasados({
  contenido = CONTENIDO_DEFAULTS,
}: {
  contenido?: ContenidoSitio
}) {
  const [ganadores, setGanadores] = useState<GanadorPasado[]>([])
  const [loading, setLoading] = useState(true)
  const [slideActual, setSlideActual] = useState(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    cargarGanadores()
  }, [])

  // Aplana cada ganador (con sus imágenes) en slides individuales del carrusel.
  const slides = useMemo<Slide[]>(() => {
    return ganadores.flatMap<Slide>((ganador) => {
      const imagenes = [
        ganador.imagen_1_url,
        ganador.imagen_2_url,
        ganador.imagen_3_url,
      ].filter(Boolean) as string[]

      if (imagenes.length === 0) {
        return [{ ganadorId: ganador.id, nombre: ganador.nombre_ganador, imagen: null }]
      }

      return imagenes.map((imagen) => ({
        ganadorId: ganador.id,
        nombre: ganador.nombre_ganador,
        imagen,
      }))
    })
  }, [ganadores])

  const totalSlides = slides.length

  // Mantiene el índice dentro de rango si cambia la cantidad de slides.
  useEffect(() => {
    if (slideActual >= totalSlides) setSlideActual(0)
  }, [totalSlides, slideActual])

  // Auto-avance del carrusel (se detiene al pasar el mouse por encima).
  useEffect(() => {
    if (pausado || totalSlides <= 1) return
    const id = setInterval(() => {
      setSlideActual((prev) => (prev + 1) % totalSlides)
    }, 4500)
    return () => clearInterval(id)
  }, [pausado, totalSlides])

  const siguienteSlide = () => setSlideActual((prev) => (prev + 1) % totalSlides)
  const anteriorSlide = () =>
    setSlideActual((prev) => (prev - 1 + totalSlides) % totalSlides)

  const cargarGanadores = async () => {
    try {
      const data = await obtenerGanadoresPasados()
      setGanadores(data)
    } catch (error) {
      console.error("Error cargando ganadores:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatearFecha = (fecha: string) => {
    const [year, month, day] = fecha.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
  }

  if (loading) {
    return (
      <section className="py-20 border-t border-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-500/8 rounded-full mb-4 border border-yellow-500/15">
              <Trophy className="h-6 w-6 text-yellow-500/60" />
            </div>
            <h2 className="text-4xl font-display tracking-wider text-white mb-4">
              {contenido.pasados_titulo}
            </h2>
            <p className="text-gray-600 text-sm">Cargando...</p>
          </div>
        </div>
      </section>
    )
  }

  if (ganadores.length === 0) {
    return null
  }

  return (
    <>
      <section
        id="ganadores"
        className="py-16 border-t border-gray-900"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#ff0040] mb-3">
              {contenido.pasados_kicker}
            </p>
            <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-500/8 rounded-full mb-4 border border-yellow-500/15">
              <Trophy className="h-6 w-6 text-yellow-500/60" />
            </div>
            <h2 className="text-4xl lg:text-5xl font-display tracking-wider text-white mb-3">
              {contenido.pasados_titulo}
            </h2>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              {contenido.pasados_descripcion}
            </p>
          </div>

          {/* Carrusel único auto-rotativo con todos los ganadores */}
          <div
            className="relative max-w-5xl mx-auto"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
          >
            <div className="overflow-hidden rounded-lg">
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${slideActual * 100}%)` }}
              >
                {slides.map((slide, index) => (
                  <div
                    key={`${slide.ganadorId}-${index}`}
                    className="w-full flex-shrink-0"
                  >
                    <GanadorSlide slide={slide} />
                  </div>
                ))}
              </div>
            </div>

            {totalSlides > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 z-10"
                  onClick={anteriorSlide}
                  aria-label="Ganador anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 z-10"
                  onClick={siguienteSlide}
                  aria-label="Ganador siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                <div className="flex justify-center gap-1.5 mt-6">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSlideActual(index)}
                      aria-label={`Ir al ganador ${index + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        index === slideActual
                          ? "bg-[#ff0040] w-6"
                          : "bg-gray-700 hover:bg-gray-500 w-1.5"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
