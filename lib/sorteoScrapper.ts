import { chromium } from "playwright"
import { guardarResultadoRanking } from "./database"

// Importar supabase solo si las variables están disponibles
let supabase: any = null
try {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    supabase = require("./supabase").supabase
  }
} catch (error) {
  console.warn("Supabase no disponible - ejecutando en modo standalone")
}

/**
 * Obtiene solo el primer número ganador de la Quiniela Buenos Aires
 */
export async function obtenerPrimerNumero(): Promise<string | null> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    // Navegar a la página
    await page.goto(
      "https://www.loteriasmundiales.com.ar/Quinielas/buenos-aires"
    )

    // Esperar y obtener el primer número
    await page.waitForSelector("#idQ27_5_N01", { timeout: 10000 })

    const primerNumero = await page.textContent("#idQ27_5_N01")

    return primerNumero?.trim() || null
  } catch (error) {
    console.error("Error al obtener el primer número:", error)
    return null
  } finally {
    await browser.close()
  }
}

/**
 * Verifica si hay sorteos listos para ser sorteados (un día después de completarse)
 * y ejecuta el sorteo automáticamente
 */
export async function verificarYEjecutarSorteos(): Promise<void> {
  if (!supabase) {
    console.error(
      "❌ Supabase no está disponible. Verifica las variables de entorno."
    )
    return
  }

  try {
    console.log("🔍 Verificando sorteos pendientes de ejecución...")

    // Buscar sorteos con estado 'completo' que tengan fecha de última venta de ayer
    const { data: sorteosCompletos, error } = await supabase
      .from("sorteos")
      .select("*")
      .eq("estado", "completo")

    if (error) {
      console.error("Error obteniendo sorteos completos:", error)
      return
    }

    if (!sorteosCompletos || sorteosCompletos.length === 0) {
      console.log("✅ No hay sorteos pendientes de ejecución")
      return
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    for (const sorteo of sorteosCompletos) {
      if (!sorteo.fecha_sorteo_realizado) continue

      const fechaCompleto = new Date(sorteo.fecha_sorteo_realizado)
      fechaCompleto.setHours(0, 0, 0, 0)

      const diferenciaDias = Math.floor(
        (hoy.getTime() - fechaCompleto.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Si pasó exactamente 1 día desde que se completó
      if (diferenciaDias >= 1) {
        console.log(`🎯 Ejecutando sorteo: ${sorteo.nombre}`)
        await ejecutarSorteoAutomatico(sorteo.id, sorteo.nombre)
      }
    }
  } catch (error) {
    console.error("Error en verificarYEjecutarSorteos:", error)
  }
}

/**
 * Ejecuta el sorteo automáticamente: obtiene el número ganador y actualiza la base de datos
 */
async function ejecutarSorteoAutomatico(
  sorteoId: string,
  nombreSorteo: string
): Promise<void> {
  try {
    console.log(`🎲 Obteniendo número ganador para sorteo: ${nombreSorteo}`)

    // Obtener el número ganador
    const numeroGanador = await obtenerPrimerNumero()

    if (!numeroGanador) {
      console.error(
        `❌ No se pudo obtener el número ganador para ${nombreSorteo}`
      )
      return
    }

    console.log(`🏆 Número ganador obtenido: ${numeroGanador}`)

    // Usar el número exacto de la lotería como ganador
    const numeroFinal = parseInt(numeroGanador)

    console.log(`🎯 Número ganador: ${numeroFinal}`)

    // Buscar al ganador
    const { data: ganador, error: errorGanador } = await supabase
      .from("compradores")
      .select("*")
      .eq("sorteo_id", sorteoId)
      .eq("estado_pago", "pagado")
      .filter("numeros_asignados", "cs", `{${numeroFinal}}`)
      .single()

    // Actualizar el sorteo con el resultado
    await guardarResultadoRanking(sorteoId)
    const { error: errorUpdate } = await supabase
      .from("sorteos")
      .update({
        estado: "sorteado",
        numero_ganador: numeroFinal,
        ganador_id: ganador?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sorteoId)

    if (errorUpdate) {
      console.error("Error actualizando sorteo:", errorUpdate)
      return
    }

    // Marcar al ganador si existe
    if (ganador) {
      await supabase
        .from("compradores")
        .update({
          es_ganador: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ganador.id)

      console.log(
        `🎉 ¡Sorteo completado! Ganador: ${ganador.nombre} con el número ${numeroFinal}`
      )
    } else {
      console.log(
        `⚠️  Sorteo completado. Número ganador: ${numeroFinal} (sin comprador asignado)`
      )
    }

    // Aquí podrías agregar envío de emails, notificaciones, etc.
  } catch (error) {
    console.error(
      `Error ejecutando sorteo automático para ${nombreSorteo}:`,
      error
    )
  }
}

/**
 * Marca un sorteo como completo cuando se venden todas las chances
 */
export async function marcarSorteoCompleto(sorteoId: string): Promise<boolean> {
  if (!supabase) {
    console.error("❌ Supabase no está disponible para marcar sorteo completo")
    return false
  }

  try {
    const { error } = await supabase
      .from("sorteos")
      .update({
        estado: "completo",
        fecha_sorteo_realizado: new Date().toISOString(), // Guardamos cuándo se completó
        updated_at: new Date().toISOString(),
      })
      .eq("id", sorteoId)

    if (error) {
      console.error("Error marcando sorteo como completo:", error)
      return false
    }

    console.log(
      `✅ Sorteo ${sorteoId} marcado como completo. Se ejecutará automáticamente mañana.`
    )
    return true
  } catch (error) {
    console.error("Error marcando sorteo como completo:", error)
    return false
  }
}

// Función para usar en tu aplicación
export async function mostrarPrimerNumero(): Promise<void> {
  console.log("Obteniendo resultado...")

  const numero = await obtenerPrimerNumero()

  if (numero) {
    console.log(`🏆 Primer número ganador: ${numero}`)
  } else {
    console.log("❌ No se pudo obtener el resultado")
  }
}

// Ejemplo de uso
if (require.main === module) {
  mostrarPrimerNumero()
}
