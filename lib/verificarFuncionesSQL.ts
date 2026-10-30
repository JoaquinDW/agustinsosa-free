/**
 * Health Check de Funciones SQL
 *
 * Verifica que todas las funciones SQL críticas estén disponibles en Supabase.
 * Debe ejecutarse al inicio de la aplicación.
 */

import { supabase } from "./supabase"

export interface HealthCheckResult {
  /** Si todas las funciones están disponibles */
  ok: boolean
  /** Funciones que están disponibles */
  funcionesDisponibles: string[]
  /** Funciones que faltan */
  funcionesFaltantes: string[]
  /** Mensaje descriptivo */
  mensaje: string
  /** Timestamp de la verificación */
  timestamp: string
}

/**
 * Verifica que las funciones SQL críticas existan en Supabase
 */
export async function verificarFuncionesSQL(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString()
  const funcionesCriticas = [
    "generar_numeros_unicos_atomico",
    "diagnosticar_duplicados_rapido",
  ]

  const disponibles: string[] = []
  const faltantes: string[] = []

  // Verificar cada función
  for (const nombreFuncion of funcionesCriticas) {
    const existe = await verificarFuncionExiste(nombreFuncion)

    if (existe) {
      disponibles.push(nombreFuncion)
    } else {
      faltantes.push(nombreFuncion)
    }
  }

  const ok = faltantes.length === 0

  let mensaje: string
  if (ok) {
    mensaje = `✅ Todas las ${funcionesCriticas.length} funciones SQL críticas están disponibles`
  } else {
    mensaje = `❌ ALERTA: Faltan ${faltantes.length} función(es) SQL crítica(s): ${faltantes.join(", ")}`
  }

  return {
    ok,
    funcionesDisponibles: disponibles,
    funcionesFaltantes: faltantes,
    mensaje,
    timestamp,
  }
}

/**
 * Verifica si una función específica existe en Supabase
 */
async function verificarFuncionExiste(nombreFuncion: string): Promise<boolean> {
  try {
    // Intentar llamar la función con parámetros de prueba
    // Si falla con error 42883 = función no existe
    // Cualquier otro error = función existe pero falló por otra razón

    let error: any

    if (nombreFuncion === "generar_numeros_unicos_atomico") {
      // Probar con UUID inválido para que falle rápido
      const { error: err } = await supabase.rpc(nombreFuncion, {
        p_sorteo_id: "00000000-0000-0000-0000-000000000000",
        p_cantidad: 0,
      })
      error = err
    } else if (nombreFuncion === "diagnosticar_duplicados_rapido") {
      const { error: err } = await supabase.rpc(nombreFuncion, {
        p_sorteo_id: "00000000-0000-0000-0000-000000000000",
      })
      error = err
    } else {
      // Para otras funciones, asumir que no existen
      return false
    }

    // Si el error es 42883 = función no existe
    if (error?.code === "42883") {
      return false
    }

    // Cualquier otro caso (incluso si hay error) = función existe
    return true
  } catch (error) {
    console.error(`Error verificando función ${nombreFuncion}:`, error)
    return false
  }
}

/**
 * Ejecuta health check y registra el resultado
 * Lanza warning en consola si hay problemas
 */
export async function ejecutarHealthCheck(): Promise<void> {
  console.log("\n" + "=".repeat(60))
  console.log("🏥 HEALTH CHECK: Verificando Funciones SQL")
  console.log("=".repeat(60))

  const resultado = await verificarFuncionesSQL()

  console.log(`\nFecha: ${resultado.timestamp}`)
  console.log(`\n${resultado.mensaje}`)

  if (resultado.funcionesDisponibles.length > 0) {
    console.log(`\n✅ Disponibles (${resultado.funcionesDisponibles.length}):`)
    resultado.funcionesDisponibles.forEach((func) => {
      console.log(`   - ${func}`)
    })
  }

  if (resultado.funcionesFaltantes.length > 0) {
    console.log(`\n❌ Faltantes (${resultado.funcionesFaltantes.length}):`)
    resultado.funcionesFaltantes.forEach((func) => {
      console.log(`   - ${func}`)
    })

    console.log(
      "\n⚠️  ACCIÓN REQUERIDA: Aplicar funciones SQL en Supabase SQL Editor:"
    )
    console.log("   1. Ir a Supabase Dashboard → SQL Editor")
    console.log(
      "   2. Ejecutar: scripts/03-fix-duplicate-numbers-optimized.sql"
    )
    console.log("   3. Ejecutar: scripts/04-trigger-validacion-duplicados.sql")
    console.log(
      "   4. Verificar con: SELECT * FROM pg_proc WHERE proname LIKE 'generar%'"
    )
  }

  console.log("\n" + "=".repeat(60) + "\n")

  if (!resultado.ok) {
    // Log warning pero no lanzar error para no romper la app
    console.warn(
      "⚠️  WARNING: Sistema funcionando con funciones SQL faltantes. Duplicados pueden ocurrir."
    )
  }
}

/**
 * Verifica estado del trigger de validación
 */
export async function verificarTriggerValidacion(): Promise<{
  existe: boolean
  mensaje: string
}> {
  try {
    // Query para verificar si el trigger existe
    const { data, error } = await supabase.rpc("sql", {
      query: `
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers
        WHERE trigger_name = 'trigger_validar_numeros_unicos';
      `,
    })

    if (error) {
      // Si no podemos ejecutar la query, asumir que no existe
      return {
        existe: false,
        mensaje: `No se pudo verificar trigger: ${error.message}`,
      }
    }

    const existe = data && data.length > 0

    return {
      existe,
      mensaje: existe
        ? "✅ Trigger de validación está activo"
        : "❌ Trigger de validación NO está instalado",
    }
  } catch (error) {
    return {
      existe: false,
      mensaje: `Error verificando trigger: ${error}`,
    }
  }
}
