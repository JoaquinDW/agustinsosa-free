"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  obtenerContenido,
  CONTENIDO_DEFAULTS,
  type ContenidoSitio,
} from "@/lib/contenido"

export default function TerminosPage() {
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

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card-dark backdrop-blur-sm rounded-2xl p-8 neon-border">
            <h1 className="text-4xl font-bold text-white mb-8 text-center">
              {contenido.terminos_titulo}
            </h1>

            <div className="space-y-8 text-gray-300 leading-relaxed">
              {contenido.terminos.map((seccion, index) => (
                <section key={index}>
                  <h2 className="text-2xl font-bold text-white mb-4 neon-text">
                    {seccion.titulo}
                  </h2>
                  <p className="text-lg whitespace-pre-line">
                    {seccion.contenido}
                  </p>
                </section>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link href="/">
                <Button className="btn-neon px-8 py-3">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Inicio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/50 backdrop-blur-sm border-t border-gray-800 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500">
            <p>{contenido.footer_copyright}</p>
            <p className="mt-2">
              <Link
                href={"https://www.deweertstudio.com/"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:neon-text transition-colors"
              >
                Desarrollado por De Weert Studio
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
