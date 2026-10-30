import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"
import { requireAdminOrCron } from "@/lib/admin-api"

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminOrCron(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { sorteoId } = body

    if (!sorteoId) {
      return NextResponse.json({ error: "sorteoId requerido" }, { status: 400 })
    }

    // Obtener datos del sorteo
    const { data: sorteo, error: errorSorteo } = await supabase
      .from("sorteos")
      .select("*")
      .eq("id", sorteoId)
      .eq("estado", "activo")
      .single()

    if (errorSorteo || !sorteo) {
      return NextResponse.json({
        success: false,
        message: "Sorteo no encontrado o no está activo",
      })
    }

    // Obtener estadísticas actuales
    const { data: compradores, error: errorCompradores } = await supabase
      .from("compradores")
      .select("cantidad_chances")
      .eq("sorteo_id", sorteoId)
      .eq("estado_pago", "pagado")

    if (errorCompradores) {
      return NextResponse.json(
        {
          error: "Error obteniendo compradores",
        },
        { status: 500 }
      )
    }

    const chancesVendidas =
      compradores?.reduce(
        (sum, comprador) => sum + comprador.cantidad_chances,
        0
      ) || 0

    // Verificar si se completó el sorteo
    if (chancesVendidas >= sorteo.total_chances) {
      console.log(
        `🎉 ¡Sorteo ${sorteo.nombre} completado! Todas las chances vendidas (${chancesVendidas}/${sorteo.total_chances})`
      )

      // Marcar como completo
      const { error: errorUpdate } = await supabase
        .from("sorteos")
        .update({
          estado: "completo",
          fecha_sorteo_realizado: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sorteoId)

      if (errorUpdate) {
        console.error("Error marcando sorteo como completo:", errorUpdate)
        return NextResponse.json(
          {
            error: "Error actualizando sorteo",
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        completed: true,
        message: `Sorteo completado. Se ejecutará automáticamente mañana.`,
        chancesVendidas,
        totalChances: sorteo.total_chances,
      })
    }

    return NextResponse.json({
      success: true,
      completed: false,
      message: "Sorteo aún no completado",
      chancesVendidas,
      totalChances: sorteo.total_chances,
    })
  } catch (error) {
    console.error("Error verificando sorteo completo:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
      },
      { status: 500 }
    )
  }
}
