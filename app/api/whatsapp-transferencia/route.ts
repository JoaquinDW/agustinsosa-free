import { NextRequest, NextResponse } from "next/server"
import {
  construirUrlComprobante,
  getWhatsAppBrandConfig,
  getWhatsAppProvider,
} from "@/lib/whatsapp"
import { obtenerConfiguracionWhatsApp, registrarEnvioWhatsApp } from "@/lib/database"
import { requireAdminRequest } from "@/lib/admin-api"

// Envía la confirmación de transferencia aprobada por WhatsApp (Twilio) y
// registra el envío para el reporte de costos. Se llama desde el backoffice
// además del email de aprobación (no lo reemplaza).
export async function POST(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized

  try {
    const { data } = await request.json()

    if (!data || !data.telefono || !data.compradorId) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (telefono, compradorId)" },
        { status: 400 }
      )
    }

    const brandConfig = getWhatsAppBrandConfig()
    const comprobanteUrl = construirUrlComprobante(brandConfig.comprobanteBaseUrl, data.compradorId)

    const provider = getWhatsAppProvider(brandConfig)
    const resultado = await provider.enviarTransferenciaAprobada({
      telefono: data.telefono,
      pais: data.pais,
      nombre: data.nombre,
      cantidadChances: data.cantidadChances,
      numerosAsignados: data.numerosAsignados || [],
      precioPagado: data.precioPagado,
      moneda: data.moneda,
      nombreSorteo: data.nombreSorteo || "Sorteo",
      comprobanteUrl,
      compradorId: data.compradorId,
    })

    // Registrar el envío (snapshot del costo unitario actual) para el reporte.
    const config = await obtenerConfiguracionWhatsApp()
    await registrarEnvioWhatsApp({
      comprador_id: data.compradorId,
      sorteo_id: data.sorteoId ?? null,
      telefono: data.telefono,
      provider: resultado.provider,
      provider_message_id: resultado.providerMessageId ?? null,
      estado: resultado.success ? "enviado" : "error",
      costo_unitario: config.costoUnitario,
      moneda: config.moneda,
    })

    if (!resultado.success) {
      console.error("Error enviando WhatsApp de transferencia:", resultado.error)
      return NextResponse.json(
        { error: "Error enviando WhatsApp", details: resultado.error },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en API de WhatsApp transferencia:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
