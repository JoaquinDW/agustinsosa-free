// Valores iniciales para sitios que todavía no personalizaron estos textos.
export const TEXTOS_RANKING_DEFAULTS = {
  rankingKicker: "Ranking en vivo",
  rankingTitulo: "Los que más chances tienen",
  rankingResultadoFinal: "Resultado final",
  rankingLugarLibre: "Lugar libre",
  rankingSinParticipante: "Sin participante",
  rankingChances: "chances",
  rankingSumarChancesPodio: "Sumá chances",
  rankingCargando: "Preparando el podio…",
  rankingError: "No pudimos cargar el ranking. Actualizá la página para volver a intentar.",
  rankingVacio: "Todavía no hay compras confirmadas. El podio está abierto.",
  rankingPremiosIntro: "¡Los 3 participantes con más chances",
  rankingPremiosActivo: "al finalizar el sorteo se llevan los premios!",
  rankingPremiosFinal: "al finalizar el sorteo se llevaron los premios!",
  rankingTablaTitulo: "Siguen en carrera",
  rankingTopActivo: "Top {cantidad} en vivo",
  rankingTopFinal: "Top 20 final",
  rankingCtaTitulo: "Subí en el ranking",
  rankingCtaBoton: "Sumar chances",
  rankingVerCompleto: "Ver ranking completo",
  rankingPodioEtiqueta: "Los tres primeros puestos",
  rankingActualizacionEtiqueta: "Actualiza en {tiempo}",
  rankingReintentoEtiqueta: "Reintento en {tiempo}",
}

export type TextosRanking = typeof TEXTOS_RANKING_DEFAULTS

// Envía al componente público únicamente los textos que utiliza.
export function obtenerTextosRanking(contenido: TextosRanking): TextosRanking {
  const textos = { ...TEXTOS_RANKING_DEFAULTS }
  for (const clave of Object.keys(textos) as (keyof TextosRanking)[]) {
    textos[clave] = contenido[clave]
  }
  return textos
}
