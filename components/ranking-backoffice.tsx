"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { actualizarPremiosRanking, obtenerConfiguracionWhatsApp, obtenerPremiosRanking, obtenerRankingAdmin, obtenerReporteCampanias, obtenerResultadoRanking, type FilaRanking, type ReporteCampaniaPromo } from "@/lib/database"
import { PREMIOS_RANKING_VACIOS, resumenPremiosRanking, type PremioRanking, type ResultadoRanking } from "@/lib/ranking-premios"
import { esNumeroTelefono, normalizarTelefono } from "@/lib/whatsapp"
import { formatearVencimientoPromo } from "@/lib/whatsapp/formatear-vencimiento-promo"
import type { Sorteo } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

function fechaArgentina(dias = 2) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(Date.now() + dias * 86400000)).replace(" ", "T")
}

export function RankingBackoffice({ sorteo }: { sorteo: Sorteo | null }) {
  const { toast } = useToast()
  const [ranking, setRanking] = useState<FilaRanking[]>([])
  const [premios, setPremios] = useState<PremioRanking[]>(PREMIOS_RANKING_VACIOS)
  const [resultado, setResultado] = useState<ResultadoRanking[]>([])
  const [guardandoPremios, setGuardandoPremios] = useState(false)
  const [subiendoPuesto, setSubiendoPuesto] = useState<number | null>(null)
  const [rankingTemplateDisponible, setRankingTemplateDisponible] = useState(false)
  const [marca, setMarca] = useState("Agustin Sosa")
  const [reportes, setReportes] = useState<ReporteCampaniaPromo[]>([])
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [minimo, setMinimo] = useState(0)
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [porcentaje, setPorcentaje] = useState(30)
  const [packs, setPacks] = useState<number[]>([])
  const [venceAt, setVenceAt] = useState(fechaArgentina)
  const [usos, setUsos] = useState<"unico" | "ilimitado">("unico")
  const [costoUnitario, setCostoUnitario] = useState(0.076)
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0, errores: 0 })

  useEffect(() => {
    if (!sorteo?.id || sorteo.id === "default") return
    let activo = true
    setCargando(true)
    Promise.all([obtenerRankingAdmin(sorteo.id), obtenerReporteCampanias(sorteo.id), obtenerConfiguracionWhatsApp(), obtenerPremiosRanking(sorteo.id), obtenerResultadoRanking(sorteo.id), fetch("/api/promos/template").then((r) => r.ok ? r.json() : { rankingTemplateDisponible: false })])
      .then(([filas, campañas, config, premiosGuardados, resultadoGuardado, template]) => { if (activo) { setRanking(filas); setReportes(campañas); setCostoUnitario(config.costoUnitarioPromo); setPremios(premiosGuardados); setResultado(resultadoGuardado); setRankingTemplateDisponible(Boolean(template.rankingTemplateDisponible)); setMarca(typeof template.marca === "string" ? template.marca : "Agustin Sosa"); setSeleccionados([]) } })
      .catch((error) => toast({ variant: "destructive", title: "No se pudo cargar el ranking", description: String(error) }))
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [sorteo?.id])

  const visibles = useMemo(() => ranking.filter((fila) => fila.chances >= minimo && fila.nombre.toLocaleLowerCase("es-AR").includes(busqueda.toLocaleLowerCase("es-AR"))), [ranking, minimo, busqueda])
  const elegible = (fila: FilaRanking) => esNumeroTelefono(fila.telefono) && Boolean(normalizarTelefono(fila.telefono, fila.pais_transferencia))
  const elegiblesFiltrados = visibles.filter(elegible)
  const seleccion = ranking.filter((fila) => seleccionados.includes(fila.persona_key))
  const packsVisibles = sorteo ? [1, 2, 3, 4, 5].filter((n) => sorteo[`pack_${n}_visible` as keyof Sorteo]).map((n) => Number(sorteo[`cantidad_pack_${n}` as keyof Sorteo])) : []
  const primerNombre = seleccion[0]?.nombre.trim().split(/\s+/)[0] || "Nombre"
  const premiosCompletos = premios.every((premio) => premio.titulo)
  const resumenPremios = premiosCompletos ? resumenPremiosRanking(premios) : ""
  const fechaVencimiento = venceAt ? new Date(`${venceAt}-03:00`) : null
  const vencimientoTexto = fechaVencimiento && Number.isFinite(fechaVencimiento.getTime()) ? formatearVencimientoPromo(fechaVencimiento) : "—"
  const vistaPrevia = `¡Hola ${primerNombre}! 👋\n\nYa estás en el ranking de ${marca} y todavía podés subir. *Tus chances hasta hoy: ${seleccion[0]?.chances ?? 0}.*\n\n${resumenPremios ? `🏆 Los tres primeros se llevan estos premios: ${resumenPremios}\n\n` : ""}Te dejamos *${porcentaje}% OFF* para sumar más chances. Podés usarlo hasta el ${vencimientoTexto}.\n\nTocá “Usar mi descuento” si querés aprovecharlo. ¡Mucha suerte!`

  const editarPremio = (puesto: number, campo: "titulo" | "descripcion" | "imagenUrl" | "montoGuaranies", valor: string) => {
    setPremios((actual) => actual.map((premio) => premio.puesto === puesto ? { ...premio, [campo]: valor } : premio))
  }

  const subirImagen = async (puesto: number, archivo?: File) => {
    if (!archivo) return
    setSubiendoPuesto(puesto)
    try {
      const cuerpo = new FormData()
      cuerpo.append("file", archivo)
      const respuesta = await fetch("/api/upload-image", { method: "POST", body: cuerpo })
      const datos = await respuesta.json()
      if (!respuesta.ok || !datos.url) throw new Error(datos.error || "No se pudo subir la imagen")
      editarPremio(puesto, "imagenUrl", datos.url)
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudo subir la imagen", description: String(error) })
    } finally { setSubiendoPuesto(null) }
  }

  const guardarPremios = async () => {
    if (!sorteo) return
    setGuardandoPremios(true)
    try {
      await actualizarPremiosRanking(sorteo.id, premios)
      toast({ title: "Premios guardados", description: "Ya se muestran en el ranking público." })
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudieron guardar los premios", description: String(error) })
    } finally { setGuardandoPremios(false) }
  }

  const enviarLotes = async (campaniaId: string, total: number, hechosInicial = 0, erroresInicial = 0) => {
    setEnviando(true)
    let hechos = hechosInicial
    let errores = erroresInicial
    try {
      for (;;) {
        const respuesta = await fetch("/api/promos/enviar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaniaId, lote: 20 }) })
        const datos = await respuesta.json()
        if (!respuesta.ok) throw new Error(datos.error || "No se pudo enviar el lote")
        hechos += datos.enviados + datos.errores
        errores += datos.errores
        setProgreso({ hechos, total, errores })
        if (!datos.pendientes) break
      }
      toast({ title: "Campaña terminada", description: `${hechos - errores} enviados · ${errores} errores` })
      if (sorteo) {
        const [filas, campañas] = await Promise.all([obtenerRankingAdmin(sorteo.id), obtenerReporteCampanias(sorteo.id)])
        setRanking(filas); setReportes(campañas)
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Envío interrumpido", description: `${String(error)}. Podés retomarlo desde el reporte.` })
    } finally { setEnviando(false) }
  }

  const crearYEnviar = async () => {
    if (!sorteo || !seleccionados.length) return
    if (!Number.isInteger(porcentaje) || porcentaje < 1 || porcentaje > 90 || !venceAt || new Date(`${venceAt}-03:00`).getTime() <= Date.now()) {
      toast({ variant: "destructive", title: "Revisá porcentaje y vencimiento" }); return
    }
    setEnviando(true)
    try {
      const respuesta = await fetch("/api/promos/enviar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        sorteoId: sorteo.id, porcentaje, packsAplicables: packs.length ? packs : null, usos,
        venceAt: new Date(`${venceAt}-03:00`).toISOString(), destinatarios: seleccionados,
      }) })
      const datos = await respuesta.json()
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo crear la campaña")
      setProgreso({ hechos: 0, total: datos.total, errores: 0 })
      await enviarLotes(datos.campaniaId, datos.total)
    } catch (error) {
      toast({ variant: "destructive", title: "No se pudo crear la campaña", description: String(error) })
      setEnviando(false)
    }
  }

  if (!sorteo || sorteo.id === "default") return <Card><CardContent className="p-6">No hay sorteo activo.</CardContent></Card>

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Premios del top 3</CardTitle><p className="text-sm text-muted-foreground">Cada premio corresponde al puesto indicado al finalizar este sorteo. Se muestra en el ranking público. Dejá un título vacío para ocultar ese premio.</p></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-3">{premios.map((premio) => <div key={premio.puesto} className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <p className="font-bold">{["🥇", "🥈", "🥉"][premio.puesto - 1]} Puesto {premio.puesto}</p>
          <div><Label htmlFor={`premio-titulo-${premio.puesto}`}>Premio</Label><Input id={`premio-titulo-${premio.puesto}`} maxLength={100} value={premio.titulo} disabled={sorteo.estado !== "activo"} placeholder="Ej.: Casco integral" onChange={(e) => editarPremio(premio.puesto, "titulo", e.target.value)} /></div>
          <div><Label htmlFor={`premio-descripcion-${premio.puesto}`}>Detalle</Label><Input id={`premio-descripcion-${premio.puesto}`} maxLength={280} value={premio.descripcion} disabled={sorteo.estado !== "activo"} placeholder="Modelo, color o condiciones" onChange={(e) => editarPremio(premio.puesto, "descripcion", e.target.value)} /></div>
          <div><Label htmlFor={`premio-guaranies-${premio.puesto}`}>Monto en guaraníes (₲)</Label><Input id={`premio-guaranies-${premio.puesto}`} type="number" min="1" step="1" inputMode="numeric" value={premio.montoGuaranies} disabled={sorteo.estado !== "activo"} placeholder="Ej.: 1000000" onChange={(e) => editarPremio(premio.puesto, "montoGuaranies", e.target.value)} /></div>
          {premio.imagenUrl && <img src={premio.imagenUrl} alt={premio.titulo || `Premio ${premio.puesto}`} className="h-36 w-full rounded-lg object-cover" />}
          <div className="flex items-center gap-2"><label className="cursor-pointer rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted">{subiendoPuesto === premio.puesto ? "Subiendo…" : premio.imagenUrl ? "Cambiar imagen" : "Subir imagen"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={sorteo.estado !== "activo" || subiendoPuesto !== null} onChange={(e) => { void subirImagen(premio.puesto, e.target.files?.[0]); e.target.value = "" }} /></label>{premio.imagenUrl && <Button type="button" size="sm" variant="ghost" disabled={sorteo.estado !== "activo"} onClick={() => editarPremio(premio.puesto, "imagenUrl", "")}>Quitar</Button>}</div>
        </div>)}</div>
        {sorteo.estado === "activo" && <Button onClick={guardarPremios} disabled={guardandoPremios || subiendoPuesto !== null}>{guardandoPremios ? "Guardando…" : "Guardar premios"}</Button>}
        {resultado.length > 0 && <div className="rounded-lg border bg-muted/30 p-4"><p className="mb-2 font-semibold">Premiados del top 3</p>{resultado.slice(0, 3).map((fila) => <p key={fila.puesto} className="text-sm">{fila.puesto}. {fila.nombre} · {fila.chances} chances{fila.titulo ? ` · ${fila.titulo}` : ""}{fila.telefono ? ` · ${fila.telefono}` : ""}{fila.email ? ` · ${fila.email}` : ""}</p>)}</div>}
      </CardContent></Card>
    <Card><CardHeader><CardTitle>Ranking de compradores</CardTitle><p className="text-sm text-muted-foreground">Solo compras pagadas del sorteo activo. La selección se usa para la campaña de WhatsApp.</p></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3"><Input className="max-w-sm" placeholder="Buscar por nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /><div className="flex items-center gap-2"><Label htmlFor="minimo-chances">Mínimo de chances</Label><Input id="minimo-chances" className="w-24" type="number" min={0} value={minimo} onChange={(e) => setMinimo(Math.max(0, Number(e.target.value) || 0))} /></div></div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={elegiblesFiltrados.length > 0 && elegiblesFiltrados.every((fila) => seleccionados.includes(fila.persona_key))} onCheckedChange={(valor) => setSeleccionados(valor ? [...new Set([...seleccionados, ...elegiblesFiltrados.map((fila) => fila.persona_key)])] : seleccionados.filter((key) => !elegiblesFiltrados.some((fila) => fila.persona_key === key)))} />Seleccionar todos los filtrados ({elegiblesFiltrados.length})</label>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Elegir</th><th className="p-2">#</th><th className="p-2">Nombre</th><th className="p-2">Teléfono</th><th className="p-2">País</th><th className="p-2">Chances</th><th className="p-2">Compras</th><th className="p-2">Última promo</th></tr></thead><tbody>{visibles.map((fila) => <tr key={fila.persona_key} className="border-b last:border-0"><td className="p-2"><Checkbox checked={seleccionados.includes(fila.persona_key)} disabled={!elegible(fila)} onCheckedChange={(valor) => setSeleccionados(valor ? [...seleccionados, fila.persona_key] : seleccionados.filter((key) => key !== fila.persona_key))} /></td><td className="p-2 font-bold">{ranking.indexOf(fila) + 1}</td><td className="p-2 font-medium">{fila.nombre}</td><td className="p-2">{elegible(fila) ? fila.telefono : <Badge variant="secondary">Sin teléfono</Badge>}</td><td className="p-2">{fila.pais_transferencia || "AR"}</td><td className="p-2 font-bold">{fila.chances}</td><td className="p-2">{fila.compras}</td><td className="p-2">{fila.ultimo_envio_promo ? new Date(fila.ultimo_envio_promo).toLocaleDateString("es-AR") : "—"}</td></tr>)}</tbody></table></div>
        {cargando && <p className="text-sm text-muted-foreground">Cargando ranking…</p>}
        {!cargando && !visibles.length && <p className="text-sm text-muted-foreground">No hay compradores para este filtro.</p>}
      </CardContent></Card>

    <Card><CardHeader><CardTitle>Campaña de promo</CardTitle><p className="text-sm text-muted-foreground">{seleccionados.length} destinatarios · costo estimado USD {(seleccionados.length * costoUnitario).toFixed(2)}</p></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="promo-porcentaje">Descuento (%)</Label><Input id="promo-porcentaje" type="number" min={1} max={90} value={porcentaje} onChange={(e) => setPorcentaje(Number(e.target.value))} /></div><div><Label htmlFor="promo-vence">Vence (hora Argentina)</Label><Input id="promo-vence" type="datetime-local" value={venceAt} onChange={(e) => setVenceAt(e.target.value)} /></div><div><Label>Usos</Label><div className="mt-2 flex gap-4 text-sm"><label><input type="radio" checked={usos === "unico"} onChange={() => setUsos("unico")} /> Una compra</label><label><input type="radio" checked={usos === "ilimitado"} onChange={() => setUsos("ilimitado")} /> Ilimitados</label></div></div></div>
      <fieldset><legend className="mb-2 text-sm font-medium">Packs aplicables (ninguno marcado = todos)</legend><div className="flex flex-wrap gap-4">{packsVisibles.map((cantidad) => <label key={cantidad} className="flex items-center gap-2 text-sm"><Checkbox checked={packs.includes(cantidad)} onCheckedChange={(valor) => setPacks(valor ? [...packs, cantidad] : packs.filter((n) => n !== cantidad))} />{cantidad} chances</label>)}</div></fieldset>
      <div className="rounded-lg border bg-gray-50 p-4"><p className="mb-2 text-xs font-semibold uppercase text-gray-500">Texto sugerido para Twilio</p><p className="whitespace-pre-line text-sm">{vistaPrevia}</p><p className="mt-3 text-xs text-muted-foreground">El mensaje enviado usa la plantilla aprobada en Twilio; actualizala allí para que coincida con este texto.</p>{premios.some((premio) => premio.titulo) && <p className="mt-2 text-xs text-muted-foreground">{rankingTemplateDisponible && premiosCompletos ? "La plantilla de ranking está configurada; el envío incluye el resumen de premios." : "Para incluir los premios en el envío, completá los tres premios y configurá TWILIO_CONTENT_SID_PROMO_RANKING. Mientras tanto se usa la plantilla de promo actual."}</p>}</div>
      {enviando && <div><Progress value={progreso.total ? progreso.hechos / progreso.total * 100 : 0} /><p className="mt-1 text-xs text-muted-foreground">{progreso.hechos}/{progreso.total} procesados · {progreso.errores} errores</p></div>}
      <AlertDialog><AlertDialogTrigger asChild><Button disabled={enviando || !seleccionados.length}>Enviar promo</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar campaña</AlertDialogTitle><AlertDialogDescription>Se enviará un código personal a {seleccionados.length} teléfonos. Costo estimado: USD {(seleccionados.length * costoUnitario).toFixed(2)}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={crearYEnviar}>Crear y enviar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Campañas anteriores</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Fecha</th><th className="p-2">Promo</th><th className="p-2">Vence</th><th className="p-2">Enviados</th><th className="p-2">Entregados</th><th className="p-2">Errores</th><th className="p-2">En revisión</th><th className="p-2">Usados</th><th className="p-2">Recaudado</th><th className="p-2">Costo WhatsApp</th><th className="p-2"></th></tr></thead><tbody>{reportes.map((r) => <tr key={r.id} className="border-b"><td className="p-2">{new Date(r.createdAt).toLocaleDateString("es-AR")}</td><td className="p-2">{r.porcentaje}%</td><td className="p-2">{new Date(r.venceAt).toLocaleString("es-AR")}</td><td className="p-2">{r.enviados}/{r.total}</td><td className="p-2">{r.entregados}</td><td className="p-2">{r.errores}</td><td className="p-2">{r.procesando}</td><td className="p-2">{r.usados}</td><td className="p-2">{r.recaudado.map((m) => `${m.moneda} ${m.monto.toLocaleString("es-AR")}`).join(" · ") || "—"}</td><td className="p-2">USD {r.costoWhatsApp.toFixed(2)}</td><td className="p-2">{r.enviados + r.errores + r.procesando < r.total && <Button size="sm" variant="outline" disabled={enviando} onClick={() => { const hechos = r.enviados + r.errores + r.procesando; setProgreso({ hechos, total: r.total, errores: r.errores }); void enviarLotes(r.id, r.total, hechos, r.errores) }}>Retomar</Button>}</td></tr>)}</tbody></table>{!reportes.length && <p className="py-4 text-sm text-muted-foreground">Todavía no hay campañas.</p>}</div></CardContent></Card>
  </div>
}
