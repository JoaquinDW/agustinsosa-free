export interface PremioRanking {
  puesto: 1 | 2 | 3
  titulo: string
  descripcion: string
  imagenUrl: string
  montoGuaranies: string
}

export interface ResultadoRanking extends Omit<PremioRanking, "puesto"> {
  puesto: number
  personaKey: string
  nombre: string
  nombrePublico: string
  email: string | null
  telefono: string | null
  chances: number
}

export const PREMIOS_RANKING_VACIOS: PremioRanking[] = ([1, 2, 3] as const).map((puesto) => ({
  puesto, titulo: "", descripcion: "", imagenUrl: "", montoGuaranies: "",
}))

export function validarPremiosRanking(input: unknown): PremioRanking[] {
  if (!Array.isArray(input) || input.length !== 3) throw new Error("Configurá los tres puestos del ranking")
  return ([1, 2, 3] as const).map((puesto) => {
    const item = input.find((valor) => valor?.puesto === puesto)
    if (!item || typeof item.titulo !== "string" || typeof item.descripcion !== "string" || typeof item.imagenUrl !== "string") {
      throw new Error(`Premio del puesto ${puesto} inválido`)
    }
    const titulo = item.titulo.trim()
    const descripcion = item.descripcion.trim()
    const imagenUrl = item.imagenUrl.trim()
    const montoGuaranies = item.montoGuaranies === undefined ? "" : item.montoGuaranies
    if (typeof montoGuaranies !== "string" || (montoGuaranies !== "" && (!/^\d{1,15}$/.test(montoGuaranies) || Number(montoGuaranies) === 0))) {
      throw new Error(`Monto en guaraníes del puesto ${puesto} inválido`)
    }
    if (titulo.length > 100 || descripcion.length > 280 || imagenUrl.length > 500) throw new Error(`Premio del puesto ${puesto} demasiado largo`)
    if (imagenUrl && (!imagenUrl.startsWith("https://") || !/^https:\/\/[^\s]+$/.test(imagenUrl))) throw new Error(`Imagen del puesto ${puesto} inválida`)
    return { puesto, titulo, descripcion, imagenUrl, montoGuaranies }
  })
}

export function resumenPremiosRanking(premios: PremioRanking[]): string {
  return premios.filter((premio) => premio.titulo).map((premio) => `${premio.puesto}° ${premio.titulo}`).join(" · ")
}

export function publicarResultadoRanking(resultado: ResultadoRanking[]) {
  return resultado.map(({ puesto, nombrePublico, chances }) => ({ puesto, nombre: nombrePublico, chances }))
}
