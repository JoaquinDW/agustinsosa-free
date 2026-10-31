"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, CheckCircle2, ExternalLink, Instagram, Loader2, MessageCircle, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { normalizarTelefono } from "@/lib/whatsapp/normalizar"
import {
  CONSENTIMIENTO_NOVEDADES,
  CANAL_WHATSAPP_URL,
  CUENTA_INSTAGRAM_REQUERIDA,
  SOLICITAR_CAPTURA_INSTAGRAM,
  MAX_BYTES_CAPTURA,
  TIPOS_CAPTURA,
  normalizarInstagram,
} from "@/lib/consentimientos"

// Origen de la visita (UTM de la URL y referrer) para saber de dónde viene
// cada lead.
function obtenerOrigen(): Record<string, string> {
  const params = new URLSearchParams(window.location.search)
  const origen: Record<string, string> = {}
  for (const clave of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const valor = params.get(clave)
    if (valor) origen[clave] = valor
  }
  if (document.referrer) origen.referrer = document.referrer
  return origen
}

// Vercel limita el cuerpo de cada request a ~4.5 MB, así que las capturas se
// achican en el navegador (JPEG, lado mayor 1600 px) antes de subirlas. Si el
// navegador no puede decodificar la imagen (p. ej. HEIC en Chrome), se envía
// la original.
async function reducirImagen(archivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(archivo)
    const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8),
    )
    if (!blob || blob.size >= archivo.size) return archivo
    return new File([blob], archivo.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    })
  } catch {
    return archivo
  }
}

/** Tres pasos: Instagram, canal de WhatsApp y datos de contacto. */
export function FormularioGratis({
  volverAlInicio = false,
}: {
  /** Muestra "Volver al Inicio" en la pantalla de éxito (página /free). */
  volverAlInicio?: boolean
}) {
  const id = useId()
  const [sigueCanalWhatsapp, setSigueCanalWhatsapp] = useState(false)
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [instagram, setInstagram] = useState("")
  const [captura, setCaptura] = useState<File | null>(null)
  const [aceptaBases, setAceptaBases] = useState(false)
  // Consentimiento de marketing (email y WhatsApp): opcional y destildado por defecto.
  const [aceptaNovedades, setAceptaNovedades] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numeroAsignado, setNumeroAsignado] = useState<number | null>(null)

  const elegirCaptura = async (archivo: File | undefined) => {
    if (!archivo) return
    const reducida = TIPOS_CAPTURA[archivo.type] ? await reducirImagen(archivo) : archivo
    if (!TIPOS_CAPTURA[reducida.type] || reducida.size > MAX_BYTES_CAPTURA) {
      setError("Elegí una imagen JPG, PNG, WebP o HEIC de hasta 5 MB.")
      return
    }
    setError(null)
    setCaptura(reducida)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (document.body.dataset.sosaPreview === "true") {
      setError("La participación se habilita cuando el sitio está publicado.")
      return
    }
    if (isLoading) return
    if (SOLICITAR_CAPTURA_INSTAGRAM && !captura) {
      setError("Subí una captura donde se vea que seguís a Agustín.")
      document.getElementById(`${id}-captura`)?.focus()
      return
    }
    if (!normalizarTelefono(telefono)) {
      setError("Ingresá un número de teléfono válido. Si es de Paraguay, incluí +595.")
      return
    }
    if (!normalizarInstagram(instagram)) {
      setError("Ingresá tu usuario de Instagram, por ejemplo @tuusuario.")
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const body = new FormData()
      body.append("nombre", nombre.trim())
      body.append("email", email.trim())
      body.append("telefono", telefono.trim())
      body.append("instagram", instagram.trim())
      body.append("sigueCanalWhatsapp", String(sigueCanalWhatsapp))
      body.append("aceptaBases", String(aceptaBases))
      body.append("aceptaEmail", String(aceptaNovedades))
      body.append("aceptaWhatsapp", String(aceptaNovedades))
      body.append("origen", JSON.stringify(obtenerOrigen()))
      if (SOLICITAR_CAPTURA_INSTAGRAM && captura) {
        body.append(`captura_${CUENTA_INSTAGRAM_REQUERIDA.id}`, captura)
      }

      const res = await fetch("/api/participacion-gratuita", { method: "POST", body })

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
      <div className="pack-card relative px-5 py-8 sm:px-7 text-center">
        <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-white mb-2">
          ¡Participación confirmada!
        </h2>
        <p className="text-gray-300 mb-5 text-base">
          Ya estás participando. Te enviamos la confirmación por email.
        </p>
        <p className="text-base text-gray-300 mb-1">
          Tu número
        </p>
        <div className="text-5xl font-extrabold neon-text font-mono mb-6">
          {numeroAsignado}
        </div>
        {volverAlInicio && (
          <Link href="/">
            <Button className="btn-neon px-8 py-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Button>
          </Link>
        )}
      </div>
    )
  }

  /* ----------------------------- Formulario ----------------------------- */
  return (
    <form
      onSubmit={handleSubmit}
      className="pack-card relative space-y-8 px-5 py-7 sm:px-7"
    >
      <h2 className="text-2xl font-bold text-white">Participá en 3 pasos</h2>

      <section aria-labelledby={`${id}-instagram-titulo`} className="space-y-4">
        <Paso numero={1} id={`${id}-instagram-titulo`}>Seguí a Agustín Sosa</Paso>
        <a
          href={CUENTA_INSTAGRAM_REQUERIDA.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#c72b68] px-4 py-3 text-base font-bold text-white transition-colors hover:bg-[#ae245a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <Instagram className="h-5 w-5 shrink-0" aria-hidden="true" />
          Seguir en Instagram
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
        {SOLICITAR_CAPTURA_INSTAGRAM && (
          <>
            <p id={`${id}-captura-ayuda`} className="text-base text-zinc-300">
              Después, subí una captura que muestre que lo seguís.
            </p>
            <label
              className={`relative flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-semibold ring-1 focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-white ${
                captura
                  ? "bg-green-500/15 text-green-300 ring-green-500/40"
                  : "bg-white/10 text-white ring-white/25 hover:bg-white/15"
              }`}
            >
              {captura ? <Check className="h-5 w-5" aria-hidden="true" /> : <Upload className="h-5 w-5" aria-hidden="true" />}
              <span aria-live="polite">{captura ? "Captura lista · Cambiar" : "Subir captura"}</span>
              <input
                id={`${id}-captura`}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                aria-describedby={`${id}-captura-ayuda`}
                className="sr-only"
                disabled={isLoading}
                onChange={(e) => {
                  void elegirCaptura(e.target.files?.[0])
                  e.target.value = ""
                }}
              />
            </label>
          </>
        )}
      </section>

      <section aria-labelledby={`${id}-whatsapp-titulo`} className="space-y-4 border-t border-white/15 pt-6">
        <Paso numero={2} id={`${id}-whatsapp-titulo`}>Sumate al canal de WhatsApp</Paso>
        <a
          href={CANAL_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#176f3b] px-4 py-3 text-base font-bold text-white transition-colors hover:bg-[#125c30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          Entrar al canal
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
        <p className="text-base text-zinc-300">Tocá «Seguir» dentro de WhatsApp y volvé acá.</p>
        <Casilla checked={sigueCanalWhatsapp} onChange={setSigueCanalWhatsapp} disabled={isLoading} required>
          Ya sigo el canal
        </Casilla>
      </section>

      <section aria-labelledby={`${id}-datos-titulo`} className="space-y-5 border-t border-white/15 pt-6">
        <Paso numero={3} id={`${id}-datos-titulo`}>Completá tus datos</Paso>
        <p className="text-base text-zinc-300">Mayores de 18 años de Argentina o Paraguay. Una participación por persona.</p>
        <Field label="Nombre y apellido" htmlFor={`${id}-nombre`}>
          <Input
            id={`${id}-nombre`}
            required
            className="h-12 text-base md:text-base"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre completo"
            autoComplete="name"
            disabled={isLoading}
          />
        </Field>
        <Field label="Tu Instagram" htmlFor={`${id}-usuario`}>
          <Input
            id={`${id}-usuario`}
            required
            className="h-12 text-base md:text-base"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@tuusuario"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={isLoading}
          />
        </Field>
        <Field label="Tu WhatsApp" htmlFor={`${id}-telefono`}>
          <Input
            id={`${id}-telefono`}
            required
            className="h-12 text-base md:text-base"
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej: 379 4123456"
            autoComplete="tel"
            disabled={isLoading}
          />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`}>
          <Input
            id={`${id}-email`}
            required
            className="h-12 text-base md:text-base"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            disabled={isLoading}
          />
        </Field>
      </section>

      <div className="space-y-4 text-base">
        <Casilla checked={aceptaBases} onChange={setAceptaBases} disabled={isLoading} required>
          Soy mayor de 18 años y acepto las{" "}
          <Link href="/terminos" className="neon-text underline">
            Bases y Condiciones
          </Link>
          .
        </Casilla>
        <Casilla checked={aceptaNovedades} onChange={setAceptaNovedades} disabled={isLoading}>
          {CONSENTIMIENTO_NOVEDADES}
        </Casilla>
        <p className="text-sm text-zinc-400">
          Opcional. Podés darte de baja cuando quieras.
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-red-300 text-base">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="btn-neon-pill h-auto w-full rounded-full px-8 py-4 text-lg"
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
    </form>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-base text-gray-200">
        {label} <span className="text-[#ff0040]">*</span>
      </Label>
      {children}
    </div>
  )
}

function Casilla({
  checked,
  onChange,
  disabled,
  required,
  children,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex min-h-11 items-start gap-3 cursor-pointer text-base leading-relaxed text-gray-300">
      <input
        type="checkbox"
        required={required}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="accent-[#ff0040] w-5 h-5 mt-0.5 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      />
      <span>{children}</span>
    </label>
  )
}

function Paso({ numero, id, children }: { numero: number; id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="flex items-start gap-3 text-xl font-bold leading-snug text-white">
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-base">{numero}</span>
      <span>{children}</span>
    </h3>
  )
}
