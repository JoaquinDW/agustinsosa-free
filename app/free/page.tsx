"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clover, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { normalizarTelefono } from "@/lib/whatsapp/normalizar"
import {
  obtenerContenido,
  CONTENIDO_DEFAULTS,
  type ContenidoSitio,
} from "@/lib/contenido"

/* ------------------------------------------------------------------ */
/*  Definición de la encuesta (réplica del Google Form)                 */
/* ------------------------------------------------------------------ */

type Pregunta =
  | {
      id: string
      label: string
      tipo: "radio"
      opciones: string[]
      permiteOtro?: boolean
    }
  | { id: string; label: string; tipo: "text" | "textarea" }

const PREGUNTAS: Pregunta[] = [
  {
    id: "como_te_enteraste",
    label: "¿Cómo te enteraste de SOSA MOTOS?",
    tipo: "radio",
    opciones: [
      "Instagram",
      "Facebook",
      "WhatsApp",
      "Local comercial",
      "Recomendación",
    ],
    permiteOtro: true,
  },
  {
    id: "tiempo_cliente",
    label: "¿Cuánto tiempo llevás siendo cliente o seguidor de SOSA MOTOS?",
    tipo: "radio",
    opciones: ["1 a 3 meses", "3 a 6 meses", "1 año", "Más de 1 año", "Nunca fui cliente"],
  },
  {
    id: "frecuencia_promos",
    label: "¿Con qué frecuencia participás en promociones comerciales?",
    tipo: "radio",
    opciones: ["Frecuentemente", "A veces", "Rara vez", "Nunca"],
  },
  {
    id: "participo_antes",
    label: "¿Participaste alguna vez en una promoción comercial de SOSA MOTOS?",
    tipo: "radio",
    opciones: ["Sí", "No"],
  },
  {
    id: "ultimo_visto",
    label: "¿Qué fue lo último que viste o escuchaste sobre las promociones de SOSA MOTOS?",
    tipo: "text",
  },
  {
    id: "conoce_ganadores",
    label: "¿Conocés a algún ganador de promociones anteriores de SOSA MOTOS?",
    tipo: "radio",
    opciones: ["Sí", "No"],
  },
  {
    id: "por_que_participa",
    label: "¿Por qué te interesa participar en esta promoción?",
    tipo: "text",
  },
  {
    id: "interes_productos_digitales",
    label: "¿Te parecen interesantes los productos digitales promocionales de SOSA MOTOS?",
    tipo: "radio",
    opciones: ["Sí", "No", "No los conozco"],
  },
  {
    id: "premios_preferidos",
    label: "¿Qué premios son de tu preferencia?",
    tipo: "radio",
    opciones: [
      "Bicicletas",
      "iPhones",
      "Monopatines",
      "Motos",
      "Autos",
      "Accesorios",
    ],
    permiteOtro: true,
  },
  {
    id: "menor_mayor_valor",
    label: "¿Preferís más premios de menor valor o menos premios de mayor valor?",
    tipo: "radio",
    opciones: [
      "Más premios de menor valor",
      "Menos premios, pero de mayor valor",
      "Me da igual",
    ],
  },
  {
    id: "premios_futuros",
    label: "¿Qué premios te gustaría ver en futuras promociones?",
    tipo: "text",
  },
  {
    id: "opinion_web",
    label: "¿Qué te pareció el funcionamiento de la página web?",
    tipo: "radio",
    opciones: ["Rápida", "Normal", "Lenta"],
  },
  {
    id: "opinion_sosa",
    label: "¿Cuál es tu opinión sobre SOSA MOTOS?",
    tipo: "text",
  },
  {
    id: "probabilidad_recomendar",
    label: "¿Qué tan probable es que recomiendes SOSA MOTOS a amigos o familiares?",
    tipo: "radio",
    opciones: ["Muy probable", "Medianamente probable", "Poco probable"],
  },
  {
    id: "que_mejorarias",
    label: "¿Qué mejorarías de SOSA MOTOS?",
    tipo: "text",
  },
  {
    id: "comentarios",
    label: "Comentarios",
    tipo: "textarea",
  },
]

export default function FreePage() {
  const [contenido, setContenido] = useState<ContenidoSitio>(CONTENIDO_DEFAULTS)

  // Datos de contacto
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [direccion, setDireccion] = useState("")
  const [email, setEmail] = useState("")

  // Respuestas de la encuesta
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [otros, setOtros] = useState<Record<string, string>>({})
  const [aceptaBases, setAceptaBases] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numeroAsignado, setNumeroAsignado] = useState<number | null>(null)

  useEffect(() => {
    obtenerContenido().then(setContenido)
  }, [])

  const setRespuesta = (id: string, value: string) =>
    setRespuestas((prev) => ({ ...prev, [id]: value }))

  const camposContactoOk =
    nombre.trim() && telefono.trim() && direccion.trim() && email.trim()

  const encuestaOk = PREGUNTAS.every((p) => {
    const val = respuestas[p.id]?.trim()
    if (!val) return false
    if (p.tipo === "radio" && val === "Otro") {
      return Boolean(otros[p.id]?.trim())
    }
    return true
  })

  const formularioValido = Boolean(camposContactoOk && encuestaOk && aceptaBases)

  const handleSubmit = async () => {
    if (document.body.dataset.sosaPreview === "true") {
      setError("La participación se habilita cuando el sitio está publicado.")
      return
    }
    if (!formularioValido || isLoading) return
    if (!normalizarTelefono(telefono)) {
      setError("Ingresá un número de teléfono válido. Si es de Paraguay, incluí +595.")
      return
    }
    setIsLoading(true)
    setError(null)

    // Resolver "Otro" en cada respuesta
    const encuesta: Record<string, string> = {}
    for (const p of PREGUNTAS) {
      const val = respuestas[p.id]
      encuesta[p.id] =
        p.tipo === "radio" && val === "Otro" ? otros[p.id]?.trim() || "Otro" : val
    }

    try {
      const res = await fetch("/api/participacion-gratuita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          encuesta,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "No se pudo registrar tu participación.")
        return
      }

      setNumeroAsignado(data.numeroAsignado)
    } catch (err) {
      console.error(err)
      setError("Ocurrió un error de conexión. Intentá nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  /* ----------------------------- Pantalla de éxito ----------------------------- */
  if (numeroAsignado !== null) {
    return (
      <div className="min-h-screen bg-dark-gradient">
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto bg-card-dark backdrop-blur-sm rounded-2xl p-8 neon-border text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">
              ¡Participación confirmada!
            </h1>
            <p className="text-gray-400 mb-6">
              Tu número quedó registrado y entra al sorteo en igualdad de
              condiciones. Te enviamos un email con la confirmación.
            </p>
            <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">
              Tu número
            </p>
            <div className="text-5xl font-extrabold neon-text font-mono mb-8">
              {numeroAsignado}
            </div>
            <Link href="/">
              <Button className="btn-neon px-8 py-3">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  /* ----------------------------- Formulario ----------------------------- */
  return (
    <div className="min-h-screen bg-dark-gradient">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-xl font-bold neon-text">{contenido.marca}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Encabezado legal */}
          <div className="bg-card-dark backdrop-blur-sm rounded-2xl p-8 neon-border mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clover className="w-7 h-7 text-green-400" />
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
                Participación gratuita
              </h1>
              <Clover className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-gray-400 leading-relaxed mb-3">
              Completá y participá gratuitamente en la promoción vigente de SOSA
              MOTOS. La participación es sin obligación de compra y en igualdad de
              condiciones. La compra de productos o servicios no aumenta tus
              posibilidades de ganar.
            </p>
            <p className="text-gray-300 font-semibold leading-relaxed">
              Promoción sujeta a{" "}
              <Link href="/terminos" className="neon-text underline">
                Bases y Condiciones
              </Link>
              . Participan únicamente mayores de 18 años. No se venden números,
              rifas, bonos, apuestas ni participaciones.
            </p>
          </div>

          {/* Formulario */}
          <div className="bg-card-dark backdrop-blur-sm rounded-2xl p-6 md:p-8 neon-border space-y-6">
            {/* Datos de contacto */}
            <div className="space-y-4">
              <Field label="Nombre" required>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  disabled={isLoading}
                />
              </Field>
              <Field label="Número de teléfono" required>
                <Input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Tu teléfono"
                  disabled={isLoading}
                />
              </Field>
              <Field label="Dirección" required>
                <Input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Tu dirección"
                  disabled={isLoading}
                />
              </Field>
              <Field label="Correo electrónico" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  disabled={isLoading}
                />
              </Field>
            </div>

            <div className="border-t border-gray-800" />

            {/* Encuesta */}
            <div className="space-y-6">
              {PREGUNTAS.map((p) => (
                <Field key={p.id} label={p.label} required>
                  {p.tipo === "radio" ? (
                    <div className="space-y-2">
                      {[...p.opciones, ...(p.permiteOtro ? ["Otro"] : [])].map(
                        (opcion) => (
                          <label
                            key={opcion}
                            className="flex items-center gap-3 cursor-pointer text-gray-300"
                          >
                            <input
                              type="radio"
                              name={p.id}
                              value={opcion}
                              checked={respuestas[p.id] === opcion}
                              onChange={() => setRespuesta(p.id, opcion)}
                              disabled={isLoading}
                              className="accent-[#ff0040] w-4 h-4"
                            />
                            <span>{opcion}</span>
                          </label>
                        )
                      )}
                      {p.permiteOtro && respuestas[p.id] === "Otro" && (
                        <Input
                          value={otros[p.id] || ""}
                          onChange={(e) =>
                            setOtros((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          placeholder="Especificá..."
                          disabled={isLoading}
                          className="mt-2"
                        />
                      )}
                    </div>
                  ) : p.tipo === "textarea" ? (
                    <Textarea
                      value={respuestas[p.id] || ""}
                      onChange={(e) => setRespuesta(p.id, e.target.value)}
                      placeholder="Tu respuesta"
                      disabled={isLoading}
                    />
                  ) : (
                    <Input
                      value={respuestas[p.id] || ""}
                      onChange={(e) => setRespuesta(p.id, e.target.value)}
                      placeholder="Tu respuesta"
                      disabled={isLoading}
                    />
                  )}
                </Field>
              ))}
            </div>

            <div className="border-t border-gray-800" />

            {/* Confirmación de edad / bases */}
            <label className="flex items-start gap-3 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={aceptaBases}
                onChange={(e) => setAceptaBases(e.target.checked)}
                disabled={isLoading}
                className="accent-[#ff0040] w-4 h-4 mt-1"
              />
              <span>
                Soy mayor de 18 años y acepto las{" "}
                <Link href="/terminos" className="neon-text underline">
                  Bases y Condiciones
                </Link>
                .
              </span>
            </label>

            {error && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!formularioValido || isLoading}
              className="btn-neon w-full py-6 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Participar gratis"
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helper de campo con label                                           */
/* ------------------------------------------------------------------ */
function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-gray-200">
        {label} {required && <span className="text-[#ff0040]">*</span>}
      </Label>
      {children}
    </div>
  )
}
