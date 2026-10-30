"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import Link from "next/link"
import { ArrowRight, Crown, Flag, Gift, Maximize, Minimize, Trophy, Zap } from "lucide-react"
import type { PremioRanking } from "@/lib/ranking-premios"
import type { TextosRanking } from "@/lib/contenido-ranking"
import { formatearMonto } from "@/lib/moneda"
import styles from "./ranking-en-vivo.module.css"

interface PuestoRanking { puesto: number; nombre: string; chances: number }

const ORDEN = [1, 2, 3] as const
const FORMATO = new Intl.NumberFormat("es-AR")
const INTERVALO_RANKING = 5 * 60_000
const OCULTAR_CONTROLES_MS = 3000

type DocumentoPantallaCompleta = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> }
type ElementoPantallaCompleta = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }

function elementoEnPantallaCompleta() {
  const documento = document as DocumentoPantallaCompleta
  return documento.fullscreenElement ?? documento.webkitFullscreenElement ?? null
}

function ChancesAnimadas({ valor, activo }: { valor: number; activo: boolean }) {
  const [mostrado, setMostrado] = useState(0)
  const actual = useRef(0)

  useEffect(() => {
    const inicio = actual.current
    if (inicio === valor) {
      setMostrado(valor)
      return
    }
    if (!activo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      actual.current = valor
      setMostrado(valor)
      return
    }
    let fotograma = 0
    const comienzo = performance.now()
    const animar = (ahora: number) => {
      const avance = Math.min(1, (ahora - comienzo) / 720)
      const suavizado = 1 - Math.pow(1 - avance, 3)
      const siguiente = Math.round(inicio + (valor - inicio) * suavizado)
      actual.current = siguiente
      setMostrado(siguiente)
      if (avance < 1) fotograma = requestAnimationFrame(animar)
    }
    fotograma = requestAnimationFrame(animar)
    return () => cancelAnimationFrame(fotograma)
  }, [valor, activo])

  return <><span aria-hidden="true">{FORMATO.format(mostrado)}</span><span className="sr-only">{FORMATO.format(valor)}</span></>
}

function ProximaActualizacion({ hasta, activo, error, textos }: { hasta: number | null; activo: boolean; error: boolean; textos: TextosRanking }) {
  const [segundos, setSegundos] = useState(INTERVALO_RANKING / 1000)

  useEffect(() => {
    if (!activo || !hasta) return
    const actualizar = () => setSegundos(Math.max(0, Math.ceil((hasta - Date.now()) / 1000)))
    actualizar()
    const intervalo = window.setInterval(actualizar, 1000)
    return () => window.clearInterval(intervalo)
  }, [activo, hasta])

  if (!hasta) return null
  const reloj = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`
  const etiqueta = error ? textos.rankingReintentoEtiqueta : textos.rankingActualizacionEtiqueta
  return <span aria-label={etiqueta.replaceAll("{tiempo}", reloj)}>{reloj}</span>
}

function iniciales(nombre?: string) {
  if (!nombre) return "?"
  const partes = nombre.replace(/\./g, "").trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((parte) => Array.from(parte)[0]).join("").toLocaleUpperCase("es-AR") || "?"
}

const BRASAS = [
  { x: 12, d: 0, s: 7.5 }, { x: 24, d: 2.6, s: 9 }, { x: 37, d: 1.1, s: 8 }, { x: 46, d: 4.2, s: 10 },
  { x: 55, d: .4, s: 7 }, { x: 63, d: 3.3, s: 9.5 }, { x: 74, d: 1.8, s: 8.5 }, { x: 86, d: 5, s: 7.8 },
]

function Pedestal({ puesto, fila, premio, finalizado, movimientoActivo, textos }: {
  puesto: 1 | 2 | 3
  fila?: PuestoRanking
  premio?: PremioRanking
  finalizado: boolean
  movimientoActivo: boolean
  textos: TextosRanking
}) {
  return <li className={`${styles.place} ${styles[`place${puesto}`]} ${!fila ? styles.vacant : ""}`} style={{ animationDelay: `${puesto === 1 ? 120 : 260 + puesto * 90}ms` }}>
    <div className={styles.racer}>
      {puesto === 1 && <Crown className={styles.crown} size={30} strokeWidth={1.6} aria-hidden="true" />}
      <div className={styles.avatar} aria-hidden="true"><span>{fila ? iniciales(fila.nombre) : "?"}</span></div>
      <strong className={styles.racerName} key={`${fila?.nombre}-${fila?.puesto}`}>{fila?.nombre || (finalizado ? textos.rankingSinParticipante : textos.rankingLugarLibre)}</strong>
      <span className={styles.racerChances}>
        <span><Zap size={14} strokeWidth={2.6} aria-hidden="true" />{fila ? <><ChancesAnimadas valor={fila.chances} activo={movimientoActivo} /> {textos.rankingChances}</> : textos.rankingSumarChancesPodio}</span>
      </span>
    </div>
    <div className={styles.block}>
      <div className={styles.blockTop} aria-hidden="true" />
      <div className={styles.blockFront}>
        <span className={styles.blockNumber} aria-hidden="true">{puesto}</span>
        {premio?.titulo ? <div className={styles.prize}>
          {premio.imagenUrl ? <img src={premio.imagenUrl} alt="" className={styles.prizeImage} loading="lazy" /> : <span className={styles.prizeIcon} aria-hidden="true"><Gift size={20} strokeWidth={1.8} /></span>}
          <span className={styles.prizeCopy}>
            <strong>{premio.titulo}</strong>
            {premio.montoGuaranies && <strong>{formatearMonto(Number(premio.montoGuaranies), "PYG")}</strong>}
          </span>
        </div> : <Trophy className={styles.blockTrophy} size={puesto === 1 ? 34 : 26} strokeWidth={1.4} aria-hidden="true" />}
      </div>
    </div>
  </li>
}

export function RankingEnVivo({ textos, pagina = false, tv = false }: { textos: TextosRanking; pagina?: boolean; tv?: boolean }) {
  const { rankingKicker: kicker, rankingTitulo: titulo } = textos
  const escenario = useRef<HTMLElement>(null)
  const [filas, setFilas] = useState<PuestoRanking[]>([])
  const [premios, setPremios] = useState<PremioRanking[]>([])
  const [finalizado, setFinalizado] = useState(false)
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando")
  const [movimientoActivo, setMovimientoActivo] = useState(false)
  const [proximaActualizacion, setProximaActualizacion] = useState<number | null>(null)
  const [pantallaCompleta, setPantallaCompleta] = useState(false)
  const [controlesVisibles, setControlesVisibles] = useState(true)
  const modoTv = pagina && (tv || pantallaCompleta)
  const seccionVisible = pagina || (estado === "listo" && (filas.length > 0 || premios.some((premio) => premio.titulo)))

  useEffect(() => {
    const elemento = escenario.current
    if (!elemento) return
    let visible = false
    const sincronizar = () => setMovimientoActivo(visible && document.visibilityState === "visible")
    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting
      sincronizar()
    }, { threshold: 0.05 })
    observador.observe(elemento)
    document.addEventListener("visibilitychange", sincronizar)
    return () => { observador.disconnect(); document.removeEventListener("visibilitychange", sincronizar) }
  }, [seccionVisible])

  useEffect(() => {
    if (!pagina) return
    const sincronizar = () => setPantallaCompleta(elementoEnPantallaCompleta() === escenario.current)
    document.addEventListener("fullscreenchange", sincronizar)
    document.addEventListener("webkitfullscreenchange", sincronizar)
    return () => { document.removeEventListener("fullscreenchange", sincronizar); document.removeEventListener("webkitfullscreenchange", sincronizar) }
  }, [pagina])

  // Escala todo el sitio (rem) al tamaño de la pantalla: en una tele 4K se ve igual que en 1080p.
  useEffect(() => {
    if (!pagina) return
    const raiz = document.documentElement
    raiz.classList.add("ranking-escala")
    raiz.classList.toggle("ranking-tv", modoTv)
    return () => raiz.classList.remove("ranking-escala", "ranking-tv")
  }, [pagina, modoTv])

  // En la tele la pantalla no debe apagarse ni mostrar el cursor/botón encima del ranking.
  useEffect(() => {
    if (!modoTv) { setControlesVisibles(true); return }
    let bloqueo: { release: () => Promise<void> } | null = null
    let temporizador: number | undefined
    const pedirBloqueo = async () => {
      if (document.visibilityState !== "visible") return
      try { bloqueo = await (navigator as Navigator & { wakeLock?: { request: (tipo: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null } catch { bloqueo = null }
    }
    const mostrarControles = () => {
      setControlesVisibles(true)
      window.clearTimeout(temporizador)
      temporizador = window.setTimeout(() => setControlesVisibles(false), OCULTAR_CONTROLES_MS)
    }
    void pedirBloqueo()
    mostrarControles()
    document.addEventListener("visibilitychange", pedirBloqueo)
    window.addEventListener("pointermove", mostrarControles)
    window.addEventListener("keydown", mostrarControles)
    return () => {
      window.clearTimeout(temporizador)
      document.removeEventListener("visibilitychange", pedirBloqueo)
      window.removeEventListener("pointermove", mostrarControles)
      window.removeEventListener("keydown", mostrarControles)
      void bloqueo?.release().catch(() => {})
    }
  }, [modoTv])

  const alternarPantallaCompleta = async () => {
    const documento = document as DocumentoPantallaCompleta
    const elemento = escenario.current as ElementoPantallaCompleta | null
    try {
      if (elementoEnPantallaCompleta()) await (documento.exitFullscreen?.() ?? documento.webkitExitFullscreen?.())
      else if (elemento) await (elemento.requestFullscreen?.({ navigationUI: "hide" }) ?? elemento.webkitRequestFullscreen?.())
    } catch {
      // Navegadores de algunas teles bloquean la API: /ranking?tv=1 sigue mostrando el modo TV.
    }
  }

  useEffect(() => {
    if (!pagina) return
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key.toLowerCase() !== "f" || evento.ctrlKey || evento.metaKey || evento.altKey) return
      if (evento.target instanceof HTMLElement && evento.target.closest("input, textarea, select, [contenteditable]")) return
      void alternarPantallaCompleta()
    }
    window.addEventListener("keydown", alPresionar)
    return () => window.removeEventListener("keydown", alPresionar)
  }, [pagina])

  useEffect(() => {
    let activo = true
    let temporizador: number | undefined
    let cargando = false
    const cargar = async () => {
      if (cargando) return
      cargando = true
      try {
        const [rankingResponse, premiosResponse] = await Promise.all([
          fetch("/api/ranking", { cache: "no-store" }),
          fetch("/api/ranking/premios", { cache: "no-store" }),
        ])
        if (!rankingResponse.ok) throw new Error("No se pudo cargar el ranking")
        const ranking = await rankingResponse.json()
        const datosPremios = premiosResponse.ok ? await premiosResponse.json() : { premios: [], finalizado: false }
        if (!Array.isArray(ranking)) throw new Error("Respuesta de ranking inválida")
        if (activo) {
          setFilas(ranking)
          setPremios(Array.isArray(datosPremios.premios) ? datosPremios.premios : [])
          setFinalizado(Boolean(datosPremios.finalizado))
          setEstado("listo")
        }
      } catch {
        if (activo) setEstado("error")
      } finally {
        cargando = false
        if (activo && document.visibilityState === "visible") {
          setProximaActualizacion(Date.now() + INTERVALO_RANKING)
          temporizador = window.setTimeout(cargar, INTERVALO_RANKING)
        }
      }
    }
    const alCambiarVisibilidad = () => {
      window.clearTimeout(temporizador)
      if (document.visibilityState === "visible") void cargar()
      else setProximaActualizacion(null)
    }
    void cargar()
    document.addEventListener("visibilitychange", alCambiarVisibilidad)
    return () => { activo = false; window.clearTimeout(temporizador); document.removeEventListener("visibilitychange", alCambiarVisibilidad) }
  }, [])

  if (!seccionVisible) return null

  const filasVisibles = pagina ? filas : filas.slice(0, 5)
  const siguientes = filasVisibles.filter((fila) => fila.puesto > 3)
  const premioConfigurado = premios.some((premio) => premio.titulo)
  const lider = filas.find((fila) => fila.puesto === 1)
  const listo = estado !== "cargando" && !(estado === "error" && !filas.length)
  const conCta = estado === "listo" && !finalizado
  const areasTv = [
    `"hero hero"`,
    listo && siguientes.length ? `"arena board"` : `"arena arena"`,
    listo && premioConfigurado && conCta ? `"banner cta"` : listo && premioConfigurado ? `"banner banner"` : conCta ? `"cta cta"` : "",
  ].join(" ")

  return <section ref={escenario} className={`${styles.stage} ${pagina ? styles.fullPage : styles.preview} ${modoTv ? styles.tv : ""} ${modoTv && !controlesVisibles ? styles.controlsHidden : ""} ${movimientoActivo ? styles.motionActive : ""}`} aria-labelledby="ranking-titulo">
    <div className={styles.backdrop} aria-hidden="true">
      <div className={styles.bloom} />
      <div className={styles.halftone} />
      <div className={styles.streaks}>{[0, 1, 2, 3, 4].map((linea) => <span key={linea} />)}</div>
      <div className={styles.grain} />
    </div>

    {pagina && <button type="button" className={styles.fullscreenButton} onClick={() => void alternarPantallaCompleta()} aria-pressed={pantallaCompleta} title="Atajo: tecla F">
      {pantallaCompleta ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
      {pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
    </button>}

    <div className={styles.shell} style={modoTv ? { gridTemplateAreas: areasTv } : undefined}>
      <header className={styles.hero}>
        <div className={styles.livePill}><span className={styles.liveDot} aria-hidden="true" />{finalizado ? textos.rankingResultadoFinal : kicker}{!finalizado && <span className={styles.pillClock}><ProximaActualizacion hasta={proximaActualizacion} activo={movimientoActivo} error={estado === "error"} textos={textos} /></span>}</div>
        <div className={styles.titleWrap}>
          <span className={styles.titleEcho} aria-hidden="true">{titulo}</span>
          {pagina ? <h1 id="ranking-titulo" className={styles.title}>{titulo}</h1> : <h2 id="ranking-titulo" className={styles.title}>{titulo}</h2>}
        </div>
      </header>

      {estado === "error" && !filas.length ? <div className={styles.state} role="alert">{textos.rankingError}</div>
        : estado === "cargando" ? <div className={styles.state} role="status"><span className={styles.loader} aria-hidden="true" />{textos.rankingCargando}</div>
          : null}

      {listo && <>
        <div className={styles.arena}>
          <div className={styles.spotlight} aria-hidden="true" />
          <div className={styles.embers} aria-hidden="true">{BRASAS.map((brasa, indice) => <span key={indice} style={{ left: `${brasa.x}%`, animationDelay: `${brasa.d}s`, animationDuration: `${brasa.s}s` }} />)}</div>
          <ol className={styles.podium} aria-label={textos.rankingPodioEtiqueta} aria-live="polite">
            {ORDEN.map((puesto) => <Pedestal key={puesto} puesto={puesto} fila={filasVisibles.find((fila) => fila.puesto === puesto)} premio={premios.find((premio) => premio.puesto === puesto)} finalizado={finalizado} movimientoActivo={movimientoActivo} textos={textos} />)}
          </ol>
          <div className={styles.floor} aria-hidden="true"><div className={styles.floorGrid} /></div>
        </div>
        {premioConfigurado && <div className={styles.prizeBanner}>
          <Trophy className={styles.prizeBannerIcon} size={44} strokeWidth={1.6} aria-hidden="true" />
          <p>{textos.rankingPremiosIntro} <strong>{finalizado ? textos.rankingPremiosFinal : textos.rankingPremiosActivo}</strong></p>
        </div>}
        {!filas.length && <p className={styles.empty}>{textos.rankingVacio}</p>}

        {siguientes.length > 0 && <div className={styles.board}>
          <div className={styles.boardHead}>
            <h3><Flag size={16} strokeWidth={2.2} aria-hidden="true" />{textos.rankingTablaTitulo}</h3>
            <span>{finalizado ? textos.rankingTopFinal : textos.rankingTopActivo.replaceAll("{cantidad}", String(filas.length))}</span>
          </div>
          <ol className={styles.rows} style={modoTv ? { gridTemplateRows: `repeat(${Math.max(siguientes.length, 5)}, minmax(0, 1fr))`, "--fila": siguientes.length <= 7 ? 1.45 : siguientes.length <= 11 ? 1.2 : 1 } as CSSProperties : undefined}>{siguientes.map((fila, indice) => {
            const avance = lider?.chances ? Math.max(4, Math.round((fila.chances / lider.chances) * 100)) : 0
            return <li key={`${fila.puesto}-${fila.nombre}`} style={{ animationDelay: `${Math.min(indice, 12) * 45}ms` }}>
              <span className={styles.rowPosition}>{String(fila.puesto).padStart(2, "0")}</span>
              <span className={styles.rowRacer}>
                <span className={styles.rowAvatar} aria-hidden="true">{iniciales(fila.nombre)}</span>
                <strong>{fila.nombre}</strong>
              </span>
              <span className={styles.rowTrack}>
                <span className={styles.bar} aria-hidden="true"><span style={{ width: `${avance}%` }} /></span>
              </span>
              <span className={styles.rowChances}>{FORMATO.format(fila.chances)} <span>{textos.rankingChances}</span></span>
            </li>
          })}</ol>
        </div>}
      </>}

      {conCta && <div className={styles.ctaPanel}>
        <div className={styles.checkers} aria-hidden="true" />
        <div className={styles.ctaCopy}><strong>{textos.rankingCtaTitulo}</strong></div>
        <Link href={pagina ? "/" : "/ranking"} className={styles.cta}>
          {pagina ? textos.rankingCtaBoton : textos.rankingVerCompleto}<ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>}
    </div>
  </section>
}
