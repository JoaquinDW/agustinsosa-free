"use client"

import { useState, useEffect, type CSSProperties } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Trophy } from "lucide-react"
import Link from "next/link"
import { FormularioGratis } from "@/components/formulario-gratis"
import { Header } from "@/components/header"
import { GanadoresPasados } from "@/components/ganadores-pasados"
import { GanadoresExpress } from "@/components/ganadores-express"
import { RedesSociales } from "@/components/redes-sociales"
import dynamic from "next/dynamic"

const IphoneCarousel = dynamic(() => import("@/components/iphone-carousel"), {
  ssr: false,
})
import {
  obtenerSorteoActivo,
  obtenerEstadisticasSorteo,
  obtenerPremiosSecundarios,
} from "@/lib/database"
import type { PaisTransferencia, Sorteo } from "@/lib/supabase"
import { formatearMonto } from "@/lib/moneda"
import { aplicarDescuento } from "@/lib/promos"
import type { PremiosSecundarios } from "@/lib/database"
import {
  obtenerContenido,
  CONTENIDO_DEFAULTS,
  type ContenidoSitio,
} from "@/lib/contenido"
import {
  AnimatedProgress,
  PorcentajeCompletado,
  ChancesLabel,
} from "@/components/animated-progress"
import { generarComprobante } from "@/lib/comprobante"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

function PreciosFijos({
  precioArgentina,
  precioParaguay,
  porcentaje,
}: {
  precioArgentina: number
  precioParaguay: number
  porcentaje?: number
}) {
  const montoArgentina = formatearMonto(
    porcentaje
      ? aplicarDescuento(precioArgentina, porcentaje)
      : precioArgentina,
    "ARS",
  )
  const montoParaguay = formatearMonto(
    porcentaje ? aplicarDescuento(precioParaguay, porcentaje) : precioParaguay,
    "PYG",
  )

  return (
    <div className="fixed-prices">
      <div
        className={`fixed-price fixed-price-ar${porcentaje ? " fixed-price-discounted" : ""}`}
      >
        <span className="fixed-price-flag" aria-hidden="true">
          🇦🇷
        </span>
        <span className="sr-only">Argentina:</span>
        <span className="fixed-price-divider" aria-hidden="true" />
        <span className="fixed-price-amount">
          {porcentaje ? (
            <span className="fixed-price-original">
              {formatearMonto(precioArgentina, "ARS")}
            </span>
          ) : null}
          <span className="fixed-price-current">{montoArgentina}</span>
        </span>
      </div>
      <div
        className={`fixed-price fixed-price-py${porcentaje ? " fixed-price-discounted" : ""}`}
      >
        <span className="fixed-price-flag" aria-hidden="true">
          🇵🇾
        </span>
        <span className="sr-only">Paraguay:</span>
        <span className="fixed-price-divider" aria-hidden="true" />
        <span className="fixed-price-amount">
          {porcentaje ? (
            <span className="fixed-price-original">
              {formatearMonto(precioParaguay, "PYG")}
            </span>
          ) : null}
          <span className="fixed-price-current">{montoParaguay}</span>
        </span>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [promo, setPromo] = useState<{
    codigo: string
    nombre: string
    porcentaje: number
    venceAt: string
    packsAplicables: number[] | null
  } | null>(null)
  const [promoNoDisponible, setPromoNoDisponible] = useState(false)
  const [promoTiempo, setPromoTiempo] = useState(0)
  const [sorteo, setSorteo] = useState<Sorteo | null>(null)
  const [chancesVendidas, setChancesVendidas] = useState(0)
  const [totalCompradores, setTotalCompradores] = useState(0)
  const [totalRecaudado, setTotalRecaudado] = useState(0)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [transferenciaExitoAbierta, setTransferenciaExitoAbierta] =
    useState(false)
  const [packSeleccionado, setPackSeleccionado] = useState<{
    chances: number
    precio: number
    precioParaguay: number
    sorteoId?: string
  } | null>(null)
  const [animacionVisible, setAnimacionVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [consultaEmail, setConsultaEmail] = useState("")
  const [consultaLoading, setConsultaLoading] = useState(false)
  const [consultaResultados, setConsultaResultados] = useState<Array<{
    id: string
    nombre: string
    numeros_asignados: number[]
    cantidad_chances: number
    sorteo_nombre: string
    created_at: string
  }> | null>(null)
  const [consultaError, setConsultaError] = useState<string | null>(null)
  const [premiosSecundarios, setPremiosSecundarios] =
    useState<PremiosSecundarios | null>(null)
  const [contenido, setContenido] = useState<ContenidoSitio>(CONTENIDO_DEFAULTS)
  const { toast } = useToast()
  const heroSubtitulo = contenido.hero_subtitulo
    .replaceAll("🎟️", "")
    .replaceAll("👇", "")
    .trim()

  useEffect(() => {
    let activo = true
    const codigoUrl = new URLSearchParams(window.location.search).get("promo")
    let codigo = codigoUrl
    try {
      codigo ||= sessionStorage.getItem("promoCodigo")
    } catch {
      /* Storage puede estar bloqueado. */
    }
    if (!codigo) return
    fetch(`/api/promo/${encodeURIComponent(codigo)}`, { cache: "no-store" })
      .then((respuesta) => respuesta.json())
      .then((datos) => {
        if (!activo) return
        if (datos.valido) {
          setPromo({
            codigo: codigo!,
            nombre: datos.nombre,
            porcentaje: datos.porcentaje,
            venceAt: datos.venceAt,
            packsAplicables: datos.packsAplicables,
          })
          try {
            sessionStorage.setItem("promoCodigo", codigo!)
          } catch {
            /* Storage puede estar bloqueado. */
          }
        } else {
          setPromoNoDisponible(true)
          try {
            sessionStorage.removeItem("promoCodigo")
          } catch {
            /* Storage puede estar bloqueado. */
          }
        }
      })
      .catch(() => setPromoNoDisponible(true))
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    if (!promo) return
    const actualizar = () => {
      const restante = Math.max(
        0,
        new Date(promo.venceAt).getTime() - Date.now(),
      )
      setPromoTiempo(restante)
      if (restante === 0) {
        setPromo(null)
        setPromoNoDisponible(true)
      }
    }
    actualizar()
    const intervalo = window.setInterval(actualizar, 1000)
    return () => window.clearInterval(intervalo)
  }, [promo])

  const promoParaPack = (chances: number) =>
    promo &&
    (promo.packsAplicables === null || promo.packsAplicables.includes(chances))
      ? promo
      : null

  const getPacks = () => {
    if (!sorteo) return []

    const allPacks = [
      {
        chances: sorteo.cantidad_pack_1 || 10,
        precio: sorteo.precio_6_chances || 21000,
        precioParaguay:
          sorteo.precio_pack_1_pyg ?? (sorteo.precio_6_chances || 21000) * 7,
        color: "from-green-400 to-green-600",
        descripcion: sorteo.descripcion_pack_1 || "Honda Wave 2025",
        visible: sorteo.pack_1_visible ?? true,
      },
      {
        chances: sorteo.cantidad_pack_2 || 25,
        precio: sorteo.precio_12_chances || 42000,
        precioParaguay:
          sorteo.precio_pack_2_pyg ?? (sorteo.precio_12_chances || 42000) * 7,
        color: "from-lime-400 to-green-500",
        popular: true,
        descripcion:
          sorteo.descripcion_pack_2 ||
          "Honda Wave 2025 + 5 chances en pre-venta New Titan 2018",
        visible: sorteo.pack_2_visible ?? true,
      },
      {
        chances: sorteo.cantidad_pack_3 || 50,
        precio: sorteo.precio_24_chances || 84000,
        precioParaguay:
          sorteo.precio_pack_3_pyg ?? (sorteo.precio_24_chances || 84000) * 7,
        color: "from-emerald-400 to-lime-500",
        descripcion:
          sorteo.descripcion_pack_3 ||
          "Honda Wave 2025 + 5 chances pre-venta New Titan 2018",
        visible: sorteo.pack_3_visible ?? true,
      },
      {
        chances: sorteo.cantidad_pack_4 || 0,
        precio: sorteo.precio_pack_4 || 0,
        precioParaguay:
          sorteo.precio_pack_4_pyg ?? (sorteo.precio_pack_4 || 0) * 7,
        color: "from-teal-400 to-emerald-600",
        descripcion: sorteo.descripcion_pack_4 || "",
        visible: sorteo.pack_4_visible ?? false,
      },
      {
        chances: sorteo.cantidad_pack_5 || 0,
        precio: sorteo.precio_pack_5 || 0,
        precioParaguay:
          sorteo.precio_pack_5_pyg ?? (sorteo.precio_pack_5 || 0) * 7,
        color: "from-cyan-400 to-teal-600",
        descripcion: sorteo.descripcion_pack_5 || "",
        visible: sorteo.pack_5_visible ?? false,
      },
    ]

    return allPacks.filter((pack) => pack.visible)
  }

  useEffect(() => {
    cargarDatos()
    const timer = setTimeout(() => setAnimacionVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const cargarDatos = async () => {
    try {
      const [sorteoActivo, premios, contenidoSitio] = await Promise.all([
        obtenerSorteoActivo(),
        obtenerPremiosSecundarios(),
        obtenerContenido(),
      ])
      setPremiosSecundarios(premios)
      setContenido(contenidoSitio)
      if (sorteoActivo) {
        setSorteo(sorteoActivo)
        const estadisticas = await obtenerEstadisticasSorteo(sorteoActivo.id)
        setChancesVendidas(estadisticas.chancesVendidas)
        setTotalCompradores(estadisticas.totalCompradores)
        setTotalRecaudado(estadisticas.totalRecaudado)
      } else {
        console.error("No se pudo cargar el sorteo")
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  // Mercado Pago deshabilitado permanentemente. Flujo anterior comentado.
  //   const procesarCompra = async (
  //     nombre: string,
  //     email: string,
  //     telefono: string,
  //   ) => {
  //     if (!packSeleccionado || !sorteo) return;
  //
  //     if (document.body.dataset.sosaPreview === "true") {
  //       toast({
  //         title: "Vista previa privada",
  //         description: "Las compras se habilitan al publicar el sitio.",
  //       });
  //       return;
  //     }
  //
  //     try {
  //       const datosCompra = {
  //         sorteoId: sorteo.id,
  //         nombre,
  //         email,
  //         telefono,
  //         chances: packSeleccionado.chances,
  //         ...(promoParaPack(packSeleccionado.chances) ? { promoCodigo: promo!.codigo } : {}),
  //         precio: packSeleccionado.precio,
  //         timestamp: Date.now(),
  //       };
  //
  //       localStorage.setItem(
  //         "sorteo_compra_pendiente",
  //         JSON.stringify(datosCompra),
  //       );
  //
  //       toast({
  //         title: "Preparando pago...",
  //         description: "Te redirigiremos a MercadoPago en un momento",
  //       });
  //
  //       const response = await fetch("/api/crear-preferencia", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify(datosCompra),
  //       });
  //
  //       if (!response.ok) {
  //         const errorPago = await response.json().catch(() => ({}));
  //         if (promoParaPack(packSeleccionado.chances)) {
  //           setPromo(null); setPromoNoDisponible(true);
  //           try { sessionStorage.removeItem("promoCodigo"); } catch { /* Storage puede estar bloqueado. */ }
  //         }
  //         throw new Error(errorPago.error || "Error creando preferencia de pago");
  //       }
  //
  //       const { preferenceId, paymentUrl } = await response.json();
  //
  //       const datosActualizados = { ...datosCompra, preferenceId };
  //       localStorage.setItem(
  //         "sorteo_compra_pendiente",
  //         JSON.stringify(datosActualizados),
  //       );
  //
  //       window.location.href = paymentUrl;
  //     } catch (error) {
  //       console.error("Error procesando compra:", error);
  //       toast({
  //         variant: "destructive",
  //         title: "Error en la compra",
  //         description: error instanceof Error ? error.message : "Ocurrió un error inesperado. Intenta nuevamente.",
  //       });
  //     }
  //
  //     setModalAbierto(false);
  //     setPackSeleccionado(null);
  //   };
  //

  const procesarTransferencia = async (data: {
    nombre: string
    email: string
    telefono: string
    comprobanteFile: File
    paisTransferencia: PaisTransferencia
  }) => {
    if (!packSeleccionado || !sorteo) return

    if (document.body.dataset.sosaPreview === "true") {
      toast({
        title: "Vista previa privada",
        description: "Las transferencias se habilitan al publicar el sitio.",
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append("sorteoId", sorteo.id)
      formData.append("nombre", data.nombre)
      formData.append("email", data.email.trim())
      formData.append("telefono", data.telefono.trim())
      formData.append("cantidadChances", packSeleccionado.chances.toString())
      if (promoParaPack(packSeleccionado.chances))
        formData.append("promoCodigo", promo!.codigo)
      formData.append("paisTransferencia", data.paisTransferencia)
      formData.append("comprobante", data.comprobanteFile)

      toast({
        title: "Procesando...",
        description: "Estamos registrando tu transferencia",
      })

      const response = await fetch("/api/transferencia", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorTransferencia = await response.json().catch(() => ({}))
        if (promoParaPack(packSeleccionado.chances)) {
          setPromo(null)
          setPromoNoDisponible(true)
          try {
            sessionStorage.removeItem("promoCodigo")
          } catch {
            /* Storage puede estar bloqueado. */
          }
        }
        throw new Error(
          errorTransferencia.error || "Error procesando transferencia",
        )
      }

      setTransferenciaExitoAbierta(true)

      await cargarDatos()
    } catch (error) {
      console.error("Error procesando transferencia:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrió un error procesando tu transferencia. Intenta nuevamente.",
      })
    }

    setModalAbierto(false)
    setPackSeleccionado(null)
  }

  const TOTAL_CHANCES = sorteo?.total_chances || 9999
  const porcentajeVendido = (chancesVendidas / TOTAL_CHANCES) * 100
  const sorteoCompleto =
    sorteo?.estado === "completo" ||
    sorteo?.estado === "sorteado" ||
    chancesVendidas >= TOTAL_CHANCES

  const PACKS = getPacks()

  const handleCompra = (pack: {
    chances: number
    precio: number
    precioParaguay: number
  }) => {
    if (sorteoCompleto) return
    if (document.body.dataset.sosaPreview === "true") {
      toast({
        title: "Vista previa privada",
        description: "La compra está deshabilitada hasta publicar el sitio.",
      })
      return
    }
    setPackSeleccionado({
      chances: pack.chances,
      precio: pack.precio,
      precioParaguay: pack.precioParaguay,
      sorteoId: sorteo?.id,
    })
    setModalAbierto(true)
  }

  const consultarMisNumeros = async (e: React.FormEvent) => {
    e.preventDefault()
    if (document.body.dataset.sosaPreview === "true") {
      setConsultaError(
        "La consulta se habilita cuando el sitio está publicado.",
      )
      return
    }
    const emailTrimmed = consultaEmail.trim()
    if (!emailTrimmed) return
    setConsultaLoading(true)
    setConsultaResultados(null)
    setConsultaError(null)
    try {
      const response = await fetch(
        `/api/mis-numeros?email=${encodeURIComponent(emailTrimmed)}`,
      )
      const data = await response.json()
      if (!response.ok) {
        setConsultaError(data.error || "Ocurrió un error. Intenta nuevamente.")
        return
      }
      setConsultaResultados(data.participaciones)
    } catch {
      setConsultaError(
        "No se pudo conectar. Revisá tu conexión e intentá de nuevo.",
      )
    } finally {
      setConsultaLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-[#ff0040] border-t-transparent rounded-full animate-spin mx-auto opacity-80"></div>
          <p className="text-gray-500 text-sm tracking-widest uppercase">
            Cargando
          </p>
        </div>
      </div>
    )
  }

  if (!sorteo) {
    return (
      <div className="min-h-screen bg-dark-gradient flex flex-col">
        <Header marca={contenido.marca} />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-700 mx-auto">
              <img
                src="/sosamotos.jpeg"
                alt={contenido.marca}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-display tracking-wider text-white uppercase">
                {contenido.proximamente_titulo}
              </h2>
              <p className="text-gray-500 text-sm">
                {contenido.proximamente_descripcion}
              </p>
            </div>
            <Link
              href={contenido.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block btn-neon px-6 py-3 rounded-lg font-semibold text-sm tracking-wide"
            >
              {contenido.proximamente_boton}
            </Link>
          </div>
        </div>
        <RedesSociales contenido={contenido} />
        <footer className="bg-black border-t border-gray-900 py-6">
          <div className="container mx-auto px-4 text-center text-gray-600 text-xs tracking-wide">
            <p>{contenido.footer_copyright}</p>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Header
        marca={contenido.marca}
      />
      {/* Hero Section */}
      <section className="relative overflow-x-clip min-h-screen">
        {/* Background Effects — muy sutiles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-80 h-80 bg-[#ff0040]/4 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#ff0040]/3 rounded-full blur-3xl"></div>
        </div>

        <div className="relative container mx-auto px-4 py-10 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-20 items-start">
            {/* Carousel a la izquierda */}
            <div
              className={`relative lg:sticky lg:top-24 lg:self-start transition-all duration-700 ${
                animacionVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <div className="relative">
                <IphoneCarousel />

                {/* Floating badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-16 xl:-right-2 z-30">
                  <div className="promo-badge text-white px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-full font-semibold text-[9px] sm:text-xs tracking-normal sm:tracking-widest uppercase flex items-center justify-center gap-1 sm:gap-1.5 shadow-lg whitespace-nowrap">
                    <Trophy className="promo-trophy w-3 h-3 shrink-0" />
                    <span className="relative z-10 uppercase mt-1 lg:mt-0 tracking-widest text-[9px] sm:text-xs font-semibold">
                      {contenido.hero_badge}
                    </span>
                  </div>
                </div>
              </div>

              {/* Título bajo el carousel */}
              {/* <div className="text-center mt-8">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display tracking-widest text-[#ff0040] uppercase">
                  {conPlaceholders(contenido.hero_titulo, {
                    premio: sorteo.titulo_remera || "Remera Exclusiva",
                  })}
                </h2>
              </div> */}

              {/* Progress Bar — mobile only (appears right below the photo) */}
              {sorteo?.estado !== "sorteado" && (
                <div className="lg:hidden mt-4 lg:border border-[#ff0040]/15 lg:bg-gradient-to-b lg:from-[#151517] lg:to-[#0a0a0b] rounded-xl p-5 space-y-5">
                  <ChancesLabel label={contenido.hero_chances_label} />
                  <AnimatedProgress
                    value={porcentajeVendido}
                    logoSrc="/sosamotos.jpeg"
                  />
                  <PorcentajeCompletado
                    value={porcentajeVendido}
                    label={contenido.hero_completado_label}
                  />
                </div>
              )}
            </div>

            {/* Contenido a la derecha */}
            <div
              className={`flex flex-col gap-6 transition-all duration-700 delay-200 ${
                animacionVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              {sorteo?.estado !== "sorteado" && (
                <div className="order-1 flex items-center gap-4 py-1">
                  <span className="flex shrink-0 gap-1.5" aria-hidden="true">
                    <span className="h-7 w-1 -skew-x-[20deg] bg-[#ff0040]" />
                    <span className="h-7 w-1 -skew-x-[20deg] bg-[#ff0040]/60" />
                    <span className="h-7 w-1 -skew-x-[20deg] bg-[#ff0040]/25" />
                  </span>
                  <h1 className="min-w-0 font-display text-[2rem] leading-none tracking-[0.06em] text-zinc-300 sm:text-[2.3rem]">
                    {heroSubtitulo
                      .split(/(n[uú]meros)/gi)
                      .map((parte, index) =>
                        /^n[uú]meros$/i.test(parte) ? (
                          <span
                            key={index}
                            className="text-white underline decoration-[#ff0040] decoration-[3px] underline-offset-[6px]"
                          >
                            {parte}
                          </span>
                        ) : (
                          parte
                        ),
                      )}
                  </h1>
                </div>
              )}

              {/* Progress Bar / Evento finalizado — desktop only (mobile version is in left column) */}
              {sorteo?.estado === "sorteado" ? (
                <div className="order-3 lg:order-2 bg-[#111] border border-gray-800 rounded-xl p-6 text-center">
                  <p className="text-lg font-semibold text-gray-300">
                    Evento finalizado
                  </p>
                </div>
              ) : (
                <div className="hidden lg:block order-3 lg:order-2 space-y-5 border border-[#ff0040]/15 bg-gradient-to-b from-[#151517] to-[#0a0a0b] rounded-xl p-5 sm:p-6">
                  <ChancesLabel label={contenido.hero_chances_label} />
                  <AnimatedProgress
                    value={porcentajeVendido}
                    logoSrc="/sosamotos.jpeg"
                  />
                  <PorcentajeCompletado
                    value={porcentajeVendido}
                    label={contenido.hero_completado_label}
                  />
                </div>
              )}

              {/* Estados: completo / sorteado / cerrado */}
              {sorteoCompleto && (
                <div className="order-4 lg:order-3 space-y-4">
                  {sorteo?.estado === "completo" && (
                    <div className="bg-yellow-950/30 border border-yellow-800/40 text-yellow-300 px-5 py-4 rounded-xl">
                      <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {contenido.hero_completo_titulo}
                      </h3>
                      <p className="text-sm text-yellow-300/70">
                        {contenido.hero_completo_descripcion}
                      </p>
                      {sorteo.fecha_sorteo_realizado && (
                        <p className="text-xs opacity-60 mt-1">
                          Prendas completadas el{" "}
                          {new Date(
                            sorteo.fecha_sorteo_realizado,
                          ).toLocaleDateString("es-AR")}
                        </p>
                      )}
                    </div>
                  )}

                  {sorteo?.estado === "sorteado" && (
                    <div className="bg-green-950/30 border border-green-800/40 text-green-300 px-5 py-4 rounded-xl">
                      <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        {contenido.hero_sorteado_titulo}
                      </h3>
                      {sorteo.numero_ganador && (
                        <div className="space-y-1.5">
                          {sorteo.ganador_nombre && (
                            <p className="text-sm text-white">
                              Ganador:{" "}
                              <span className="font-semibold text-green-400">
                                {sorteo.ganador_nombre}
                              </span>
                            </p>
                          )}
                          <p className="text-sm text-white">
                            Número Ganador:{" "}
                            <span className="font-mono font-bold text-green-400 text-lg">
                              {sorteo.numero_ganador}
                            </span>
                          </p>
                          <p className="text-xs text-green-300/60">
                            Según la Loteria de Medellín, Colombia{" "}
                            {sorteo.updated_at &&
                              new Date(sorteo.updated_at).toLocaleDateString(
                                "es-AR",
                              )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {(sorteo?.estado === "cerrado" ||
                    (sorteo?.estado &&
                      !sorteo.estado.match(/completo|sorteado/))) && (
                    <div className="bg-[#ff0040]/10 border border-[#ff0040]/20 text-white px-5 py-4 rounded-xl">
                      <h3 className="text-base font-semibold mb-1">
                        {contenido.hero_cerrado_titulo}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {contenido.hero_cerrado_descripcion}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Participación gratuita: en lugar de los packs del sitio principal */}
              {!sorteoCompleto && (
                <div className="order-2 lg:order-4 space-y-4">
                  <p className="pb-1 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Participá gratis desde Argentina o Paraguay
                  </p>
                  <FormularioGratis />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>


      {/* Sección Consultá tus números */}
      <section
        id="tus-numeros"
        className="py-10 border-t border-gray-900 scroll-mt-16"
      >
        <div className="container mx-auto px-4 max-w-xl">
          <div className="consulta-card p-7 sm:p-9 mb-5">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-widest text-[#ff0040] mb-4">
                {contenido.consulta_kicker}
              </p>
              <h2 className="text-4xl lg:text-5xl font-display tracking-wider text-white uppercase mb-4">
                {contenido.consulta_titulo}
              </h2>
              <p className="text-gray-400 text-base leading-relaxed">
                {contenido.consulta_descripcion}
              </p>
            </div>

            <form
              onSubmit={consultarMisNumeros}
              className="flex flex-col gap-4"
            >
              <input
                type="email"
                value={consultaEmail}
                onChange={(e) => setConsultaEmail(e.target.value)}
                placeholder={contenido.consulta_placeholder}
                disabled={consultaLoading}
                className="input-neon w-full text-white placeholder:text-gray-500 rounded-xl px-5 py-4 text-base focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={consultaLoading || !consultaEmail.trim()}
                className="btn-consultar w-full py-4 rounded-xl text-base font-bold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                {consultaLoading ? "Buscando..." : contenido.consulta_boton}
              </button>
            </form>
          </div>

          {/* Tarjeta de contacto por WhatsApp */}
          <div className="consulta-card p-7 sm:p-9 mb-6">
            <p className="text-center text-gray-300 text-lg font-medium mb-5">
              ¿Tenés consultas sobre la promoción?
            </p>
            <Link
              href={contenido.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp flex items-center justify-center gap-3 w-full py-4 rounded-xl text-base font-bold tracking-wide"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
              </svg>
              Contactar por WhatsApp
            </Link>
          </div>

          {consultaError && (
            <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-4 text-center text-red-400 text-sm mb-4">
              {consultaError}
            </div>
          )}

          {consultaResultados !== null && consultaResultados.length === 0 && (
            <div className="bg-[#111] border border-gray-800 rounded-xl p-6 text-center">
              <p className="text-gray-500 text-sm">
                {contenido.consulta_vacio}
              </p>
              <p className="text-gray-600 text-xs mt-2">
                {contenido.consulta_vacio_nota}
              </p>
            </div>
          )}

          {consultaResultados !== null && consultaResultados.length > 0 && (
            <div className="space-y-4">
              {consultaResultados.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#111] border border-gray-800 rounded-xl p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <p className="text-white font-semibold">{p.nombre}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {p.sorteo_nombre}
                      </p>
                    </div>
                    <span className="text-xs text-gray-600">
                      {new Date(p.created_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">
                    Tus {p.cantidad_chances} números asignados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[...p.numeros_asignados]
                      .sort((a, b) => a - b)
                      .map((numero) => (
                        <span
                          key={numero}
                          className="bg-[#ff0040]/10 text-[#ff0040] font-mono font-semibold px-3 py-1 rounded text-sm border border-[#ff0040]/15"
                        >
                          {numero}
                        </span>
                      ))}
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    {/* El contenido digital ya no se entrega con la compra.
                    <a
                      href={`/api/descargar/${p.id}`}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-[#ff0040] to-[#cc0033] hover:opacity-90 text-white font-bold text-sm py-2.5 px-5 rounded-lg transition-opacity"
                    >
                      📥 Descargar contenido
                    </a> */}
                    <button
                      type="button"
                      onClick={() =>
                        generarComprobante(
                          {
                            nombre: p.nombre,
                            cantidad_chances: p.cantidad_chances,
                            numeros_asignados: p.numeros_asignados,
                            created_at: p.created_at,
                          },
                          p.sorteo_nombre,
                          () =>
                            toast({
                              title: "Comprobante generado",
                              description:
                                "El comprobante se descargó exitosamente",
                            }),
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#222] text-white font-bold text-sm py-2.5 px-5 rounded-lg border border-[#ff0040]/40 transition-colors"
                    >
                      🧾 Descargar comprobante
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Ganadores Express */}
      {sorteo && (
        <GanadoresExpress sorteoId={sorteo.id} contenido={contenido} />
      )}

      {/* Ganadores Pasados */}
      <GanadoresPasados contenido={contenido} />

      {/* Links de interés / Redes sociales */}
      <RedesSociales contenido={contenido} />

      {/* Sección FAQ */}
      <section className="py-10 border-t border-gray-900">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <h2 className="text-4xl lg:text-5xl font-display tracking-wider text-white mb-10">
            {contenido.faq_titulo}
          </h2>

          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">
                {contenido.faq_pregunta_fecha}
              </p>
              <div className="border-l-2 border-r-2 border-[#ff0040]/40 px-4">
                <span className="text-white text-lg font-medium">
                  {sorteo?.fecha_sorteo
                    ? new Date(
                        sorteo.fecha_sorteo + "T12:00:00",
                      ).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Próximamente"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">
                {contenido.faq_pregunta_ganador}
              </p>
              <Link
                href={contenido.faq_link_quiniela}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="border-l-2 border-r-2 border-[#ff0040]/40 px-4 hover:border-[#ff0040] transition-colors duration-200">
                  <span className="text-[#ff0040] text-base font-medium">
                    {contenido.faq_respuesta_ganador}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-900 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-base font-semibold text-white tracking-wide">
              {contenido.marca}
            </span>
            <div className="flex space-x-6">
              <Link
                href={contenido.whatsapp_url}
                className="text-gray-600 hover:text-gray-300 transition-colors text-sm"
              >
                Contacto
              </Link>
              <Link
                href="/terminos"
                className="text-gray-600 hover:text-gray-300 transition-colors text-sm"
              >
                Términos
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-900 mt-6 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-gray-700 text-xs">
              {contenido.footer_copyright}
            </p>
            <Link
              href="https://www.deweertstudio.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-500 transition-colors text-xs"
            >
              Desarrollado por De Weert Studio
            </Link>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  )
}
