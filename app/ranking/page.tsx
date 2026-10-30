import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { RankingEnVivo } from "@/components/ranking-en-vivo"
import { obtenerContenido } from "@/lib/contenido"
import { obtenerTextosRanking } from "@/lib/contenido-ranking"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Ranking en vivo | Sosa Motos",
  description: "Conocé el ranking de chances del sorteo actual.",
}

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ tv?: string | string[] }> }) {
  const [contenido, parametros] = await Promise.all([obtenerContenido(), searchParams])
  if (!contenido.rankingVisible) notFound()

  // /ranking?tv=1: vista para dejar fija en una tele, sin menú ni pie y sin scroll.
  if (parametros.tv === "1") {
    return <main className="bg-black">
      <RankingEnVivo textos={obtenerTextosRanking(contenido)} pagina tv />
    </main>
  }

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Header marca={contenido.marca} rankingVisible />
      <main>
        <RankingEnVivo textos={obtenerTextosRanking(contenido)} pagina />
      </main>
      <footer className="border-t border-white/10 bg-black px-4 py-6 text-center text-xs text-zinc-600">
        {contenido.footer_copyright}
      </footer>
    </div>
  )
}
