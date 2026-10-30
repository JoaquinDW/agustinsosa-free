import { supabase } from "./supabase"
import { CONSENTIMIENTO_EMAIL, CONSENTIMIENTO_WHATSAPP } from "./consentimientos"

// Contactos de participantes gratuitos para promocionar el sitio principal.
// Tabla gratis.leads (scripts/31-crear-schema-gratis.sql): una fila por
// persona, deduplicada por email (sin distinguir mayúsculas) o teléfono.

export interface OrigenLead {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  referrer?: string
}

const CLAVES_ORIGEN: (keyof OrigenLead)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
]

// Solo acepta las claves conocidas y recorta cada valor.
export function limpiarOrigen(input: unknown): OrigenLead | null {
  if (!input || typeof input !== "object") return null
  const origen: OrigenLead = {}
  for (const clave of CLAVES_ORIGEN) {
    const valor = (input as Record<string, unknown>)[clave]
    if (typeof valor === "string" && valor.trim()) {
      origen[clave] = valor.trim().slice(0, 300)
    }
  }
  return Object.keys(origen).length ? origen : null
}

// Alta o actualización del lead. Un consentimiento ya dado no se pierde si en
// una participación posterior la persona no vuelve a tildarlo: solo una baja
// explícita (baja_at) lo anula.
export async function registrarLead({
  nombre,
  email,
  telefono,
  pais,
  aceptaEmail,
  aceptaWhatsapp,
  ip,
  origen,
  sorteoId,
}: {
  nombre: string
  email: string
  telefono: string | null
  pais: "AR" | "PY"
  aceptaEmail: boolean
  aceptaWhatsapp: boolean
  ip: string | null
  origen: OrigenLead | null
  sorteoId: string
}): Promise<void> {
  const ahora = new Date().toISOString()
  const emailNormalizado = email.trim().toLowerCase()

  // Los emails se guardan en minúscula, así que alcanza con eq. Las comillas
  // dobles protegen los caracteres reservados de PostgREST dentro de or().
  const filtros = [`email.eq."${emailNormalizado.replace(/["\\]/g, "")}"`]
  if (telefono) filtros.push(`telefono.eq.${telefono}`)

  const { data: existentes, error: errorBusqueda } = await supabase
    .from("leads")
    .select("*")
    .or(filtros.join(","))
    .limit(1)

  if (errorBusqueda) throw errorBusqueda

  const consentimiento =
    aceptaEmail || aceptaWhatsapp
      ? {
          consentimiento_texto: [
            aceptaEmail ? CONSENTIMIENTO_EMAIL : null,
            aceptaWhatsapp ? CONSENTIMIENTO_WHATSAPP : null,
          ]
            .filter(Boolean)
            .join(" "),
          consentimiento_at: ahora,
          consentimiento_ip: ip,
          // Volver a dar el consentimiento anula una baja anterior.
          baja_at: null,
        }
      : {}

  const existente = existentes?.[0]

  if (!existente) {
    const { error } = await supabase.from("leads").insert({
      nombre,
      email: emailNormalizado,
      telefono,
      pais,
      acepta_email: aceptaEmail,
      acepta_whatsapp: aceptaWhatsapp,
      ...consentimiento,
      origen,
      primer_sorteo_id: sorteoId,
      participaciones: 1,
      ultima_participacion_at: ahora,
    })
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from("leads")
    .update({
      nombre,
      email: existente.email ?? emailNormalizado,
      telefono: existente.telefono ?? telefono,
      pais: existente.pais ?? pais,
      acepta_email: existente.acepta_email || aceptaEmail,
      acepta_whatsapp: existente.acepta_whatsapp || aceptaWhatsapp,
      ...consentimiento,
      origen: existente.origen ?? origen,
      participaciones: (existente.participaciones ?? 0) + 1,
      ultima_participacion_at: ahora,
      updated_at: ahora,
    })
    .eq("id", existente.id)

  if (error) throw error
}
