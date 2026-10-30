/**
 * Endpoint de Monitoreo de Duplicados
 *
 * Verifica si hay números duplicados en el sorteo activo
 * y proporciona health check de las funciones SQL
 */

import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verificarFuncionesSQL } from "@/lib/verificarFuncionesSQL"
import { obtenerSorteoActivo } from "@/lib/database"
import { requireAdminOrCron } from "@/lib/admin-api"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminOrCron(request)
  if (unauthorized) return unauthorized

  try {
    // 1. Verificar funciones SQL
    const healthCheck = await verificarFuncionesSQL()

    // 2. Obtener sorteo activo
    const sorteoActivo = await obtenerSorteoActivo()

    if (!sorteoActivo) {
      return NextResponse.json({
        estado: "warning",
        mensaje: "No hay sorteo activo",
        healthCheck,
        duplicados: null,
      })
    }

    // 3. Diagnosticar duplicados usando función SQL (si existe)
    let duplicados: any = null

    if (healthCheck.funcionesDisponibles.includes("diagnosticar_duplicados_rapido")) {
      const { data, error } = await supabase.rpc("diagnosticar_duplicados_rapido", {
        p_sorteo_id: sorteoActivo.id,
      })

      if (error) {
        console.error("Error ejecutando diagnosticar_duplicados_rapido:", error)
      } else if (data && data.length > 0) {
        duplicados = data[0]
      }
    } else {
      // Fallback: Contar duplicados manualmente
      duplicados = await contarDuplicadosManual(sorteoActivo.id)
    }

    // 4. Determinar estado general
    let estado: "ok" | "warning" | "critical"
    let mensaje: string

    if (!healthCheck.ok) {
      estado = "critical"
      mensaje = "Funciones SQL faltantes - Sistema vulnerable a duplicados"
    } else if (duplicados && duplicados.numeros_duplicados > 0) {
      estado = "critical"
      mensaje = `Se detectaron ${duplicados.numeros_duplicados} números duplicados`
    } else {
      estado = "ok"
      mensaje = "Sistema funcionando correctamente"
    }

    // 5. Enviar alerta si hay duplicados
    if (duplicados && duplicados.numeros_duplicados > 0) {
      await enviarAlertaDuplicados(sorteoActivo.id, duplicados)
    }

    return NextResponse.json({
      estado,
      mensaje,
      timestamp: new Date().toISOString(),
      sorteo: {
        id: sorteoActivo.id,
        nombre: sorteoActivo.nombre,
      },
      duplicados,
      healthCheck,
    })
  } catch (error) {
    console.error("Error en endpoint de monitoreo:", error)

    return NextResponse.json(
      {
        estado: "error",
        mensaje: "Error ejecutando monitoreo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

/**
 * Cuenta duplicados manualmente (fallback si función SQL no existe)
 */
async function contarDuplicadosManual(
  sorteoId: string
): Promise<{ total_numeros_asignados: number; numeros_unicos: number; numeros_duplicados: number }> {
  try {
    // Obtener todos los compradores pagados
    const { data: compradores } = await supabase
      .from("compradores")
      .select("numeros_asignados")
      .eq("sorteo_id", sorteoId)
      .eq("estado_pago", "pagado")

    if (!compradores) {
      return {
        total_numeros_asignados: 0,
        numeros_unicos: 0,
        numeros_duplicados: 0,
      }
    }

    // Contar todos los números
    const todosLosNumeros: number[] = []
    for (const comprador of compradores) {
      if (comprador.numeros_asignados) {
        todosLosNumeros.push(...comprador.numeros_asignados)
      }
    }

    const numerosUnicos = new Set(todosLosNumeros)

    return {
      total_numeros_asignados: todosLosNumeros.length,
      numeros_unicos: numerosUnicos.size,
      numeros_duplicados: todosLosNumeros.length - numerosUnicos.size,
    }
  } catch (error) {
    console.error("Error contando duplicados manual:", error)
    return {
      total_numeros_asignados: 0,
      numeros_unicos: 0,
      numeros_duplicados: 0,
    }
  }
}

/**
 * Envía alerta cuando se detectan duplicados
 */
async function enviarAlertaDuplicados(sorteoId: string, duplicados: any): Promise<void> {
  try {
    // Log crítico
    console.error("🚨 ALERTA CRÍTICA: Duplicados detectados")
    console.error("Sorteo ID:", sorteoId)
    console.error("Duplicados:", duplicados)

    // TODO: Enviar email al admin
    // TODO: Enviar notificación Slack/Discord
    // TODO: Registrar en tabla de alertas

    // Por ahora, solo log
    console.error(
      "⚠️  Se recomienda ejecutar script de corrección inmediatamente"
    )
  } catch (error) {
    console.error("Error enviando alerta:", error)
  }
}
