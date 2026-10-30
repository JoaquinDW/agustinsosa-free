const PARTE_NOMBRE = /^\p{L}+(?:[-'’]\p{L}+)*$/u
export const LIMITE_RANKING_PUBLICO = 20

export function anonimizarNombreRanking(nombre: string | null | undefined): string {
  const partes = (nombre ?? "").trim().split(/\s+/).filter((parte) => PARTE_NOMBRE.test(parte))
  if (!partes.length) return "Participante"

  const primerNombre = partes[0].toLocaleLowerCase("es-AR")
  const nombreCorto = Array.from(primerNombre).slice(0, 20).join("")
  const nombreCapitalizado = nombreCorto.charAt(0).toLocaleUpperCase("es-AR") + nombreCorto.slice(1)
  if (partes.length === 1) return nombreCapitalizado

  const inicial = Array.from(partes[partes.length - 1])[0].toLocaleUpperCase("es-AR")
  return `${nombreCapitalizado} ${inicial}.`
}

export function prepararRankingPublico(filas: Array<{ nombre: string | null; chances: number }>) {
  return filas.map((fila, index) => ({
    puesto: index + 1,
    nombre: anonimizarNombreRanking(fila.nombre),
    chances: fila.chances,
  }))
}
