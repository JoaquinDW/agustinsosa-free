import { type NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/admin-api"
import * as database from "@/lib/database"
import { actualizarContenido } from "@/lib/contenido"

const ACTION_RESOURCE = {
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
} as const

type AdminAction = keyof typeof ACTION_RESOURCE
type Callable = (...args: any[]) => Promise<unknown>

function protectReceiptUrls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(protectReceiptUrls)
  if (!value || typeof value !== "object") return value

  const row = value as Record<string, unknown>
  const protectedRow = { ...row }
  if (typeof row.id === "string" && row.comprobante_url) {
    protectedRow.comprobante_url = `/api/admin/comprobantes/${row.id}`
  }
  return protectedRow
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized

  let body: { action?: string; args?: unknown[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  const { resource } = await params
  const action = body.action as AdminAction | undefined
  if (
    !action ||
    !(action in ACTION_RESOURCE) ||
    ACTION_RESOURCE[action] !== resource ||
    !Array.isArray(body.args)
  ) {
    return NextResponse.json({ error: "Operación no permitida" }, { status: 400 })
  }

  const handler: Callable | undefined =
    action === "actualizarContenido"
      ? actualizarContenido
      : (database as Record<string, Callable>)[action]

  if (!handler) {
    return NextResponse.json({ error: "Operación no disponible" }, { status: 400 })
  }

  try {
    const result = await handler(...body.args)
    return NextResponse.json({ result: protectReceiptUrls(result) })
  } catch (error) {
    console.error(`Error en operación administrativa ${action}:`, error)
    return NextResponse.json(
      { error: "No se pudo completar la operación" },
      { status: 500 },
    )
  }
}
