import { NextResponse } from "next/server"

// Mercado Pago deshabilitado permanentemente. Solo se aceptan transferencias.
export async function POST() {
  return NextResponse.json({ error: "Solo se acepta transferencia bancaria" }, { status: 410 })
}

// Implementación anterior deshabilitada:
// import MercadoPagoConfig, { Payment } from "mercadopago"
// import { type NextRequest, NextResponse } from "next/server"
// import {
//   crearComprador,
//   generarNumerosUnicos,
//   obtenerSorteo,
//   obtenerPromoPorCodigo,
//   marcarCodigoUsado,
// } from "@/lib/database"
// import { encontrarPackPago } from "@/lib/promos"
// import { enviarEmailConfirmacion } from "@/lib/email"
// import { supabaseAdmin } from "@/lib/supabase-admin"
//
// type PaymentPayload = {
//   id?: string | number
//   status?: string
//   external_reference?: string
//   preference_id?: string
//   transaction_amount?: number
//   metadata?: Record<string, unknown>
//   payer?: {
//     email?: string
//     first_name?: string
//     last_name?: string
//     phone?: { number?: string }
//   }
// }
//
// async function findExistingPurchase(paymentId: string) {
//   const { data } = await supabaseAdmin
//     .from("compradores")
//     .select("id, numeros_asignados")
//     .eq("mercadopago_id", paymentId)
//     .maybeSingle()
//   return data
// }
//
// async function processApprovedPayment(
//   paymentId: string,
//   expectedPreferenceId?: string,
// ) {
//   const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
//   if (!accessToken) throw new Error("MercadoPago no está configurado")
//
//   const existing = await findExistingPurchase(paymentId)
//   if (existing) {
//     return {
//       success: true,
//       alreadyProcessed: true,
//       compradorId: existing.id,
//       numerosAsignados: existing.numeros_asignados || [],
//     }
//   }
//
//   const paymentClient = new Payment(
//     new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } }),
//   )
//   const payment = (await paymentClient.get({ id: paymentId })) as PaymentPayload
//
//   if (payment.status !== "approved") {
//     return { success: false, processed: false, status: payment.status }
//   }
//
//   if (
//     expectedPreferenceId &&
//     String(payment.preference_id || "") !== String(expectedPreferenceId)
//   ) {
//     throw new Error("La preferencia no coincide con el pago")
//   }
//
//   const sorteoId = String(
//     payment.external_reference || payment.metadata?.sorteo_id || "",
//   )
//   if (!sorteoId) throw new Error("El pago no tiene sorteo asociado")
//
//   const sorteo = await obtenerSorteo(sorteoId)
//   if (!sorteo) throw new Error("Sorteo no encontrado")
//
//   const amount = Number(payment.transaction_amount)
//   const metadataChances = Number(payment.metadata?.chances)
//   const promoCodigo = String(payment.metadata?.promo_codigo || "")
//   const promo = promoCodigo ? await obtenerPromoPorCodigo(promoCodigo).catch((error) => { console.warn("No se pudo consultar código promo de pago aprobado:", error); return null }) : null
//   const pack = encontrarPackPago(
//     sorteo, amount, metadataChances, promoCodigo, promo,
//     Number(payment.metadata?.precio_lista), Number(payment.metadata?.promo_porcentaje),
//   )
//
//   if (!pack || amount <= 0) {
//     throw new Error("El importe del pago no coincide con un pack válido")
//   }
//
//   const numerosAsignados = await generarNumerosUnicos(sorteoId, pack.chances)
//   if (numerosAsignados.length !== pack.chances) {
//     throw new Error("No hay suficientes números disponibles")
//   }
//
//   const metadata = payment.metadata || {}
//   const nombre =
//     String(metadata.nombre || "").trim() ||
//     [payment.payer?.first_name, payment.payer?.last_name]
//       .filter(Boolean)
//       .join(" ") ||
//     "Comprador MercadoPago"
//   const email =
//     String(metadata.email || payment.payer?.email || "").trim().toLowerCase() ||
//     undefined
//   const telefono =
//     String(metadata.telefono || payment.payer?.phone?.number || "").trim() ||
//     undefined
//
//   const nuevoComprador = await crearComprador(
//     sorteoId,
//     nombre,
//     email,
//     telefono,
//     undefined,
//     pack.chances,
//     numerosAsignados,
//     amount,
//     paymentId,
//     promo ? { codigoId: promo.id, precioLista: pack.price } : undefined,
//   )
//
//   if (!nuevoComprador) {
//     // Dos webhooks simultáneos pueden competir; el índice único decide y el
//     // segundo request devuelve la compra ya creada.
//     const concurrentPurchase = await findExistingPurchase(paymentId)
//     if (concurrentPurchase) {
//       return {
//         success: true,
//         alreadyProcessed: true,
//         compradorId: concurrentPurchase.id,
//         numerosAsignados: concurrentPurchase.numeros_asignados || [],
//       }
//     }
//     throw new Error("No se pudo registrar la compra")
//   }
//   if (promo) {
//     try {
//       if (!(await marcarCodigoUsado(promo.id))) console.warn("Código promo ya usado en pago aprobado:", promo.id)
//     } catch (errorPromo) { console.warn("No se pudo marcar promo usada en pago aprobado:", errorPromo) }
//   }
//
//   if (email) {
//     try {
//       await enviarEmailConfirmacion({
//         nombre,
//         email,
//         cantidadChances: pack.chances,
//         numerosAsignados,
//         precioPagado: amount,
//         sorteoNombre: sorteo.nombre,
//         sorteoImagenUrl: sorteo.carousel_image_1 || sorteo.imagen_url || undefined,
//         compradorId: nuevoComprador.id,
//       })
//     } catch (emailError) {
//       console.error("El pago se confirmó, pero falló su email:", emailError)
//     }
//   }
//
//   return {
//     success: true,
//     alreadyProcessed: false,
//     compradorId: nuevoComprador.id,
//     numerosAsignados,
//   }
// }
//
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json().catch(() => ({}))
//     const paymentId = String(
//       body?.data?.id ||
//         body?.paymentId ||
//         request.nextUrl.searchParams.get("data.id") ||
//         "",
//     )
//     const preferenceId = body?.preferenceId
//
//     if (!paymentId) {
//       return NextResponse.json({ error: "Pago requerido" }, { status: 400 })
//     }
//
//     const result = await processApprovedPayment(paymentId, preferenceId)
//     return NextResponse.json(result)
//   } catch (error) {
//     console.error("Error confirmando pago verificado:", error)
//     return NextResponse.json(
//       { error: "No se pudo verificar el pago" },
//       { status: 500 },
//     )
//   }
// }
