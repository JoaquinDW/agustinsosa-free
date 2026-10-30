export async function callAdminDatabase<T>(
  action: string,
  args: unknown[] = [],
): Promise<T> {
  const actionResources: Record<string, string> = {
    verificarTablas: "dashboard",
    obtenerTodosSorteos: "sorteos",
    realizarSorteo: "sorteos",
    finalizarSorteoManual: "sorteos",
    actualizarImagenSorteo: "imagenes",
    actualizarPreciosYCantidadesSorteo: "sorteos",
    actualizarPreciosSorteo: "sorteos",
    actualizarDetallesSorteo: "sorteos",
    obtenerCompradores: "compradores",
    obtenerCompradoresSorteoActual: "compradores",
    eliminarComprador: "compradores",
    obtenerTransferenciasPendientes: "transferencias",
    aprobarTransferencia: "transferencias",
    rechazarTransferencia: "transferencias",
    actualizarTituloRemera: "contenido",
    actualizarFechaSorteo: "sorteos",
    obtenerTodosLosGanadores: "ganadores",
    crearGanadorPasado: "ganadores",
    actualizarGanadorPasado: "ganadores",
    eliminarGanadorPasado: "ganadores",
    buscarCompradorPorNumero: "compradores",
    crearGanadorExpress: "ganadores",
    actualizarGanadorExpress: "ganadores",
    eliminarGanadorExpress: "ganadores",
    actualizarPremiosSecundarios: "configuracion",
    actualizarContenido: "contenido",
    obtenerConfiguracionWhatsApp: "whatsapp",
    actualizarConfiguracionWhatsApp: "whatsapp",
    obtenerReporteWhatsApp: "whatsapp",
    obtenerRankingAdmin: "ranking",
    obtenerPremiosRanking: "ranking",
    actualizarPremiosRanking: "ranking",
    obtenerResultadoRanking: "ranking",
    obtenerReporteCampanias: "ranking",
  }
  const resource = actionResources[action]
  if (!resource) throw new Error("Operación administrativa desconocida")

  const response = await fetch(`/api/admin/data/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, args }),
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.assign("/backoffice")
    }
    throw new Error(payload?.error || "La operación administrativa falló")
  }

  return payload.result as T
}
