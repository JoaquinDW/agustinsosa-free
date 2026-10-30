import Link from "next/link"
import { Clover } from "lucide-react"

/** Encabezado legal de la participación gratuita. */
export function IntroParticipacionGratuita() {
  return (
    <div className="bg-card-dark backdrop-blur-sm rounded-2xl p-8 neon-border mb-6">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Clover className="w-7 h-7 text-green-400" />
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
          Participación gratuita
        </h1>
        <Clover className="w-7 h-7 text-green-400" />
      </div>
      <p className="text-gray-400 leading-relaxed mb-3">
        Completá y participá gratuitamente en la promoción vigente de SOSA
        MOTOS. La participación es sin obligación de compra y en igualdad de
        condiciones. La compra de productos o servicios no aumenta tus
        posibilidades de ganar.
      </p>
      <p className="text-gray-300 font-semibold leading-relaxed">
        Promoción sujeta a{" "}
        <Link href="/terminos" className="neon-text underline">
          Bases y Condiciones
        </Link>
        . Participan únicamente mayores de 18 años. No se venden números,
        rifas, bonos, apuestas ni participaciones.
      </p>
    </div>
  )
}
