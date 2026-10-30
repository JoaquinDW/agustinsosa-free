import type { Metadata } from "next"
import Image from "next/image"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Próximamente | Sosa Motos",
  description: "Estamos preparando la próxima experiencia de Sosa Motos.",
  robots: { index: false, follow: false, nocache: true },
}

export default function ProximamentePage() {
  return (
    <main className="coming-soon-shell">
      <div className="coming-soon-grid" aria-hidden="true" />
      <div className="coming-soon-glow" aria-hidden="true" />

      <section className="coming-soon-content" aria-labelledby="coming-soon-title">
        <div className="coming-soon-logo-wrap">
          <Image
            src="/sosamotos.jpeg"
            alt="Sosa Motos"
            width={112}
            height={112}
            priority
            className="coming-soon-logo"
          />
        </div>

        <p className="coming-soon-brand">SOSA MOTOS</p>
        <div className="coming-soon-rule" aria-hidden="true" />
        <h1 id="coming-soon-title" className="coming-soon-title">
          PRÓXIMAMENTE
        </h1>
        <p className="coming-soon-copy">
          Estamos preparando algo grande. Muy pronto vas a poder descubrirlo.
        </p>
      </section>
    </main>
  )
}
