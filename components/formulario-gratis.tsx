"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, CheckCircle2, Instagram, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { normalizarTelefono } from "@/lib/whatsapp/normalizar"
import {
  CONSENTIMIENTO_EMAIL,
  CONSENTIMIENTO_WHATSAPP,
  CUENTAS_INSTAGRAM,
  MAX_BYTES_CAPTURA,
  TIPOS_CAPTURA,
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

/** Formulario de participación gratuita: datos, capturas de Instagram y consentimientos. */
export function FormularioGratis({
  volverAlInicio = false,
}: {
  /** Muestra "Volver al Inicio" en la pantalla de éxito (página /free). */
  volverAlInicio?: boolean
}) {
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  // Captura de que sigue a cada cuenta de Instagram (clave: id de la cuenta)
  const [capturas, setCapturas] = useState<Record<string, File>>({})
  const [aceptaBases, setAceptaBases] = useState(false)
  // Consentimientos de marketing: opcionales y destildados por defecto.
  const [aceptaEmail, setAceptaEmail] = useState(false)
  const [aceptaWhatsapp, setAceptaWhatsapp] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numeroAsignado, setNumeroAsignado] = useState<number | null>(null)

  const capturasOk = CUENTAS_INSTAGRAM.every((cuenta) => capturas[cuenta.id])
  const formularioValido = Boolean(
    nombre.trim() && telefono.trim() && email.trim() && capturasOk && aceptaBases,
  )

  const elegirCaptura = async (cuentaId: string, archivo: File | undefined) => {
    if (!archivo) return
    const reducida = TIPOS_CAPTURA[archivo.type] ? await reducirImagen(archivo) : archivo
    if (!TIPOS_CAPTURA[reducida.type] || reducida.size > MAX_BYTES_CAPTURA) {
      setError("Las capturas deben ser imágenes (JPG, PNG, WebP o HEIC) de hasta 5 MB.")
      return
    }
    setError(null)
    setCapturas((prev) => ({ ...prev, [cuentaId]: reducida }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

    try {
      const body = new FormData()
      body.append("nombre", nombre.trim())
      body.append("email", email.trim())
      body.append("telefono", telefono.trim())
      body.append("aceptaEmail", String(aceptaEmail))
      body.append("aceptaWhatsapp", String(aceptaWhatsapp))
      body.append("origen", JSON.stringify(obtenerOrigen()))
      for (const cuenta of CUENTAS_INSTAGRAM) {
        body.append(`captura_${cuenta.id}`, capturas[cuenta.id])
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
        <p className="text-gray-400 mb-5 text-sm">
          Tu número quedó registrado y entra al sorteo. Te enviamos un email con
          la confirmación.
        </p>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
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
      className="pack-card relative px-5 py-6 sm:px-7 space-y-4"
    >
      <Field label="Nombre y apellido">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre completo"
          autoComplete="name"
          disabled={isLoading}
        />
      </Field>
      <Field label="WhatsApp">
        <Input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej: 379 4123456"
          autoComplete="tel"
          disabled={isLoading}
        />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          autoComplete="email"
          disabled={isLoading}
        />
      </Field>

      <div className="space-y-2">
        <Label className="text-gray-200">
          Seguí estas cuentas y subí una captura de cada una{" "}
          <span className="text-[#ff0040]">*</span>
        </Label>
        {CUENTAS_INSTAGRAM.map((cuenta) => (
          <div
            key={cuenta.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-3"
          >
            <a
              href={cuenta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 flex-1 items-center gap-2 text-sm text-white hover:underline"
            >
              <Instagram className="h-4 w-4 shrink-0 text-[#ff0040]" />
              <span className="truncate">{cuenta.nombre}</span>
            </a>
            <label
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                capturas[cuenta.id]
                  ? "bg-green-500/15 text-green-300"
                  : "bg-white/10 text-gray-200 hover:bg-white/20"
              }`}
            >
              {capturas[cuenta.id] ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Captura lista
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Subir captura
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={isLoading}
                onChange={(e) => elegirCaptura(cuenta.id, e.target.files?.[0])}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="space-y-2.5 pt-1 text-sm">
        <Casilla checked={aceptaBases} onChange={setAceptaBases} disabled={isLoading}>
          Soy mayor de 18 años y acepto las{" "}
          <Link href="/terminos" className="neon-text underline">
            Bases y Condiciones
          </Link>
          .
        </Casilla>
        <Casilla checked={aceptaEmail} onChange={setAceptaEmail} disabled={isLoading}>
          {CONSENTIMIENTO_EMAIL}
        </Casilla>
        <Casilla checked={aceptaWhatsapp} onChange={setAceptaWhatsapp} disabled={isLoading}>
          {CONSENTIMIENTO_WHATSAPP}
        </Casilla>
        <p className="text-xs text-gray-500">
          Recibir novedades es opcional y podés darte de baja cuando quieras.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!formularioValido || isLoading}
        className="btn-neon-pill h-auto w-full rounded-full px-8 py-3 text-base"
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-gray-200">
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
  children,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="accent-[#ff0040] w-4 h-4 mt-0.5 shrink-0"
      />
      <span>{children}</span>
    </label>
  )
}
