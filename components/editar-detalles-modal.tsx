"use client"

import type React from "react"

import { useState } from "react"
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
import { Pencil } from "lucide-react"

interface EditarDetallesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detallesActuales: {
    nombre: string
    descripcion: string
  }
  onDetallesActualizados: (nombre: string, descripcion: string) => Promise<void>
}

export function EditarDetallesModal({
  open,
  onOpenChange,
  detallesActuales,
  onDetallesActualizados,
}: EditarDetallesModalProps) {
  const [nombre, setNombre] = useState(detallesActuales.nombre)
  const [descripcion, setDescripcion] = useState(detallesActuales.descripcion)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) {
      alert("El nombre del sorteo no puede estar vacío")
      return
    }

    setLoading(true)
    try {
      await onDetallesActualizados(nombreLimpio, descripcion.trim())
      onOpenChange(false)
    } catch (error) {
      console.error("Error actualizando detalles:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Editar Detalles del Sorteo
          </DialogTitle>
          <DialogDescription>
            El nombre es el que se muestra en la web y el que llega en el email de
            confirmación.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre del sorteo</Label>
            <Input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Honda Wave 2025"
              required
            />
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción del sorteo"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
