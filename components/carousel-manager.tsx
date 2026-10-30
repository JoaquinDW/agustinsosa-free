"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/image-upload"
import { X, Upload } from "lucide-react"
import type { Sorteo } from "@/lib/supabase"

interface CarouselManagerProps {
  sorteo: Sorteo
  onImagenesActualizadas: (sorteo: Sorteo) => void
}

export function CarouselManager({
  sorteo,
  onImagenesActualizadas,
}: CarouselManagerProps) {
  const [loading, setLoading] = useState(false)

  const handleImagenCambiada = async (
    imagenUrl: string,
    posicion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  ) => {
    if (!sorteo || sorteo.id === "default") {
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/actualizar-carousel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sorteoId: sorteo.id,
          posicion,
          imagenUrl,
        }),
      })

      if (response.ok) {
        const sorteoActualizado = { ...sorteo }
        if (posicion === 1) sorteoActualizado.carousel_image_1 = imagenUrl
        if (posicion === 2) sorteoActualizado.carousel_image_2 = imagenUrl
        if (posicion === 3) sorteoActualizado.carousel_image_3 = imagenUrl
        if (posicion === 4) sorteoActualizado.carousel_image_4 = imagenUrl
        if (posicion === 5) sorteoActualizado.carousel_image_5 = imagenUrl
        if (posicion === 6) sorteoActualizado.carousel_image_6 = imagenUrl
        if (posicion === 7) sorteoActualizado.carousel_image_7 = imagenUrl
        if (posicion === 8) sorteoActualizado.carousel_image_8 = imagenUrl

        onImagenesActualizadas(sorteoActualizado)
      }
    } catch (error) {
      console.error("Error actualizando imagen del carrusel:", error)
    } finally {
      setLoading(false)
    }
  }

  const eliminarImagen = async (posicion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) => {
    if (!sorteo || sorteo.id === "default") {
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/actualizar-carousel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sorteoId: sorteo.id,
          posicion,
          imagenUrl: null,
        }),
      })

      if (response.ok) {
        const sorteoActualizado = { ...sorteo }
        if (posicion === 1) sorteoActualizado.carousel_image_1 = null
        if (posicion === 2) sorteoActualizado.carousel_image_2 = null
        if (posicion === 3) sorteoActualizado.carousel_image_3 = null
        if (posicion === 4) sorteoActualizado.carousel_image_4 = null
        if (posicion === 5) sorteoActualizado.carousel_image_5 = null
        if (posicion === 6) sorteoActualizado.carousel_image_6 = null
        if (posicion === 7) sorteoActualizado.carousel_image_7 = null
        if (posicion === 8) sorteoActualizado.carousel_image_8 = null

        onImagenesActualizadas(sorteoActualizado)
      }
    } catch (error) {
      console.error("Error eliminando imagen del carrusel:", error)
    } finally {
      setLoading(false)
    }
  }

  const imagenes = [
    {
      posicion: 1 as const,
      url: sorteo.carousel_image_1,
      label: "Imagen 1",
    },
    {
      posicion: 2 as const,
      url: sorteo.carousel_image_2,
      label: "Imagen 2",
    },
    {
      posicion: 3 as const,
      url: sorteo.carousel_image_3,
      label: "Imagen 3",
    },
    {
      posicion: 4 as const,
      url: sorteo.carousel_image_4,
      label: "Imagen 4",
    },
    {
      posicion: 5 as const,
      url: sorteo.carousel_image_5,
      label: "Imagen 5",
    },
    {
      posicion: 6 as const,
      url: sorteo.carousel_image_6,
      label: "Imagen 6",
    },
    {
      posicion: 7 as const,
      url: sorteo.carousel_image_7,
      label: "Imagen 7",
    },
    {
      posicion: 8 as const,
      url: sorteo.carousel_image_8,
      label: "Imagen 8",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Carrusel de Imágenes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-gray-600">
          Gestiona hasta 8 imágenes que aparecerán en el carrusel de la página principal.
        </p>

        <div className="grid gap-6 md:grid-cols-4">
          {imagenes.map(({ posicion, url, label }) => (
            <div key={posicion} className="space-y-3">
              <h4 className="font-medium text-sm">{label}</h4>

              {url ? (
                <div className="relative">
                  <img
                    src={url}
                    alt={`Carrusel imagen ${posicion}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => eliminarImagen(posicion)}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-500 mb-3">Sin imagen</p>
                  <ImageUpload
                    onImageChange={(url: string) =>
                      handleImagenCambiada(url, posicion)
                    }
                    disabled={loading}
                  />
                </div>
              )}

              {url && (
                <ImageUpload
                  currentImage={url}
                  onImageChange={(url: string) =>
                    handleImagenCambiada(url, posicion)
                  }
                  disabled={loading}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
