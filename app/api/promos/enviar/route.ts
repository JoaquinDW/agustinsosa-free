import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/admin-api"
import { crearCampaniaPromo, obtenerConfiguracionWhatsApp, obtenerPremiosRanking, obtenerRankingSorteo, obtenerSorteo } from "@/lib/database"
import { resumenPremiosRanking } from "@/lib/ranking-premios"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { esNumeroTelefono, getWhatsAppBrandConfig, getWhatsAppProvider, normalizarTelefono } from "@/lib/whatsapp"

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized
  try {
    const body = await request.json()
    if (body.campaniaId) return enviarLote(String(body.campaniaId))

    const sorteoId = String(body.sorteoId || "")
    const porcentaje = Number(body.porcentaje)
    const usos = body.usos
    const venceAt = String(body.venceAt || "")
    const destinatarios = body.destinatarios
    const packsAplicables = body.packsAplicables == null ? null : body.packsAplicables
    const sorteo = await obtenerSorteo(sorteoId)
    if (!sorteo || sorteo.estado !== "activo") return NextResponse.json({ error: "Sorteo no disponible" }, { status: 400 })
    if (!Number.isInteger(porcentaje) || porcentaje < 1 || porcentaje > 90 || !["unico", "ilimitado"].includes(usos) ||
        !Number.isFinite(Date.parse(venceAt)) || Date.parse(venceAt) <= Date.now() ||
        !Array.isArray(destinatarios) || !destinatarios.length || destinatarios.length > 10000 ||
        !destinatarios.every((key: unknown) => typeof key === "string") ||
        (packsAplicables !== null && (!Array.isArray(packsAplicables) || !packsAplicables.every((n: unknown) => Number.isInteger(n))))) {
      return NextResponse.json({ error: "Datos de campaña inválidos" }, { status: 400 })
    }
    const packsVisibles = [1, 2, 3, 4, 5].filter((n) => sorteo[`pack_${n}_visible` as keyof typeof sorteo]).map((n) => Number(sorteo[`cantidad_pack_${n}` as keyof typeof sorteo]))
    if (packsAplicables?.some((cantidad: number) => !packsVisibles.includes(cantidad))) {
      return NextResponse.json({ error: "Pack no disponible" }, { status: 400 })
    }
    const ranking = await obtenerRankingSorteo(sorteoId)
    const elegibles = new Set(ranking.filter((fila) => esNumeroTelefono(fila.telefono) && normalizarTelefono(fila.telefono, fila.pais_transferencia)).map((fila) => fila.persona_key))
    if (destinatarios.some((key: string) => !elegibles.has(key))) {
      return NextResponse.json({ error: "Hay destinatarios sin teléfono válido" }, { status: 400 })
    }
    const resultado = await crearCampaniaPromo({ sorteoId, porcentaje, packsAplicables, usos, venceAt, destinatarios: [...new Set(destinatarios)] })
    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Error preparando campaña:", error)
    return NextResponse.json({ error: "No se pudo preparar la campaña" }, { status: 500 })
  }
}

async function enviarLote(campaniaId: string) {
  const brand = getWhatsAppBrandConfig()
  if (!brand.contentSidPromo && !brand.contentSidPromoRanking) return NextResponse.json({ error: "Falta TWILIO_CONTENT_SID_PROMO" }, { status: 503 })
  const { data: campania, error: errorCampania } = await supabaseAdmin.from("promo_campanias").select("*").eq("id", campaniaId).maybeSingle()
  if (errorCampania || !campania) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
  const { data: codigos, error: errorCodigos } = await supabaseAdmin.from("promo_codigos").select("*").eq("campania_id", campaniaId).order("created_at")
  if (errorCodigos) throw errorCodigos
  const ids = (codigos || []).map((c) => c.id)
  if (!ids.length) return NextResponse.json({ enviados: 0, errores: 0, pendientes: 0 })
  const { data: intentos, error: errorIntentos } = await supabaseAdmin.from("whatsapp_envios").select("promo_codigo_id").eq("tipo", "promo").in("promo_codigo_id", ids)
  if (errorIntentos) throw errorIntentos
  const intentados = new Set((intentos || []).map((e) => e.promo_codigo_id))
  const pendientes = (codigos || []).filter((c) => !intentados.has(c.id))
  const lote = pendientes.slice(0, 20)
  const config = await obtenerConfiguracionWhatsApp()
  const premios = await obtenerPremiosRanking(campania.sorteo_id)
  const premiosResumen = premios.every((premio) => premio.titulo)
    ? resumenPremiosRanking(premios.map((premio) => ({ ...premio, titulo: premio.titulo.slice(0, 50) })))
    : undefined
  if (!premiosResumen && !brand.contentSidPromo) return NextResponse.json({ error: "Falta TWILIO_CONTENT_SID_PROMO" }, { status: 503 })
  const provider = getWhatsAppProvider(brand)
  let enviados = 0
  let errores = 0
  for (const codigo of lote) {
    // La reserva única impide que dos requests concurrentes envíen el mismo código.
    const { data: reserva, error: errorReserva } = await supabaseAdmin.from("whatsapp_envios").insert({
      sorteo_id: campania.sorteo_id, telefono: codigo.telefono, tipo: "promo", promo_codigo_id: codigo.id,
      provider: "twilio", estado: "procesando", costo_unitario: config.costoUnitarioPromo, moneda: config.moneda,
    }).select("id").maybeSingle()
    if (errorReserva?.code === "23505") continue
    if (errorReserva || !reserva) throw errorReserva || new Error("No se pudo reservar el envío")
    const resultado = await provider.enviarPromo({
      envioId: reserva.id,
      telefono: codigo.telefono || "", pais: codigo.pais, nombre: codigo.nombre || "-",
      cantidadChances: codigo.chances_al_envio || 0, porcentaje: campania.porcentaje,
      venceAt: campania.vence_at, codigo: codigo.codigo,
      premiosResumen,
    })
    const { error: errorRegistro } = await supabaseAdmin.from("whatsapp_envios").update({
      estado: resultado.success ? "enviado" : "error", provider_message_id: resultado.providerMessageId || null,
    }).eq("id", reserva.id).eq("estado", "procesando")
    if (errorRegistro) console.error("Error registrando resultado de promo:", errorRegistro)
    if (resultado.success) enviados++
    else { errores++; console.error("Error enviando promo:", resultado.error) }
  }
  return NextResponse.json({ enviados, errores, pendientes: Math.max(0, pendientes.length - lote.length) })
}
