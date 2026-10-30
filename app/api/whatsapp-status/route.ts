import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getWhatsAppBrandConfig } from "@/lib/whatsapp/config"
import { validarFirmaTwilio } from "@/lib/whatsapp/validar-callback"

export async function POST(request: NextRequest) {
  const config = getWhatsAppBrandConfig()
  const envioId = request.nextUrl.searchParams.get("envioId")
  const firma = request.headers.get("x-twilio-signature") || ""
  if (!config.webhookAuthToken || !config.statusCallbackUrl || !envioId) {
    return NextResponse.json({ error: "Callback no configurado" }, { status: 403 })
  }
  const cuerpo = new URLSearchParams(await request.text())
  const urlFirmada = `${config.statusCallbackUrl}?envioId=${encodeURIComponent(envioId)}`
  if (!validarFirmaTwilio(urlFirmada, cuerpo, firma, config.webhookAuthToken)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 403 })
  }
  const messageSid = cuerpo.get("MessageSid") || cuerpo.get("SmsSid")
  const status = (cuerpo.get("MessageStatus") || cuerpo.get("SmsStatus") || "").toLowerCase()
  if (!messageSid || !["queued", "sent", "delivered", "read", "failed", "undelivered"].includes(status)) {
    return NextResponse.json({ ok: true })
  }
  const { data: envio, error } = await supabaseAdmin.from("whatsapp_envios")
    .select("id, estado, provider_message_id, tipo")
    .eq("id", envioId).eq("tipo", "promo").maybeSingle()
  if (error) return NextResponse.json({ error: "No se pudo consultar el envío" }, { status: 500 })
  if (!envio || (envio.provider_message_id && envio.provider_message_id !== messageSid)) {
    return NextResponse.json({ error: "Envío no encontrado" }, { status: 404 })
  }
  const nuevoEstado = status === "delivered" ? "entregado" : status === "read" ? "leido" :
    status === "failed" || status === "undelivered" ? "error" : "enviado"
  if (["leido", "entregado"].includes(envio.estado) && ["enviado", "error"].includes(nuevoEstado)) return NextResponse.json({ ok: true })
  if (envio.estado === "leido" && nuevoEstado === "entregado") return NextResponse.json({ ok: true })
  if (envio.estado === "error" && nuevoEstado === "enviado") return NextResponse.json({ ok: true })
  const { error: errorUpdate } = await supabaseAdmin.from("whatsapp_envios")
    .update({ estado: nuevoEstado, provider_message_id: messageSid }).eq("id", envioId)
  if (errorUpdate) return NextResponse.json({ error: "No se pudo guardar el estado" }, { status: 500 })
  return NextResponse.json({ ok: true })
}
