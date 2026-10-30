/**
 * Verificación de Números Únicos
 *
 * Esta función realiza una validación POST-GENERACIÓN para asegurar
 * que los números generados NO estén duplicados en la base de datos.
 *
 * Es una capa adicional de seguridad antes de insertar/actualizar compradores.
 */

import { supabase } from "./supabase"

export interface VerificacionResultado {
  /** Si se detectaron números duplicados */
  duplicados: boolean
  /** Lista de números que están duplicados */
  numerosConflicto: number[]
  /** Total de números verificados */
  totalVerificados: number
  /** Mensaje descriptivo del resultado */
  mensaje: string
}

/**
 * Verifica que los números generados NO estén ya asignados a otros compradores
 *
 * @param sorteoId - ID del sorteo
 * @param numerosGenerados - Array de números que se quieren asignar
 * @param compradorId - ID del comprador (opcional, para excluirlo en UPDATEs)
 * @returns Resultado de la verificación con detalles
 */
export async function verificarNumerosUnicos(
  sorteoId: string,
  numerosGenerados: number[],
  compradorId?: string
): Promise<VerificacionResultado> {
  try {
    // Validación de entrada
    if (!numerosGenerados || numerosGenerados.length === 0) {
      return {
        duplicados: false,
        numerosConflicto: [],
        totalVerificados: 0,
        mensaje: "No hay números para verificar",
      }
    }

    // Obtener todos los compradores pagados del sorteo
    // Usamos paginación para manejar grandes cantidades
    let allData: Array<{ id: string; numeros_asignados: number[] }> = []
    let from = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const query = supabase
        .from("compradores")
        .select("id, numeros_asignados")
        .eq("sorteo_id", sorteoId)
        .eq("estado_pago", "pagado")
        .range(from, from + pageSize - 1)

      const { data, error } = await query

      if (error) {
        console.error("Error verificando números únicos:", error)
        throw new Error(`Error al verificar duplicados: ${error.message}`)
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data]
        from += pageSize

        if (data.length < pageSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }

    // Crear set con todos los números ocupados (excluyendo el comprador actual si aplica)
    const numerosOcupados = new Set<number>()

    for (const comprador of allData) {
      // Skip si es el comprador que estamos actualizando
      if (compradorId && comprador.id === compradorId) {
        continue
      }

      if (comprador.numeros_asignados && Array.isArray(comprador.numeros_asignados)) {
        for (const num of comprador.numeros_asignados) {
          numerosOcupados.add(num)
        }
      }
    }

    // Buscar conflictos
    const conflictos = numerosGenerados.filter((numero) =>
      numerosOcupados.has(numero)
    )

    // Validación adicional: duplicados INTERNOS en el array
    const numerosUnicos = new Set(numerosGenerados)
    const tieneDuplicadosInternos = numerosUnicos.size !== numerosGenerados.length

    if (tieneDuplicadosInternos) {
      const numerosContados = new Map<number, number>()
      for (const num of numerosGenerados) {
        numerosContados.set(num, (numerosContados.get(num) || 0) + 1)
      }

      const duplicadosInternos = Array.from(numerosContados.entries())
        .filter(([_, count]) => count > 1)
        .map(([num, _]) => num)

      return {
        duplicados: true,
        numerosConflicto: duplicadosInternos,
        totalVerificados: numerosGenerados.length,
        mensaje: `ERROR: El array contiene ${duplicadosInternos.length} número(s) DUPLICADOS INTERNAMENTE: ${duplicadosInternos.join(", ")}`,
      }
    }

    // Generar resultado
    if (conflictos.length > 0) {
      return {
        duplicados: true,
        numerosConflicto: conflictos,
        totalVerificados: numerosGenerados.length,
        mensaje: `CONFLICTO: ${conflictos.length} número(s) ya están asignados a otros compradores: ${conflictos.join(", ")}`,
      }
    }

    return {
      duplicados: false,
      numerosConflicto: [],
      totalVerificados: numerosGenerados.length,
      mensaje: `✓ Todos los ${numerosGenerados.length} números están disponibles`,
    }
  } catch (error) {
    console.error("Error en verificarNumerosUnicos:", error)

    // En caso de error, ser conservador y reportar como duplicado
    return {
      duplicados: true,
      numerosConflicto: [],
      totalVerificados: numerosGenerados.length,
      mensaje: `ERROR en verificación: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}

/**
 * Verifica si hay números disponibles suficientes para una cantidad solicitada
 *
 * @param sorteoId - ID del sorteo
 * @param cantidadSolicitada - Cantidad de números que se necesitan
 * @returns true si hay suficientes números disponibles
 */
export async function verificarDisponibilidad(
  sorteoId: string,
  cantidadSolicitada: number
): Promise<{ disponible: boolean; numerosDisponibles: number }> {
  try {
    // Obtener total del sorteo
    const { data: sorteo } = await supabase
      .from("sorteos")
      .select("total_chances")
      .eq("id", sorteoId)
      .single()

    const totalChances = sorteo?.total_chances || 9999

    // Contar números ocupados
    const { data: compradores } = await supabase
      .from("compradores")
      .select("numeros_asignados")
      .eq("sorteo_id", sorteoId)
      .eq("estado_pago", "pagado")

    const numerosOcupados = new Set<number>()
    if (compradores) {
      for (const comprador of compradores) {
        if (comprador.numeros_asignados) {
          for (const num of comprador.numeros_asignados) {
            numerosOcupados.add(num)
          }
        }
      }
    }

    const numerosDisponibles = totalChances + 1 - numerosOcupados.size

    return {
      disponible: numerosDisponibles >= cantidadSolicitada,
      numerosDisponibles,
    }
  } catch (error) {
    console.error("Error verificando disponibilidad:", error)
    return {
      disponible: false,
      numerosDisponibles: 0,
    }
  }
}
