"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Type,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import {
  obtenerContenido,
  actualizarContenido,
  CONTENIDO_DEFAULTS,
  TIPOS_RED,
  type ContenidoSitio,
  type ClaveTextoContenido,
  type RedSocial,
  type TipoRed,
  type SeccionTerminos,
} from "@/lib/contenido"
import { useToast } from "@/hooks/use-toast"

interface Campo {
  key: ClaveTextoContenido
  label: string
  multiline?: boolean
  ayuda?: string
}

interface Seccion {
  titulo: string
  descripcion?: string
  campos: Campo[]
  // Si es true, muestra además el editor de links de redes sociales
  editorRedes?: boolean
}

const SECCIONES: Seccion[] = [
  {
    titulo: "General",
    campos: [
      { key: "marca", label: "Nombre de la marca (header y footer)" },
      {
        key: "whatsapp_url",
        label: "Link de WhatsApp / contacto",
        ayuda:
          "Se usa en el footer, el botón de consultas y la pantalla sin sorteo activo",
      },
    ],
  },
  {
    titulo: "Portada (Hero)",
    campos: [
      { key: "hero_badge", label: "Etiqueta flotante sobre las fotos" },
      {
        key: "hero_titulo",
        label: "Título principal",
        ayuda:
          "Usá {premio} donde quieras que aparezca el nombre del premio del sorteo",
      },
      { key: "hero_subtitulo", label: "Subtítulo" },
      { key: "hero_chances_label", label: "Etiqueta de la barra de progreso" },
      { key: "hero_completado_label", label: "Texto junto al porcentaje" },
      { key: "hero_completo_titulo", label: "Título cuando se vendió todo" },
      {
        key: "hero_completo_descripcion",
        label: "Descripción cuando se vendió todo",
        multiline: true,
      },
      {
        key: "hero_sorteado_titulo",
        label: "Título de resultados (sorteo realizado)",
      },
      {
        key: "hero_cerrado_titulo",
        label: "Título cuando el sorteo se cierra manualmente",
      },
      {
        key: "hero_cerrado_descripcion",
        label: "Descripción cuando el sorteo se cierra manualmente",
      },
    ],
  },
  {
    titulo: "Packs de chances",
    campos: [
      { key: "packs_popular_label", label: "Etiqueta del pack destacado" },
      { key: "packs_comprar_boton", label: "Texto del botón de compra" },
      { key: "packs_nota", label: "Nota debajo de los packs" },
    ],
  },
  {
    titulo: "Ranking",
    descripcion: "Estos textos se usan en /ranking y en el ranking de la portada. Los premios se editan en la pestaña Ranking.",
    campos: [
      { key: "rankingKicker", label: "Etiqueta del ranking" },
      { key: "rankingTitulo", label: "Título del ranking" },
      { key: "rankingResultadoFinal", label: "Etiqueta del resultado final" },
      { key: "rankingLugarLibre", label: "Puesto libre durante el sorteo" },
      { key: "rankingSinParticipante", label: "Puesto sin participante al finalizar" },
      { key: "rankingChances", label: "Etiqueta junto a la cantidad de chances" },
      { key: "rankingSumarChancesPodio", label: "Invitación en los puestos libres" },
      { key: "rankingPremiosIntro", label: "Aviso de premios: primera parte" },
      { key: "rankingPremiosActivo", label: "Aviso de premios: cierre durante el sorteo" },
      { key: "rankingPremiosFinal", label: "Aviso de premios: cierre al finalizar" },
      { key: "rankingTablaTitulo", label: "Título de la lista de participantes" },
      { key: "rankingTopActivo", label: "Etiqueta de la lista durante el sorteo", ayuda: "Usá {cantidad} para mostrar la cantidad de participantes del ranking." },
      { key: "rankingTopFinal", label: "Etiqueta de la lista al finalizar" },
      { key: "rankingCtaTitulo", label: "Título junto al botón" },
      { key: "rankingCtaBoton", label: "Botón de la página de ranking" },
      { key: "rankingVerCompleto", label: "Botón del ranking en la portada" },
      { key: "rankingCargando", label: "Mensaje de carga" },
      { key: "rankingError", label: "Mensaje de error", multiline: true },
      { key: "rankingVacio", label: "Mensaje sin compras confirmadas", multiline: true },
      { key: "rankingPodioEtiqueta", label: "Descripción del podio para lectores de pantalla" },
      { key: "rankingActualizacionEtiqueta", label: "Aviso de actualización para lectores de pantalla", ayuda: "Usá {tiempo} para mostrar el tiempo restante." },
      { key: "rankingReintentoEtiqueta", label: "Aviso de reintento para lectores de pantalla", ayuda: "Usá {tiempo} para mostrar el tiempo restante." },
    ],
  },
  {
    titulo: "Sección Premios",
    campos: [
      { key: "premios_kicker", label: "Texto chico arriba del título" },
      { key: "premios_titulo", label: "Título de la sección" },
      { key: "premios_primer_label", label: "Etiqueta del primer premio" },
      { key: "premios_sec_label", label: "Etiqueta de premios secundarios" },
      {
        key: "premios_sec_descripcion",
        label: "Descripción de premios secundarios",
        ayuda: "Usá {monto} donde quieras que aparezca el monto del premio",
      },
    ],
  },
  {
    titulo: "Preguntas frecuentes",
    campos: [
      { key: "faq_titulo", label: "Título de la sección" },
      { key: "faq_pregunta_fecha", label: "Pregunta sobre la fecha" },
      { key: "faq_pregunta_ganador", label: "Pregunta sobre el ganador" },
      { key: "faq_respuesta_ganador", label: "Respuesta sobre el ganador" },
      { key: "faq_link_quiniela", label: "Link de la quiniela" },
    ],
  },
  {
    titulo: "Consulta de números",
    campos: [
      { key: "consulta_kicker", label: "Texto chico arriba del título" },
      { key: "consulta_titulo", label: "Título de la sección" },
      { key: "consulta_descripcion", label: "Descripción", multiline: true },
      { key: "consulta_placeholder", label: "Placeholder del campo de email" },
      { key: "consulta_boton", label: "Texto del botón" },
      { key: "consulta_vacio", label: "Mensaje cuando no hay resultados" },
      { key: "consulta_vacio_nota", label: "Nota cuando no hay resultados" },
    ],
  },
  {
    titulo: "Ganadores Express",
    campos: [
      { key: "express_kicker", label: "Texto chico arriba del título" },
      { key: "express_titulo", label: "Título de la sección" },
    ],
  },
  {
    titulo: "Ganadores Anteriores",
    campos: [
      { key: "pasados_cta_texto", label: "Texto del bloque de contacto" },
      { key: "pasados_cta_boton", label: "Botón del bloque de contacto" },
      { key: "pasados_kicker", label: "Texto chico arriba del título" },
      { key: "pasados_titulo", label: "Título de la sección" },
      { key: "pasados_descripcion", label: "Descripción de la sección" },
    ],
  },
  {
    titulo: "Links de interés / Redes sociales",
    descripcion:
      "Sección con botones a redes sociales, canal de WhatsApp, Telegram, etc. Si no hay links cargados, la sección no se muestra.",
    editorRedes: true,
    campos: [
      { key: "redes_kicker", label: "Texto chico arriba del título" },
      { key: "redes_titulo", label: "Título de la sección" },
      { key: "redes_descripcion", label: "Descripción", multiline: true },
    ],
  },
  {
    titulo: "Pantalla sin sorteo activo",
    descripcion: "Se muestra cuando no hay ningún sorteo en curso.",
    campos: [
      { key: "proximamente_titulo", label: "Título" },
      {
        key: "proximamente_descripcion",
        label: "Descripción",
        multiline: true,
      },
      { key: "proximamente_boton", label: "Texto del botón" },
    ],
  },
  {
    titulo: "Footer",
    campos: [{ key: "footer_copyright", label: "Texto de copyright" }],
  },
]

export function ContenidoManager() {
  const [contenido, setContenido] = useState<ContenidoSitio | null>(null)
  const [guardando, setGuardando] = useState(false)
  // Confirmación cuando un guardado eliminaría puntos de términos.
  const [confirmarReduccion, setConfirmarReduccion] = useState(false)
  // Snapshot del contenido tal como está en la base, para calcular qué cambió.
  const baselineRef = useRef<ContenidoSitio | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    obtenerContenido().then((c) => {
      setContenido(c)
      baselineRef.current = c
    })
  }, [])

  const setCampo = (key: ClaveTextoContenido, valor: string) => {
    setContenido((prev) => (prev ? { ...prev, [key]: valor } : prev))
  }

  const setRedes = (redes: RedSocial[]) => {
    setContenido((prev) => (prev ? { ...prev, redes } : prev))
  }

  const agregarRed = () => {
    if (!contenido) return
    setRedes([
      ...contenido.redes,
      { tipo: "instagram", etiqueta: "Instagram", url: "" },
    ])
  }

  const eliminarRed = (index: number) => {
    if (!contenido) return
    setRedes(contenido.redes.filter((_, i) => i !== index))
  }

  const setRed = (index: number, cambios: Partial<RedSocial>) => {
    if (!contenido) return
    setRedes(
      contenido.redes.map((red, i) => {
        if (i !== index) return red
        const actualizada = { ...red, ...cambios }
        // Al cambiar el tipo, actualizar la etiqueta si todavía es la genérica
        if (cambios.tipo) {
          const etiquetasGenericas = TIPOS_RED.map((t) => t.etiqueta)
          if (!red.etiqueta || etiquetasGenericas.includes(red.etiqueta)) {
            actualizada.etiqueta =
              TIPOS_RED.find((t) => t.valor === cambios.tipo)?.etiqueta ??
              red.etiqueta
          }
        }
        return actualizada
      }),
    )
  }

  const setTerminos = (terminos: SeccionTerminos[]) => {
    setContenido((prev) => (prev ? { ...prev, terminos } : prev))
  }

  const agregarTermino = () => {
    if (!contenido) return
    setTerminos([...contenido.terminos, { titulo: "", contenido: "" }])
  }

  const eliminarTermino = (index: number) => {
    if (!contenido) return
    setTerminos(contenido.terminos.filter((_, i) => i !== index))
  }

  const setTermino = (index: number, cambios: Partial<SeccionTerminos>) => {
    if (!contenido) return
    setTerminos(
      contenido.terminos.map((seccion, i) =>
        i === index ? { ...seccion, ...cambios } : seccion,
      ),
    )
  }

  const moverTermino = (index: number, direccion: -1 | 1) => {
    if (!contenido) return
    const destino = index + direccion
    if (destino < 0 || destino >= contenido.terminos.length) return
    const nuevas = [...contenido.terminos]
    ;[nuevas[index], nuevas[destino]] = [nuevas[destino], nuevas[index]]
    setTerminos(nuevas)
  }

  // Calcula solo las claves que cambiaron respecto de la base cargada.
  const calcularCambios = (): Partial<ContenidoSitio> => {
    if (!contenido) return {}
    const base = baselineRef.current
    if (!base) return { ...contenido }
    const cambios: Partial<ContenidoSitio> = {}
    for (const key of Object.keys(contenido) as (keyof ContenidoSitio)[]) {
      if (JSON.stringify(contenido[key]) !== JSON.stringify(base[key])) {
        cambios[key] = contenido[key] as any
      }
    }
    return cambios
  }

  // Escribe los cambios en la base (solo lo que cambió).
  const persistir = async () => {
    if (!contenido) return
    const cambios = calcularCambios()
    if (Object.keys(cambios).length === 0) {
      toast({
        title: "No hay cambios para guardar",
        description: "El contenido ya está igual que en la base.",
      })
      return
    }
    setGuardando(true)
    const ok = await actualizarContenido(cambios)
    setGuardando(false)
    if (ok) {
      baselineRef.current = contenido
      toast({
        title: "Contenido guardado",
        description: "Los textos de la página pública fueron actualizados.",
      })
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios",
      })
    }
  }

  const guardar = async () => {
    if (!contenido) return
    const base = baselineRef.current
    // Guarda: si el guardado eliminaría puntos de términos, pedir confirmación.
    if (base && contenido.terminos.length < base.terminos.length) {
      setConfirmarReduccion(true)
      return
    }
    await persistir()
  }

  const restaurar = () => {
    setContenido(CONTENIDO_DEFAULTS)
    toast({
      title: "Textos originales restaurados",
      description: "Recordá guardar para aplicar los cambios.",
    })
  }

  if (!contenido) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          Cargando contenido...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5 text-gray-700" />
            Contenido de la página
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Editá los textos de la página pública. Los cambios se aplican al
            guardar. Si dejás un campo vacío, se muestra vacío (usá "Restaurar
            textos originales" para volver a los valores iniciales).
          </p>
        </CardHeader>
      </Card>

      {SECCIONES.map((seccion) => (
        <Card key={seccion.titulo}>
          <CardHeader>
            <CardTitle className="text-base">{seccion.titulo}</CardTitle>
            {seccion.descripcion && (
              <p className="text-sm text-muted-foreground">
                {seccion.descripcion}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {seccion.titulo === "Ranking" && (
              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="ranking-visible">Mostrar ranking público</Label>
                  <Switch id="ranking-visible" checked={contenido.rankingVisible} onCheckedChange={(valor) => setContenido({ ...contenido, rankingVisible: valor })} />
                </div>
                <p className="text-sm text-muted-foreground">Se muestran hasta 20 participantes. Los premios corresponden a los tres primeros puestos.</p>
              </div>
            )}
            {seccion.campos.map((campo) => (
              <div key={campo.key} className="space-y-1.5">
                <Label htmlFor={campo.key}>{campo.label}</Label>
                {campo.multiline ? (
                  <Textarea
                    id={campo.key}
                    value={contenido[campo.key]}
                    onChange={(e) => setCampo(campo.key, e.target.value)}
                    placeholder={CONTENIDO_DEFAULTS[campo.key]}
                    rows={2}
                  />
                ) : (
                  <Input
                    id={campo.key}
                    value={contenido[campo.key]}
                    onChange={(e) => setCampo(campo.key, e.target.value)}
                    placeholder={CONTENIDO_DEFAULTS[campo.key]}
                  />
                )}
                {campo.ayuda && (
                  <p className="text-xs text-muted-foreground">{campo.ayuda}</p>
                )}
              </div>
            ))}

            {seccion.editorRedes && (
              <div className="space-y-3 pt-2">
                <Label>Links</Label>
                {contenido.redes.length === 0 && (
                  <p className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    Sin links cargados. La sección no se muestra en la página
                    pública.
                  </p>
                )}
                {contenido.redes.map((red, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3"
                  >
                    <Select
                      value={red.tipo}
                      onValueChange={(valor) =>
                        setRed(index, { tipo: valor as TipoRed })
                      }
                    >
                      <SelectTrigger className="sm:w-[180px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_RED.map((tipo) => (
                          <SelectItem key={tipo.valor} value={tipo.valor}>
                            {tipo.etiqueta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={red.etiqueta}
                      onChange={(e) =>
                        setRed(index, { etiqueta: e.target.value })
                      }
                      placeholder="Texto del botón"
                      className="sm:w-[200px] bg-white"
                    />
                    <Input
                      value={red.url}
                      onChange={(e) => setRed(index, { url: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 bg-white"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminarRed(index)}
                      className="text-gray-400 hover:text-red-600 flex-shrink-0"
                      title="Eliminar link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={agregarRed}>
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Editor de Términos y Condiciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Términos y Condiciones</CardTitle>
          <p className="text-sm text-muted-foreground">
            Editá el contenido de la página de términos. Cada punto tiene un
            título y un texto. Podés agregar, quitar y reordenar los puntos.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="terminos_titulo">Título de la página</Label>
            <Input
              id="terminos_titulo"
              value={contenido.terminos_titulo}
              onChange={(e) => setCampo("terminos_titulo", e.target.value)}
              placeholder={CONTENIDO_DEFAULTS.terminos_titulo}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label>Puntos</Label>
            {contenido.terminos.length === 0 && (
              <p className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg p-3">
                Sin puntos cargados. La página de términos se muestra vacía.
              </p>
            )}
            {contenido.terminos.map((seccion, index) => (
              <div
                key={index}
                className="space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={seccion.titulo}
                    onChange={(e) =>
                      setTermino(index, { titulo: e.target.value })
                    }
                    placeholder="Título del punto"
                    className="flex-1 bg-white font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moverTermino(index, -1)}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                    title="Subir"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moverTermino(index, 1)}
                    disabled={index === contenido.terminos.length - 1}
                    className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                    title="Bajar"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-600 flex-shrink-0"
                        title="Eliminar punto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Trash2 className="w-5 h-5 text-red-600" />
                          ¿Eliminar este punto?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {seccion.titulo
                            ? `Se quitará el punto "${seccion.titulo}".`
                            : "Se quitará este punto de los términos."}{" "}
                          El cambio se aplica cuando guardás.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => eliminarTermino(index)}
                        >
                          Sí, eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <Textarea
                  value={seccion.contenido}
                  onChange={(e) =>
                    setTermino(index, { contenido: e.target.value })
                  }
                  placeholder="Texto del punto"
                  rows={3}
                  className="bg-white"
                />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={agregarTermino}>
              <Plus className="w-4 h-4 mr-1" />
              Agregar punto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Barra de acciones fija al pie */}
      <div className="sticky bottom-4 z-10">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex items-center justify-between gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              {/* <Button variant="outline" disabled={guardando} size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar textos originales
              </Button> */}
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-gray-700" />
                  ¿Restaurar textos originales?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Se reemplazarán todos los textos actuales por los valores
                  originales. Los cambios recién se aplican cuando guardás, así
                  que podés revisarlos antes. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={restaurar}>
                  Sí, restaurar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            onClick={guardar}
            disabled={guardando}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Save className="w-4 h-4 mr-2" />
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>

      {/* Confirmación cuando el guardado eliminaría puntos de términos */}
      <AlertDialog
        open={confirmarReduccion}
        onOpenChange={setConfirmarReduccion}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              {contenido.terminos.length === 0
                ? "¿Guardar sin ningún punto de términos?"
                : "¿Guardar con menos puntos de términos?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {baselineRef.current
                ? `Vas a pasar de ${baselineRef.current.terminos.length} a ${contenido.terminos.length} puntos en los Términos y Condiciones. Los puntos quitados se perderán de la página pública.`
                : "Se van a quitar puntos de los Términos y Condiciones."}{" "}
              Esta acción sobrescribe el contenido publicado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarReduccion(false)
                void persistir()
              }}
            >
              Sí, guardar igual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
