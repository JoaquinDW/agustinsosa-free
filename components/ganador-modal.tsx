"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2, Upload, X } from "lucide-react"
import { crearGanadorPasado, actualizarGanadorPasado } from "@/lib/database"
import type { GanadorPasado } from "@/lib/supabase"

interface GanadorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  ganador?: GanadorPasado | null
}

export function GanadorModal({
  isOpen,
  onClose,
  onSuccess,
  ganador,
}: GanadorModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre_ganador: "",
    premio: "",
    precio_premio: "",
    fecha_sorteo: "",
    numero_ganador: 0,
    orden: 0,
    visible: true,
  })

  const [imagenes, setImagenes] = useState<{
    imagen_1?: File | string
    imagen_2?: File | string
    imagen_3?: File | string
  }>({})

  // Actualizar el formulario cuando cambia el ganador
  useEffect(() => {
    if (ganador) {
      setFormData({
        nombre_ganador: ganador.nombre_ganador || "",
        premio: ganador.premio || "",
        precio_premio: ganador.precio_premio || "",
        fecha_sorteo: ganador.fecha_sorteo || "",
        numero_ganador: ganador.numero_ganador || 0,
        orden: ganador.orden || 0,
        visible: ganador.visible ?? true,
      })
      setImagenes({
        imagen_1: ganador.imagen_1_url || undefined,
        imagen_2: ganador.imagen_2_url || undefined,
        imagen_3: ganador.imagen_3_url || undefined,
      })
    } else {
      // Reset para nuevo ganador
      setFormData({
        nombre_ganador: "",
        premio: "",
        precio_premio: "",
        fecha_sorteo: "",
        numero_ganador: 0,
        orden: 0,
        visible: true,
      })
      setImagenes({})
    }
  }, [ganador])

  const handleImagenChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    campo: "imagen_1" | "imagen_2" | "imagen_3"
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      setImagenes((prev) => ({ ...prev, [campo]: file }))
    }
  }

  const eliminarImagen = (campo: "imagen_1" | "imagen_2" | "imagen_3") => {
    setImagenes((prev) => ({ ...prev, [campo]: undefined }))
  }

  const subirImagen = async (file: File, campo: string): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file, `${campo}-${file.name}`)
    const response = await fetch("/api/upload-image", {
      method: "POST",
      body: formData,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok || !result?.url) {
      throw new Error(result?.error || "No se pudo subir la imagen")
    }
    return result.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Subir imágenes nuevas
      const imagenesUrls: {
        imagen_1_url: string | null
        imagen_2_url: string | null
        imagen_3_url: string | null
      } = {
        imagen_1_url: null,
        imagen_2_url: null,
        imagen_3_url: null,
      }

      for (const [key, value] of Object.entries(imagenes)) {
        if (value instanceof File) {
          imagenesUrls[`${key}_url` as keyof typeof imagenesUrls] =
            await subirImagen(value, key)
        } else if (typeof value === "string") {
          imagenesUrls[`${key}_url` as keyof typeof imagenesUrls] = value
        }
      }

      const datosGanador = {
        ...formData,
        ...imagenesUrls,
      }

      if (ganador) {
        // Actualizar ganador existente
        const ganadorActualizado = await actualizarGanadorPasado(
          ganador.id,
          datosGanador
        )
        if (!ganadorActualizado) {
          throw new Error("No se pudo actualizar el ganador")
        }
      } else {
        // Crear nuevo ganador
        const ganadorCreado = await crearGanadorPasado(datosGanador)
        if (!ganadorCreado) {
          throw new Error("No se pudo crear el ganador")
        }
      }

      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      console.error("Error guardando ganador:", error)
      alert("Error al guardar el ganador. Por favor, intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre_ganador: "",
      premio: "",
      precio_premio: "",
      fecha_sorteo: "",
      numero_ganador: 0,
      orden: 0,
      visible: true,
    })
    setImagenes({})
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ganador ? "Editar Ganador" : "Agregar Ganador"}
          </DialogTitle>
          <DialogDescription>
            {ganador
              ? "Modifica los datos del ganador"
              : "Completa los datos del nuevo ganador"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre del ganador */}
          <div className="space-y-2">
            <Label htmlFor="nombre_ganador">Nombre del Ganador</Label>
            <Input
              id="nombre_ganador"
              value={formData.nombre_ganador}
              onChange={(e) =>
                setFormData({ ...formData, nombre_ganador: e.target.value })
              }
              placeholder="Pedro Agustín Sáez"
              required
            />
          </div>

          {/* Premio */}
          <div className="space-y-2">
            <Label htmlFor="premio">Premio</Label>
            <Textarea
              id="premio"
              value={formData.premio}
              onChange={(e) =>
                setFormData({ ...formData, premio: e.target.value })
              }
              placeholder="iPhone 14 Pro Max nuevo en caja"
              required
              rows={2}
            />
          </div>

          {/* Precio del premio */}
          <div className="space-y-2">
            <Label htmlFor="precio_premio">Precio del Premio</Label>
            <Input
              id="precio_premio"
              value={formData.precio_premio}
              onChange={(e) =>
                setFormData({ ...formData, precio_premio: e.target.value })
              }
              placeholder="$10 mil pesos"
              required
            />
          </div>

          {/* Fecha y Número ganador */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_sorteo">Fecha del Sorteo</Label>
              <Input
                id="fecha_sorteo"
                type="date"
                value={formData.fecha_sorteo}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_sorteo: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_ganador">Número Ganador</Label>
              <Input
                id="numero_ganador"
                type="number"
                value={formData.numero_ganador}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    numero_ganador: parseInt(e.target.value),
                  })
                }
                placeholder="3966"
                required
              />
            </div>
          </div>

          {/* Orden y Visibilidad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orden">Orden (Mayor = Primero)</Label>
              <Input
                id="orden"
                type="number"
                value={formData.orden}
                onChange={(e) =>
                  setFormData({ ...formData, orden: parseInt(e.target.value) })
                }
                placeholder="1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visible">Visible en el sitio</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="visible"
                  checked={formData.visible}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, visible: checked })
                  }
                />
                <Label htmlFor="visible" className="cursor-pointer">
                  {formData.visible ? "Sí" : "No"}
                </Label>
              </div>
            </div>
          </div>

          {/* Imágenes */}
          <div className="space-y-4">
            <Label>Imágenes (hasta 3)</Label>
            <div className="grid grid-cols-3 gap-4">
              {(["imagen_1", "imagen_2", "imagen_3"] as const).map(
                (campo, idx) => (
                  <div key={campo} className="space-y-2">
                    <Label htmlFor={campo} className="text-sm">
                      Imagen {idx + 1}
                    </Label>
                    {imagenes[campo] ? (
                      <div className="relative">
                        <img
                          src={
                            imagenes[campo] instanceof File
                              ? URL.createObjectURL(imagenes[campo] as File)
                              : (imagenes[campo] as string)
                          }
                          alt={`Imagen ${idx + 1}`}
                          className="w-full aspect-square object-cover rounded-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => eliminarImagen(campo)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor={campo}
                        className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-zinc-700 rounded-md cursor-pointer hover:border-zinc-500 transition-colors"
                      >
                        <Upload className="h-6 w-6 text-zinc-500 mb-2" />
                        <span className="text-xs text-zinc-500">Subir</span>
                        <input
                          id={campo}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImagenChange(e, campo)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ganador ? "Guardar Cambios" : "Crear Ganador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
