"use client"

import {
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Send,
  MessageCircle,
  Music2,
  Globe,
  type LucideIcon,
} from "lucide-react"
import type { ContenidoSitio, TipoRed } from "@/lib/contenido"

const ICONOS: Record<TipoRed, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  youtube: Youtube,
  x: Twitter,
  whatsapp: MessageCircle,
  telegram: Send,
  web: Globe,
}

export function RedesSociales({ contenido }: { contenido: ContenidoSitio }) {
  const redes = (contenido.redes ?? []).filter((red) => red.url.trim())

  if (redes.length === 0) return null

  return (
    <section className="py-16 border-t border-gray-900">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#ff0040] mb-3">
          {contenido.redes_kicker}
        </p>
        <h2 className="text-4xl lg:text-5xl font-display tracking-wider text-white mb-3">
          {contenido.redes_titulo}
        </h2>
        {contenido.redes_descripcion && (
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {contenido.redes_descripcion}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {redes.map((red, index) => {
            const Icono = ICONOS[red.tipo] ?? Globe
            return (
              <a
                key={`${red.url}-${index}`}
                href={red.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-[#111] border border-gray-800 hover:border-[#ff0040]/60 text-gray-300 hover:text-white px-5 py-3 rounded-xl text-sm font-medium tracking-wide transition-colors duration-200"
              >
                <Icono className="w-4 h-4 text-[#ff0040]" />
                {red.etiqueta || red.url}
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
