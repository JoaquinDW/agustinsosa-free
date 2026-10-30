import { NextResponse } from "next/server"

// Mercado Pago deshabilitado permanentemente. Solo se aceptan transferencias.
export async function POST() {
  return NextResponse.json({ error: "Solo se acepta transferencia bancaria" }, { status: 410 })
}

// Implementación anterior deshabilitada:
// import { NextRequest, NextResponse } from "next/server"
// import { obtenerSorteo } from "@/lib/database"
// import { supabase } from "@/lib/supabase"
// import { requirePublishedSite } from "@/lib/site-visibility"
//
// export async function POST(request: NextRequest) {
//   const unpublished = await requirePublishedSite(request)
//   if (unpublished) return unpublished
//
//   try {
//     const body = await request.json()
//     const { sorteoId, nombre, email, telefono, instagram_username } = body
//     const chances = Number(body.chances)
//
//     // Validar datos requeridos
//     if (!sorteoId || !nombre || !Number.isInteger(chances) || chances <= 0) {
//       return NextResponse.json(
//         { error: "Faltan datos requeridos" },
//         { status: 400 }
//       )
//     }
//
//     // Validar que al menos tenga un método de contacto
//     if (!telefono && !instagram_username) {
//       return NextResponse.json(
//         { error: "Debe proporcionar al menos un método de contacto (WhatsApp o Instagram)" },
//         { status: 400 }
//       )
//     }
//
//     const sorteo = await obtenerSorteo(String(sorteoId))
//     if (!sorteo || sorteo.estado !== "activo") {
//       return NextResponse.json(
//         { error: "Sorteo no disponible" },
//         { status: 404 },
//       )
//     }
//
//     const packs = [
//       {
//         chances: sorteo.cantidad_pack_1,
//         price: sorteo.precio_6_chances,
//         visible: sorteo.pack_1_visible,
//       },
//       {
//         chances: sorteo.cantidad_pack_2,
//         price: sorteo.precio_12_chances,
//         visible: sorteo.pack_2_visible,
//       },
//       {
//         chances: sorteo.cantidad_pack_3,
//         price: sorteo.precio_24_chances,
//         visible: sorteo.pack_3_visible,
//       },
//       {
//         chances: sorteo.cantidad_pack_4,
//         price: sorteo.precio_pack_4,
//         visible: sorteo.pack_4_visible,
//       },
//       {
//         chances: sorteo.cantidad_pack_5,
//         price: sorteo.precio_pack_5,
//         visible: sorteo.pack_5_visible,
//       },
//     ]
//     const pack = packs.find(
//       (candidate) => candidate.visible && candidate.chances === chances,
//     )
//
//     if (!pack || !Number.isFinite(pack.price) || pack.price <= 0) {
//       return NextResponse.json(
//         { error: "Pack no válido" },
//         { status: 400 },
//       )
//     }
//
//     // Crear comprador con estado pendiente
//     // Los números se asignarán cuando se confirme el pago
//     const { data: comprador, error } = await supabase
//       .from("compradores")
//       .insert({
//         sorteo_id: sorteoId,
//         nombre: nombre.trim(),
//         email: email?.trim() || null,
//         telefono: telefono?.trim() || null,
//         instagram_username: instagram_username?.trim() || null,
//         cantidad_chances: chances,
//         numeros_asignados: [], // Se asignarán al confirmar pago
//         precio_pagado: pack.price,
//         estado_pago: "pendiente",
//         metodo_pago: "mercadopago",
//         es_ganador: false,
//       })
//       .select()
//       .single()
//
//     if (error) {
//       console.error("Error creando comprador:", error)
//       return NextResponse.json(
//         { error: "Error al registrar la compra" },
//         { status: 500 }
//       )
//     }
//
//     return NextResponse.json({
//       success: true,
//       compradorId: comprador.id,
//     })
//   } catch (error) {
//     console.error("Error en POST /api/mercadopago:", error)
//     return NextResponse.json(
//       { error: "Error interno del servidor" },
//       { status: 500 }
//     )
//   }
// }
