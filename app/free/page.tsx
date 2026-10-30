"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormularioGratis } from "@/components/formulario-gratis"
import { IntroParticipacionGratuita } from "@/components/intro-participacion-gratuita"
import {
  obtenerContenido,
  CONTENIDO_DEFAULTS,
  type ContenidoSitio,
} from "@/lib/contenido"

export default function FreePage() {
  const [contenido, setContenido] = useState<ContenidoSitio>(CONTENIDO_DEFAULTS)

  useEffect(() => {
    obtenerContenido().then(setContenido)
  }, [])

  return (
    <div className="min-h-screen bg-dark-gradient">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-xl font-bold neon-text">{contenido.marca}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <IntroParticipacionGratuita />
          <FormularioGratis volverAlInicio />
        </div>
      </main>
    </div>
  )
}
