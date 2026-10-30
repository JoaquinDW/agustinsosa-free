"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Upload,
  FileImage,
  X,
  Copy,
  Check,
  AlertTriangle,
  ArrowLeft,
  Building2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { CuentaTransferencia, PaisTransferencia } from "@/lib/supabase"
import { formatearMonto, PAISES_TRANSFERENCIA } from "@/lib/moneda"
import { normalizarTelefono } from "@/lib/whatsapp/normalizar"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface TransferenciaModalProps {
  isOpen: boolean
  onClose: () => void
  onChangeCountry: () => void
  pack: {
    chances: number
    precio: number
    precioLista?: number
  } | null
  onSubmit: (data: {
    nombre: string
    email: string
    telefono: string
    comprobanteFile: File
    paisTransferencia: PaisTransferencia
  }) => void | Promise<void>
  pais: PaisTransferencia
  cuenta: CuentaTransferencia
  avisoTitulo?: string
  avisoTexto?: string
}

export function TransferenciaModal({
  isOpen,
  onClose,
  onChangeCountry,
  pack,
  onSubmit,
  pais,
  cuenta,
  avisoTitulo = "IMPORTANTE — TRANSFERENCIAS",
  avisoTexto = "Las transferencias deben estar emitidas a nombre de la misma persona que completa este formulario (nombre y apellido). Si el titular de la transferencia no coincide, la compra se anula directamente sin excepción.",
}: TransferenciaModalProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
  })
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aliasCopiado, setAliasCopiado] = useState(false)
  const [avisoAceptado, setAvisoAceptado] = useState(false)
  const { toast } = useToast()

  // Mostrar siempre el aviso al abrir el modal
  useEffect(() => {
    if (isOpen) setAvisoAceptado(false)
  }, [isOpen])

  const copiarAlias = async () => {
    try {
      await navigator.clipboard.writeText(cuenta.identificador)
      setAliasCopiado(true)
      toast({
        title: "¡Alias copiado!",
        description: "Ya puedes pegarlo en tu app bancaria",
      })
      setTimeout(() => setAliasCopiado(false), 2000)
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo copiar el alias",
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleFileSelect = (file: File) => {
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Tipo de archivo no válido",
        description: "Solo se permiten imágenes (JPG, PNG, WEBP) o PDF",
      })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Archivo muy grande",
        description: "El archivo debe ser menor a 5MB",
      })
      return
    }
    setComprobanteFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.nombre.trim() ||
      !formData.email.trim() ||
      !formData.telefono.trim()
    ) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Completá nombre, email y WhatsApp",
      })
      return
    }

    if (!EMAIL_REGEX.test(formData.email.trim())) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Revisá que el email esté bien escrito",
      })
      return
    }

    // Misma validación que usa el envío por WhatsApp: si pasa acá, el número
    // se puede normalizar con el código de país correcto.
    if (!normalizarTelefono(formData.telefono, pais)) {
      toast({
        variant: "destructive",
        title: "WhatsApp inválido",
        description: `Revisá el número. Si no es de ${PAISES_TRANSFERENCIA[pais].nombre}, escribilo con el código de país (${pais === "PY" ? "+54" : "+595"}).`,
      })
      return
    }

    if (!comprobanteFile) {
      toast({
        variant: "destructive",
        title: "Falta el comprobante",
        description: "Debes subir el comprobante de transferencia",
      })
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        ...formData,
        comprobanteFile,
        paisTransferencia: pais,
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ nombre: "", email: "", telefono: "" })
    setComprobanteFile(null)
    setAvisoAceptado(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!pack) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#111] text-white border-0 px-1 py-10 lg:py-2 overflow-hidden max-h-[95vh] overflow-y-auto rounded-2xl">
        <DialogTitle className="sr-only">
          {avisoAceptado ? "Completá tu compra" : avisoTitulo}
        </DialogTitle>
        {!avisoAceptado ? (
          /* Aviso importante antes de transferir */
          <div className="px-6 py-8">
            <div className="rounded-2xl border border-red-600/60 bg-[#161616] p-6 shadow-[0_0_30px_rgba(220,38,38,0.18)]">
              {/* Logo */}
              <div className="flex justify-center mb-5">
                <img
                  src="/sosamotos.jpeg"
                  alt="Logo"
                  className="w-16 h-16 rounded-full object-cover border-2 border-red-600/60"
                />
              </div>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-600/10 border border-red-600/40 flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-lg font-extrabold uppercase tracking-wide text-red-500 leading-tight">
                  {avisoTitulo}
                </h2>
              </div>
              <div className="mb-5 flex items-center justify-between rounded-xl border border-[#333] bg-black/40 px-4 py-3">
                <span className="text-sm font-semibold text-white">
                  {PAISES_TRANSFERENCIA[pais].bandera} Transferencia desde{" "}
                  {PAISES_TRANSFERENCIA[pais].nombre}
                </span>
                <button
                  type="button"
                  onClick={onChangeCountry}
                  className="text-xs font-semibold text-red-400 hover:text-red-300"
                >
                  Cambiar
                </button>
              </div>
              <p className="text-gray-200 text-[15px] leading-relaxed mb-6 whitespace-pre-line">
                {avisoTexto}
              </p>
              <Button
                type="button"
                onClick={() => setAvisoAceptado(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold uppercase tracking-wide text-base h-12"
              >
                Entiendo
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-[#111] pt-8 pb-4 px-6 text-center">
              <button
                type="button"
                onClick={onChangeCountry}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Cambiar país
              </button>
              <h2 className="text-2xl font-extrabold uppercase tracking-wide text-white">
                Completá tu compra
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Transferí y cargá el comprobante
              </p>
            </div>

            {/* Monto destacado */}
            <div className="mx-6 mb-4 rounded-xl bg-[#1a1a1a] border border-[#333] p-4 text-center">
              <p className="text-sm text-gray-400 mb-1">Total a transferir</p>
              <p className="text-3xl font-black text-red-500">
                {pack.precioLista ? (
                  <span className="mr-2 text-sm text-zinc-500 line-through">
                    {formatearMonto(
                      pack.precioLista,
                      PAISES_TRANSFERENCIA[pais].moneda,
                    )}
                  </span>
                ) : null}
                {formatearMonto(pack.precio, PAISES_TRANSFERENCIA[pais].moneda)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {pack.chances}{" "}
                {pack.chances === 1
                  ? "chance para el sorteo"
                  : "chances para el sorteo"}
              </p>
            </div>

            {/* Cuenta bancaria del país elegido */}
            <div className="mx-6 mb-5 rounded-xl bg-[#1a1a1a] border border-[#333] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
                    {PAISES_TRANSFERENCIA[pais].bandera} Cuenta de{" "}
                    {PAISES_TRANSFERENCIA[pais].nombre}
                  </p>
                  {cuenta.banco ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-300">
                      <Building2 className="h-3.5 w-3.5" />
                      {cuenta.banco}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                {cuenta.etiqueta}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black rounded-lg border border-red-900/50 px-4 py-3">
                  <span className="font-mono text-base text-red-400 tracking-wide">
                    {cuenta.identificador}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copiarAlias}
                  className="flex items-center justify-center w-11 h-11 rounded-lg bg-red-600 hover:bg-red-700 transition-colors flex-shrink-0"
                >
                  {aliasCopiado ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <Copy className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Titular: {cuenta.titular}
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3">
                Tus datos
              </p>

              <div>
                <Label
                  htmlFor="nombre"
                  className="text-gray-400 text-xs mb-1 block"
                >
                  Nombre completo *
                </Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Juan Pérez"
                  className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-600 focus:border-red-600 focus-visible:ring-red-600/30 h-11"
                  disabled={loading}
                />
              </div>

              <div>
                <Label
                  htmlFor="email"
                  className="text-gray-400 text-xs mb-1 block"
                >
                  Email *{" "}
                  <span className="text-gray-600">
                    (recibís tus números acá)
                  </span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="juan@email.com"
                  className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-600 focus:border-red-600 focus-visible:ring-red-600/30 h-11"
                  disabled={loading}
                />
              </div>

              <div>
                <Label
                  htmlFor="telefono"
                  className="text-gray-400 text-xs mb-1 block"
                >
                  WhatsApp *{" "}
                  <span className="text-gray-600">
                    (también te mandamos tus números acá)
                  </span>
                </Label>
                <Input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder={pais === "PY" ? "0981 123 456" : "3794 123456"}
                  className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-600 focus:border-red-600 focus-visible:ring-red-600/30 h-11"
                  disabled={loading}
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Si tu número no es de {PAISES_TRANSFERENCIA[pais].nombre},
                  escribilo con el código de país (
                  {pais === "PY" ? "+54 para Argentina" : "+595 para Paraguay"}
                  ).
                </p>
              </div>

              {/* Comprobante */}
              <div>
                <Label className="text-gray-400 text-xs mb-1 block uppercase tracking-widest font-semibold">
                  Comprobante *
                </Label>
                <div
                  className={`mt-1 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-red-500 bg-red-950/20"
                      : comprobanteFile
                        ? "border-green-700 bg-green-950/20"
                        : "border-[#333] hover:border-red-800 bg-[#1a1a1a]"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                    disabled={loading}
                  />

                  {comprobanteFile ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileImage className="w-6 h-6 text-green-400 flex-shrink-0" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-green-400 truncate max-w-[180px]">
                            {comprobanteFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(comprobanteFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setComprobanteFile(null)
                        }}
                        className="w-7 h-7 rounded-full bg-[#333] hover:bg-[#444] flex items-center justify-center flex-shrink-0"
                        disabled={loading}
                      >
                        <X className="w-4 h-4 text-gray-300" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-7 h-7 text-gray-500 mx-auto" />
                      <p className="text-sm text-gray-300">
                        Tocá para subir el comprobante
                      </p>
                      <p className="text-xs text-gray-600">
                        JPG, PNG, WEBP o PDF · máx. 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 text-gray-400 hover:text-white hover:bg-[#222] border border-[#333]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-base h-11"
                >
                  {loading ? "Enviando..." : "Finalizar compra"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
