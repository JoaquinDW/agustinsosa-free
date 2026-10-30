"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { normalizarTelefono } from "@/lib/whatsapp/normalizar"
import { CONSENTIMIENTO_EMAIL, CONSENTIMIENTO_WHATSAPP } from "@/lib/consentimientos"

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

/** Formulario de participación gratuita: datos de contacto + consentimientos. */
export function FormularioGratis({
  volverAlInicio = false,
}: {
  /** Muestra "Volver al Inicio" en la pantalla de éxito (página /free). */
  volverAlInicio?: boolean
}) {
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [aceptaBases, setAceptaBases] = useState(false)
  // Consentimientos de marketing: opcionales y destildados por defecto.
  const [aceptaEmail, setAceptaEmail] = useState(false)
  const [aceptaWhatsapp, setAceptaWhatsapp] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numeroAsignado, setNumeroAsignado] = useState<number | null>(null)

  const formularioValido = Boolean(
    nombre.trim() && telefono.trim() && email.trim() && aceptaBases,
  )

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
      const res = await fetch("/api/participacion-gratuita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: telefono.trim(),
          aceptaEmail,
          aceptaWhatsapp,
          origen: obtenerOrigen(),
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
