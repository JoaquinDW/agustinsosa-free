import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Devuelve los datos mínimos para renderizar el comprobante público (link del
// botón del WhatsApp de transferencia aprobada). El id del comprador es un
// UUID no adivinable y oficia de token, igual que en /api/descargar/[id].
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Ids que no son UUID ni llegan a la base (evita errores de cast en Postgres).
    if (!UUID_REGEX.test(id || "")) {
      return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 })
    }

    const { data: comprador, error } = await supabaseAdmin
      .from("compradores")
      .select("nombre, sorteo_id, cantidad_chances, numeros_asignados, estado_pago, created_at")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("Error buscando comprador para comprobante:", error)
      return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 })
    }

    if (!comprador) {
      return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 })
    }

    // Solo mostrar comprobante de compras efectivamente pagadas
    if (comprador.estado_pago !== "pagado") {
      return NextResponse.json({ error: "El pago aún no fue confirmado" }, { status: 403 })
    }

    const { data: sorteo } = await supabaseAdmin
      .from("sorteos")
      .select("nombre")
      .eq("id", comprador.sorteo_id)
      .maybeSingle()

    return NextResponse.json(
      {
        premio: sorteo?.nombre || "Sorteo",
        comprador: {
          nombre: comprador.nombre,
          numeros_asignados: comprador.numeros_asignados || [],
          cantidad_chances: comprador.cantidad_chances,
          created_at: comprador.created_at,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    console.error("Error en API de comprobante:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
