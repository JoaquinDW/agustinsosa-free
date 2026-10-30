import { supabase } from "./supabase"
import { callAdminDatabase } from "./admin-database-client"
import { TEXTOS_RANKING_DEFAULTS, type TextosRanking } from "./contenido-ranking"

// Links de interés / redes sociales que se muestran en la página pública
export type TipoRed =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "x"
  | "whatsapp"
  | "telegram"
  | "web"

export interface RedSocial {
  tipo: TipoRed
  etiqueta: string
  url: string
}

// Una sección de los Términos y Condiciones (título + cuerpo)
export interface SeccionTerminos {
  titulo: string
  contenido: string
}

export const TIPOS_RED: { valor: TipoRed; etiqueta: string }[] = [
  { valor: "instagram", etiqueta: "Instagram" },
  { valor: "facebook", etiqueta: "Facebook" },
  { valor: "tiktok", etiqueta: "TikTok" },
  { valor: "youtube", etiqueta: "YouTube" },
  { valor: "x", etiqueta: "X (Twitter)" },
  { valor: "whatsapp", etiqueta: "Canal de WhatsApp" },
  { valor: "telegram", etiqueta: "Canal de Telegram" },
  { valor: "web", etiqueta: "Otro link" },
]

// Textos editables de la página pública. Se guardan como JSON en la tabla
// `configuracion` (clave "contenido_sitio") y se mergean con estos defaults,
// así agregar un campo nuevo acá no requiere migración.
export interface ContenidoSitio extends TextosRanking {
  rankingVisible: boolean
  // General
  marca: string
  whatsapp_url: string

  // Hero
  hero_badge: string
  hero_titulo: string
  hero_subtitulo: string
  hero_chances_label: string
  hero_completado_label: string
  hero_completo_titulo: string
  hero_completo_descripcion: string
  hero_sorteado_titulo: string
  hero_cerrado_titulo: string
  hero_cerrado_descripcion: string

  // Packs
  packs_popular_label: string
  packs_comprar_boton: string
  packs_nota: string
  packs_unidad_singular: string
  packs_unidad_plural: string
  packs_linea_secundaria_singular: string
  packs_linea_secundaria_plural: string

  // Premios
  premios_kicker: string
  premios_titulo: string
  premios_primer_label: string
  premios_sec_label: string
  premios_sec_descripcion: string

  // FAQ
  faq_titulo: string
  faq_pregunta_fecha: string
  faq_pregunta_ganador: string
  faq_respuesta_ganador: string
  faq_link_quiniela: string

  // Consulta de números
  consulta_kicker: string
  consulta_titulo: string
  consulta_descripcion: string
  consulta_placeholder: string
  consulta_boton: string
  consulta_vacio: string
  consulta_vacio_nota: string

  // Ganadores Express
  express_kicker: string
  express_titulo: string

  // Ganadores Anteriores
  pasados_cta_texto: string
  pasados_cta_boton: string
  pasados_kicker: string
  pasados_titulo: string
  pasados_descripcion: string

  // Links de interés / redes sociales
  redes_kicker: string
  redes_titulo: string
  redes_descripcion: string
  redes: RedSocial[]

  // Pantalla "Próximamente" (sin sorteo activo)
  proximamente_titulo: string
  proximamente_descripcion: string
  proximamente_boton: string

  // Footer
  footer_copyright: string

  // Términos y Condiciones (página /terminos)
  terminos_titulo: string
  terminos: SeccionTerminos[]
}

// Claves de ContenidoSitio cuyo valor es un texto simple (excluye `redes`)
export type ClaveTextoContenido = {
  [K in keyof ContenidoSitio]: ContenidoSitio[K] extends string ? K : never
}[keyof ContenidoSitio]

export const CONTENIDO_DEFAULTS: ContenidoSitio = {
  ...TEXTOS_RANKING_DEFAULTS,
  rankingVisible: true,
  marca: "Sosa Motos",
  whatsapp_url: "https://wa.me/5493795152063",

  hero_badge: "Premio Exclusivo",
  hero_titulo: "¡Participá por {premio}!",
  hero_subtitulo: "Compra que se van volando!",
  hero_chances_label: "Números vendidos",
  hero_completado_label: "completado",
  hero_completo_titulo: "¡Todas las prendas vendidas!",
  hero_completo_descripcion:
    "El sorteo se realizará mañana a las 14:00 hs según el primer número de la Quiniela de Buenos Aires",
  hero_sorteado_titulo: "Resultados",
  hero_cerrado_titulo: "¡Gracias por participar!",
  hero_cerrado_descripcion: "Mucha suerte a todos!",

  packs_popular_label: "Más popular",
  packs_comprar_boton: "Comprar",
  packs_nota: "Mientras más chances comprás, más posibilidades de ganar.",
  packs_unidad_singular: "Número",
  packs_unidad_plural: "Números",
  packs_linea_secundaria_singular: "{cantidad} Participación promocional",
  packs_linea_secundaria_plural: "{cantidad} Participaciones promocionales",

  premios_kicker: "Lo que podés ganar",
  premios_titulo: "Premios",
  premios_primer_label: "1er Premio",
  premios_sec_label: "Premios Secundarios",
  premios_sec_descripcion: "Si te toca alguno de estos números ganás {monto}",

  faq_titulo: "Preguntas frecuentes",
  faq_pregunta_fecha: "¿Cuándo se realiza el evento?",
  faq_pregunta_ganador: "¿En dónde vemos el ganador?",
  faq_respuesta_ganador: "Quiniela de Buenos Aires — La Previa · 10:15 hs",
  faq_link_quiniela:
    "https://www.loteriasmundiales.com.ar/Quinielas/buenos-aires",

  consulta_kicker: "Participantes",
  consulta_titulo: "¿Ya participaste?",
  consulta_descripcion:
    "Ingresá el email con el que compraste para ver tus números asignados.",
  consulta_placeholder: "tucorreo@email.com",
  consulta_boton: "Consultar",
  consulta_vacio: "No encontramos participaciones confirmadas para ese email.",
  consulta_vacio_nota:
    "Si pagaste por transferencia, tu pago puede estar pendiente de aprobación.",

  express_kicker: "Premios instantáneos",
  express_titulo: "Ganadores Express",

  pasados_cta_texto: "¿Tenés consultas?",
  pasados_cta_boton: "WhatsApp",
  pasados_kicker: "Historial",
  pasados_titulo: "Ganadores Anteriores",
  pasados_descripcion: "Conocé a las personas que ya ganaron con nosotros",

  redes_kicker: "Comunidad",
  redes_titulo: "Links de interés",
  redes_descripcion:
    "Seguinos en nuestras redes para enterarte de nuevos sorteos y ganadores.",
  redes: [
    {
      tipo: "whatsapp",
      etiqueta: "WhatsApp",
      url: "https://wa.me/5493795152063",
    },
  ],

  proximamente_titulo: "Próximamente",
  proximamente_descripcion:
    "Estamos preparando el próximo sorteo. ¡Volvé pronto!",
  proximamente_boton: "Avisame cuando arranque",

  footer_copyright: "© 2025 Sosa Motos. Todos los derechos reservados.",

  terminos_titulo: "Términos y Condiciones de Uso",
  terminos: [
    {
      titulo: "1. Objeto del Sitio",
      contenido:
        "El presente sitio web tiene por finalidad la comercialización de productos digitales consistentes en diseños exclusivos de remeras en formato descargable.",
    },
    {
      titulo: "2. Productos Digitales",
      contenido:
        "Cada compra corresponde al acceso a un archivo digital, sin entrega física. El comprador recibe una licencia de uso personal y no transferible del diseño adquirido.",
    },
    {
      titulo: "3. Propiedad Intelectual",
      contenido:
        "Todos los diseños ofrecidos en este sitio son propiedad de Sosa Motos y están protegidos por las leyes de propiedad intelectual.",
    },
    {
      titulo: "4. Medios de Pago",
      contenido:
        "El pago de los productos digitales se realizará mediante las plataformas habilitadas en el sitio web.",
    },
    {
      titulo: "5. Modificaciones",
      contenido:
        "Sosa Motos se reserva el derecho de modificar los presentes términos y condiciones en cualquier momento.",
    },
    {
      titulo: "6. Ley de Lealtad Comercial",
      contenido:
        "Sujeto sin obligación de compra ley de lealtad comercial 22802 república argentina.",
    },
    {
      titulo: "7. Premio Gratuito",
      contenido:
        "El premio gratis por la compra de la remera digital se realiza por lotería de Buenos Aires cuando se venden todas las remeras digitales disponibles, y se anunciará por la página quién recibe el regalo 🎁🤩",
    },
    {
      titulo: "8. Requisitos para Ganar",
      contenido:
        "Todos los ganadores, sin excepción, deben grabar un video claro y conciso que los identifique como ganadores del sorteo.",
    },
  ],
}

const CLAVE_CONTENIDO = "contenido_sitio"

export async function obtenerContenido(): Promise<ContenidoSitio> {
  try {
    const { data } = await supabase
      .from("configuracion")
      .select("valor")
      .eq("clave", CLAVE_CONTENIDO)
      .maybeSingle()

    if (!data?.valor) return CONTENIDO_DEFAULTS

    const guardado = JSON.parse(data.valor) as Partial<ContenidoSitio>
    return { ...CONTENIDO_DEFAULTS, ...guardado }
  } catch (error) {
    console.error("Error obteniendo contenido del sitio:", error)
    return CONTENIDO_DEFAULTS
  }
}

// Guarda SOLO los campos que cambiaron. Relee el valor actual de la base y
// fusiona los cambios encima, de modo que un guardado nunca pisa campos que no
// se editaron (evita perder secciones enteras como los términos). Ver el
// historial automático (trigger `trg_historial_configuracion`) para recuperar
// versiones anteriores si algo se sobrescribe de todos modos.
export async function actualizarContenido(
  cambios: Partial<ContenidoSitio>,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("actualizarContenido", [cambios])
  }
  try {
    // 1. Valor crudo actual (sin mergear defaults, para no persistir defaults
    //    de campos nunca personalizados).
    const { data } = await supabase
      .from("configuracion")
      .select("valor")
      .eq("clave", CLAVE_CONTENIDO)
      .maybeSingle()

    let guardadoActual: Partial<ContenidoSitio> = {}
    if (data?.valor) {
      try {
        guardadoActual = JSON.parse(data.valor) as Partial<ContenidoSitio>
      } catch (error) {
        console.error("Error parseando contenido guardado:", error)
        guardadoActual = {}
      }
    }

    // 2. Fusionar solo lo que cambió sobre el valor fresco de la base.
    const nuevo = { ...guardadoActual, ...cambios }

    // 3. Escribir el resultado.
    const { error } = await supabase.from("configuracion").upsert([
      {
        clave: CLAVE_CONTENIDO,
        valor: JSON.stringify(nuevo),
        updated_at: new Date().toISOString(),
      },
    ])

    if (error) {
      console.error("Error actualizando contenido del sitio:", error)
      return false
    }
    return true
  } catch (error) {
    console.error("Error actualizando contenido del sitio:", error)
    return false
  }
}

// Reemplaza placeholders tipo {premio} o {monto} en un texto editable
export function conPlaceholders(
  texto: string,
  valores: Record<string, string>,
): string {
  return texto.replace(/\{(\w+)\}/g, (match, clave) => valores[clave] ?? match)
}
