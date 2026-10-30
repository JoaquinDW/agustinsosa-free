"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageCircle, Save } from "lucide-react"
import {
  obtenerConfiguracionWhatsApp,
  actualizarConfiguracionWhatsApp,
  obtenerReporteWhatsApp,
  type ConfiguracionWhatsApp,
  type ReporteWhatsApp,
} from "@/lib/database"
import type { Sorteo } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface Props {
  sorteos: Sorteo[]
  // Modo dueño: muestra el costo base de Twilio y el margen. Solo se activa
  // desde la ruta privada /backoffice/owner. El cliente nunca lo ve.
  ownerMode?: boolean
}

export function ReporteWhatsapp({ sorteos, ownerMode = false }: Props) {
  const { toast } = useToast()

  const [costoUnitario, setCostoUnitario] = useState("0.05")
  const [costoUnitarioPromo, setCostoUnitarioPromo] = useState("0.076")
  const [moneda, setMoneda] = useState("USD")
  const [margenPct, setMargenPct] = useState("20")
  const [guardando, setGuardando] = useState(false)

  const [sorteoId, setSorteoId] = useState<string>("")
  const [mesId, setMesId] = useState<string>("")
  const [mesesDisponibles, setMesesDisponibles] = useState<string[]>([])
  const [reporte, setReporte] = useState<ReporteWhatsApp | null>(null)
  const [cargando, setCargando] = useState(true)

  const fmt = (n: number) => `${moneda} ${n.toFixed(2)}`

  const nombreSorteo = (id: string) =>
    id === "sin-sorteo" ? "Sin sorteo asociado" : sorteos.find((s) => s.id === id)?.nombre ?? id

  // Rango [00:00 del día 1, último ms del mes] en UTC para un "YYYY-MM".
  const rangoMes = (mes?: string): { desde?: string; hasta?: string } => {
    if (!mes) return {}
    const [y, m] = mes.split("-").map(Number)
    const desde = new Date(Date.UTC(y, m - 1, 1)).toISOString()
    const hasta = new Date(Date.UTC(y, m, 1) - 1).toISOString()
    return { desde, hasta }
  }

  const cargarReporte = async (filtroSorteo?: string, filtroMes?: string) => {
    setCargando(true)
    const { desde, hasta } = rangoMes(filtroMes)
    const rep = await obtenerReporteWhatsApp({
      ...(filtroSorteo ? { sorteoId: filtroSorteo } : {}),
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
    })
    setReporte(rep)
    setCargando(false)
    return rep
  }

  useEffect(() => {
    ;(async () => {
      const config = await obtenerConfiguracionWhatsApp()
      setCostoUnitario(String(config.costoUnitario))
      setCostoUnitarioPromo(String(config.costoUnitarioPromo))
      setMoneda(config.moneda)
      setMargenPct(String(config.margen * 100))
      // Sin filtros, para relevar todos los meses con envíos registrados.
      const rep = await cargarReporte()
      setMesesDisponibles(rep.porMes.map((m) => m.mes))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guardar = async () => {
    setGuardando(true)
    const config: ConfiguracionWhatsApp = {
      costoUnitario: Number(costoUnitario) || 0,
      costoUnitarioPromo: Number(costoUnitarioPromo) || 0,
      moneda: moneda.trim() || "USD",
      margen: (Number(margenPct) || 0) / 100,
    }
    const ok = await actualizarConfiguracionWhatsApp(config)
    setGuardando(false)
    if (ok) {
      toast({ title: "Configuración de WhatsApp guardada" })
      await cargarReporte(sorteoId || undefined, mesId || undefined)
    } else {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar" })
    }
  }

  const onCambiarSorteo = async (value: string) => {
    setSorteoId(value)
    await cargarReporte(value || undefined, mesId || undefined)
  }

  const onCambiarMes = async (value: string) => {
    setMesId(value)
    await cargarReporte(sorteoId || undefined, value || undefined)
  }

  return (
    <div className="space-y-6">
      {/* Configuración de costo/margen — SOLO modo dueño */}
      {ownerMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Facturación WhatsApp (privado)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Costo que te cobra Twilio por mensaje y el margen que le sumás. El cliente no ve esto.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Costo por mensaje (Twilio)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={costoUnitario}
                  onChange={(e) => setCostoUnitario(e.target.value)}
                  placeholder="0.05"
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Input value={moneda} onChange={(e) => setMoneda(e.target.value)} placeholder="USD" />
              </div>
              <div className="space-y-2">
                <Label>Costo por promo (Twilio)</Label>
                <Input type="number" step="0.001" value={costoUnitarioPromo} onChange={(e) => setCostoUnitarioPromo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Margen (%)</Label>
                <Input
                  type="number"
                  step="1"
                  value={margenPct}
                  onChange={(e) => setMargenPct(e.target.value)}
                  placeholder="20"
                />
              </div>
            </div>
            <Button onClick={guardar} disabled={guardando} className="bg-gray-900 hover:bg-gray-800">
              <Save className="w-4 h-4 mr-2" />
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reporte */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Costo del servicio de WhatsApp</CardTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Mensajes de confirmación y promociones enviados a los compradores.
            </p>
          </div>

          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Filtrar por sorteo</Label>
              <select
                value={sorteoId}
                onChange={(e) => onCambiarSorteo(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Todos los sorteos</option>
                {sorteos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm">Filtrar por mes</Label>
              <select
                value={mesId}
                onChange={(e) => onCambiarMes(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Todos los meses</option>
                {mesesDisponibles.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}

          {!cargando && reporte && (
            <>
              <div className={`grid grid-cols-1 gap-4 ${ownerMode ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Mensajes</p>
                  <p className="text-2xl font-bold">{reporte.cantidad}</p>
                </div>
                {ownerMode && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Costo Twilio</p>
                    <p className="text-2xl font-bold">{fmt(reporte.costoBase)}</p>
                  </div>
                )}
                <div className="rounded-lg border p-4 bg-green-50 border-green-200">
                  <p className="text-sm text-muted-foreground">
                    {ownerMode ? `A facturar (+${(reporte.margen * 100).toFixed(0)}%)` : "Costo total"}
                  </p>
                  <p className="text-2xl font-bold text-green-700">{fmt(reporte.costoConMargen)}</p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">Por tipo de mensaje</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {reporte.porTipo.map((tipo) => <div key={tipo.tipo} className="rounded-lg border p-3"><p className="font-semibold capitalize">{tipo.tipo}</p><p className="text-sm text-muted-foreground">{tipo.cantidad} mensajes · {fmt(tipo.costoConMargen)}</p></div>)}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">{mesId ? "Por sorteo" : "Por mes"}</h4>
                {mesId ? (
                  reporte.porSorteo.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin envíos registrados.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-4">Sorteo</th>
                            <th className="py-2 pr-4">Mensajes</th>
                            {ownerMode && <th className="py-2 pr-4">Costo Twilio</th>}
                            <th className="py-2">{ownerMode ? "A facturar" : "Costo"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reporte.porSorteo.map((s) => (
                            <tr key={s.sorteoId} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium">{nombreSorteo(s.sorteoId)}</td>
                              <td className="py-2 pr-4">{s.cantidad}</td>
                              {ownerMode && <td className="py-2 pr-4">{fmt(s.costoBase)}</td>}
                              <td className="py-2 font-semibold text-green-700">
                                {fmt(s.costoConMargen)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : reporte.porMes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin envíos registrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">Mes</th>
                          <th className="py-2 pr-4">Mensajes</th>
                          {ownerMode && <th className="py-2 pr-4">Costo Twilio</th>}
                          <th className="py-2">{ownerMode ? "A facturar" : "Costo"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporte.porMes.map((m) => (
                          <tr key={m.mes} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{m.mes}</td>
                            <td className="py-2 pr-4">{m.cantidad}</td>
                            {ownerMode && <td className="py-2 pr-4">{fmt(m.costoBase)}</td>}
                            <td className="py-2 font-semibold text-green-700">
                              {fmt(m.costoConMargen)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
