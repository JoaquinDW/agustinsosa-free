import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"
import { requireAdminRequest } from "@/lib/admin-api"

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { accion, sorteoId, diasASimular } = body

    switch (accion) {
      case "completar-sorteo":
        return await completarSorteoForzado(sorteoId)

      case "simular-dia-siguiente":
        return await simularDiaSiguiente(sorteoId, diasASimular || 1)

      case "resetear-sorteo":
        return await resetearSorteo(sorteoId)

      case "test-completo":
        return await testearFlujoCompleto(sorteoId)

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error en testing:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

// Forzar que un sorteo se marque como completo
async function completarSorteoForzado(sorteoId: string) {
  const { error } = await supabase
    .from("sorteos")
    .update({
      estado: "completo",
      fecha_sorteo_realizado: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sorteoId)

  if (error) {
    return NextResponse.json(
      { error: "Error actualizando sorteo" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: `✅ Sorteo ${sorteoId} marcado como completo forzadamente`,
    accion: "completar-sorteo",
  })
}

// Simular que pasó un día (o varios) modificando la fecha de completado
async function simularDiaSiguiente(sorteoId: string, dias: number = 1) {
  const fechaSimulada = new Date()
  fechaSimulada.setDate(fechaSimulada.getDate() - dias)

  const { error } = await supabase
    .from("sorteos")
    .update({
      fecha_sorteo_realizado: fechaSimulada.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sorteoId)

  if (error) {
    return NextResponse.json(
      { error: "Error simulando fecha" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: `⏰ Simulado: ${dias} día(s) han pasado desde que se completó el sorteo`,
    fechaSimulada: fechaSimulada.toISOString(),
    accion: "simular-dia-siguiente",
  })
}

// Resetear sorteo para volver a testear
async function resetearSorteo(sorteoId: string) {
  const { error } = await supabase
    .from("sorteos")
    .update({
      estado: "activo",
      fecha_sorteo_realizado: null,
      numero_ganador: null,
      ganador_id: null,
      ganador_nombre: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sorteoId)

  if (error) {
    return NextResponse.json(
      { error: "Error reseteando sorteo" },
      { status: 500 }
    )
  }

  // También resetear ganadores
  await supabase
    .from("compradores")
    .update({ es_ganador: false })
    .eq("sorteo_id", sorteoId)

  return NextResponse.json({
    success: true,
    message: `🔄 Sorteo ${sorteoId} reseteado a estado activo`,
    accion: "resetear-sorteo",
  })
}

// Testear flujo completo automáticamente
async function testearFlujoCompleto(sorteoId: string) {
  const pasos = []

  try {
    // Paso 1: Completar sorteo
    pasos.push("🎯 Paso 1: Marcando sorteo como completo...")
    await completarSorteoForzado(sorteoId)
    pasos.push("✅ Sorteo marcado como completo")

    // Paso 2: Simular que pasó un día
    pasos.push("⏰ Paso 2: Simulando que pasó 1 día...")
    await simularDiaSiguiente(sorteoId, 1)
    pasos.push("✅ Día simulado")

    // Paso 3: Ejecutar verificación de sorteos
    pasos.push("🚀 Paso 3: Ejecutando verificación de sorteos...")

    // Importar dinámicamente para ejecutar el sorteo
    const { verificarYEjecutarSorteos } = await import(
      "../../../lib/sorteoScrapper"
    )
    await verificarYEjecutarSorteos()

    pasos.push("✅ Verificación ejecutada")

    // Paso 4: Verificar resultado
    const { data: sorteo } = await supabase
      .from("sorteos")
      .select("*, compradores!compradores_sorteo_id_fkey(*)")
      .eq("id", sorteoId)
      .single()

    if (sorteo?.estado === "sorteado" && sorteo.numero_ganador) {
      pasos.push(`🏆 ¡ÉXITO! Número ganador: ${sorteo.numero_ganador}`)

      const ganador = sorteo.compradores?.find((c: any) => c.es_ganador)
      if (ganador) {
        pasos.push(`👑 Ganador: ${ganador.nombre}`)
      } else {
        pasos.push("⚠️ Número ganador determinado pero sin comprador asignado")
      }
    } else {
      pasos.push("❌ El sorteo no se ejecutó correctamente")
    }

    return NextResponse.json({
      success: true,
      message: "Test completo ejecutado",
      pasos,
      sorteo,
      accion: "test-completo",
    })
  } catch (error) {
    pasos.push(`❌ Error: ${error instanceof Error ? error.message : error}`)
    return NextResponse.json(
      {
        success: false,
        message: "Error en test completo",
        pasos,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminRequest(request)
  if (unauthorized) return unauthorized

  return NextResponse.json({
    message: "Endpoint de testing para sorteos",
    acciones: [
      {
        accion: "completar-sorteo",
        descripcion: "Marcar un sorteo como completo",
        body: { accion: "completar-sorteo", sorteoId: "tu-sorteo-id" },
      },
      {
        accion: "simular-dia-siguiente",
        descripcion: "Simular que pasaron N días",
        body: {
          accion: "simular-dia-siguiente",
          sorteoId: "tu-sorteo-id",
          diasASimular: 1,
        },
      },
      {
        accion: "resetear-sorteo",
        descripcion: "Resetear sorteo a estado activo",
        body: { accion: "resetear-sorteo", sorteoId: "tu-sorteo-id" },
      },
      {
        accion: "test-completo",
        descripcion: "Ejecutar todo el flujo automáticamente",
        body: { accion: "test-completo", sorteoId: "tu-sorteo-id" },
      },
    ],
  })
}
