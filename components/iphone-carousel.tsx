"use client"

import React, { useState, useEffect, useCallback } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { obtenerSorteoActivo } from "@/lib/database"
import type { Sorteo } from "@/lib/supabase"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function IphoneCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [sorteo, setSorteo] = useState<Sorteo | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const cargarSorteo = async () => {
      try {
        const sorteoActivo = await obtenerSorteoActivo()
        setSorteo(sorteoActivo)
      } catch (error) {
        console.error("Error cargando sorteo:", error)
      }
    }
    cargarSorteo()
  }, [])

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap())
    }

    emblaApi.on("select", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi])

  // Usar imágenes del carrusel si están disponibles
  const slides = [
    sorteo?.carousel_image_1,
    sorteo?.carousel_image_2,
    sorteo?.carousel_image_3,
    sorteo?.carousel_image_4,
    sorteo?.carousel_image_5,
    sorteo?.carousel_image_6,
    sorteo?.carousel_image_7,
    sorteo?.carousel_image_8,
  ].filter((img): img is string => Boolean(img)) // Filtrar nulls/undefined con type guard

  // Si no hay imágenes del carousel, usar placeholders por defecto
  const finalSlides: string[] =
    slides.length > 0
      ? slides
      : [
          "/placeholder.jpg",
          "/white-t-shirt-mockup-t-shirt-with-short-sleeves-ai-generative-free-png.webp",
          "/placeholder-user.jpg",
        ]

  return (
    <div className="relative w-full max-w-md sm:max-w-lg md:max-w-2xl mx-auto">
      <div className="overflow-hidden rounded-xl" ref={emblaRef as any}>
        <div className="flex">
          {finalSlides.map((src, idx) => (
            <div key={idx} className="flex-[0_0_100%] min-w-0">
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                {/* Imagen principal — usa la relación de aspecto natural, sin márgenes */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Slide ${idx + 1}`}
                  className="block w-full h-auto"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controles de navegación */}
      {finalSlides.length > 1 && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200 z-10"
            onClick={scrollPrev}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200 z-10"
            onClick={scrollNext}
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots indicadores */}
          <div className="flex justify-center mt-4 space-x-2">
            {finalSlides.map((_, idx) => (
              <button
                key={idx}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  idx === currentIndex
                    ? "bg-red-500 glow-red"
                    : "bg-gray-400 hover:bg-gray-300"
                }`}
                onClick={() => emblaApi?.scrollTo(idx)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
