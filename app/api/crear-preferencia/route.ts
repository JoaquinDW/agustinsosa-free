import { NextResponse } from "next/server"

// Mercado Pago deshabilitado permanentemente. Solo se aceptan transferencias.
export async function POST() {
  return NextResponse.json({ error: "Solo se acepta transferencia bancaria" }, { status: 410 })
}

// Implementación anterior deshabilitada:
// import MercadoPagoConfig, { Preference } from "mercadopago"
// import { type NextRequest, NextResponse } from "next/server"
// import { obtenerPromoPorCodigo, obtenerSorteo } from "@/lib/database"
// import { MENSAJES_PROMO, precioConPromo, validarCodigo } from "@/lib/promos"
// import { requirePublishedSite } from "@/lib/site-visibility"
//
// export async function POST(request: NextRequest) {
//   const unpublished = await requirePublishedSite(request)
//   if (unpublished) return unpublished
//
//   try {
//     const { nombre, email, telefono, chances, sorteoId, promoCodigo } = await request.json()
//
//     // Validar datos requeridos
//     if (!nombre || !email || !telefono || !chances || !sorteoId) {
//       return NextResponse.json(
//         { error: "Faltan datos requeridos" },
//         { status: 400 }
//       )
//     }
//
//     const sorteo = await obtenerSorteo(sorteoId)
//     if (!sorteo || sorteo.estado !== "activo") {
//       return NextResponse.json(
//         { error: "Sorteo no disponible" },
//         { status: 404 }
//       )
//     }
//
//     // Calcular precio según cantidad de chances del sorteo actual
//     let precio = 0
//     if (sorteo.pack_1_visible && chances === sorteo.cantidad_pack_1) {
//       precio = sorteo.precio_6_chances
//     } else if (sorteo.pack_2_visible && chances === sorteo.cantidad_pack_2) {
//       precio = sorteo.precio_12_chances
//     } else if (sorteo.pack_3_visible && chances === sorteo.cantidad_pack_3) {
//       precio = sorteo.precio_24_chances
//     } else if (sorteo.pack_4_visible && chances === sorteo.cantidad_pack_4) {
//       precio = sorteo.precio_pack_4
//     } else if (sorteo.pack_5_visible && chances === sorteo.cantidad_pack_5) {
//       precio = sorteo.precio_pack_5
//     } else {
//       return NextResponse.json(
//         { error: `Cantidad de chances no válida: ${chances}` },
//         { status: 400 }
//       )
//     }
//     const precioLista = precio
//     let promoPorcentaje: number | undefined
//     if (promoCodigo) {
//       const promo = await obtenerPromoPorCodigo(String(promoCodigo))
//       const validez = validarCodigo(promo, promo?.campania || null, new Date(), sorteoId, chances)
//       if (!validez.ok) return NextResponse.json({ error: MENSAJES_PROMO[validez.motivo] }, { status: 400 })
//       promoPorcentaje = promo!.campania.porcentaje
//       precio = precioConPromo(sorteo, chances, "MP", promo!.campania).final
//     }
//
//     const client = new MercadoPagoConfig({
//       accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
//     })
//
//     const preference = new Preference(client)
//
//     // Asegurar que tenemos una URL base válida
//     const baseUrl = process.env.NEXT_PUBLIC_APP_URL
//
//     console.log("Base URL:", baseUrl)
//
//     const response = await preference.create({
//       body: {
//         items: [
//           {
//             id: Date.now()
//               .toString()
//               .concat("", Math.random().toString(36).substring(2, 15)),
//             title: `${chances} Remeras digitales - Sosa Motos`,
//             quantity: 1,
//             unit_price: precio,
//           },
//         ],
//         payer: {
//           name: nombre,
//           email: email,
//           phone: {
//             number: telefono,
//           },
//         },
//
//         back_urls: {
//           success: `${baseUrl}/pago/exito`,
//           failure: `${baseUrl}/pago/error`,
//           pending: `${baseUrl}/pago/pendiente`,
//         },
//         auto_return: "all",
//         external_reference: sorteoId,
//         metadata: {
//           nombre: nombre.trim(),
//           email: email.trim().toLowerCase(),
//           telefono: telefono.trim(),
//           chances,
//           sorteo_id: sorteoId,
//           ...(promoCodigo ? { promo_codigo: String(promoCodigo).trim().toUpperCase(), precio_lista: precioLista, promo_porcentaje: promoPorcentaje } : {}),
//         },
//         ...(baseUrl?.startsWith("https://")
//           ? { notification_url: `${baseUrl.replace(/\/$/, "")}/api/confirmar-pago` }
//           : {}),
//       },
//     })
//
//     console.log("MercadoPago response:", {
//       id: response.id,
//       init_point: response.init_point,
//       sandbox_init_point: response.sandbox_init_point,
//     })
//
//     return NextResponse.json({
//       preferenceId: response.id,
//       paymentUrl:
//         process.env.NODE_ENV === "production"
//           ? response.init_point
//           : response.sandbox_init_point,
//       precio,
//     })
//   } catch (error) {
//     console.error("Error creando preferencia:", error)
//     return NextResponse.json(
//       { error: "Error interno del servidor" },
//       { status: 500 }
//     )
//   }
// }
