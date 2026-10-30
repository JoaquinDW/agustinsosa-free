"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { actualizarTituloRemera } from "@/lib/database"
import type { Sorteo } from "@/lib/supabase"

interface EditarTituloModalProps {
  isOpen: boolean
  onClose: () => void
  sorteo: Sorteo
  onTituloActualizado: () => void
}

export function EditarTituloModal({ isOpen, onClose, sorteo, onTituloActualizado }: EditarTituloModalProps) {
  const [titulo, setTitulo] = useState(sorteo.titulo_remera || "")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!titulo.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El título no puede estar vacío",
      })
      return
    }

    setLoading(true)

    try {
      const success = await actualizarTituloRemera(sorteo.id, titulo.trim())

      if (success) {
        toast({
          title: "Título actualizado",
          description: "El título del premio se actualizó correctamente",
        })
        onTituloActualizado()
        onClose()
      } else {
        throw new Error("No se pudo actualizar el título")
      }
    } catch (error) {
      console.error("Error actualizando título:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el título. Intenta nuevamente.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card-dark border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Título del Premio</DialogTitle>
          <DialogDescription className="text-gray-400">
            Cambia el nombre del premio principal. Aparece en el hero de la página, en la sección de premios y debajo de la imagen de la remera.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo" className="text-white">
              Título del Premio Principal
            </Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: HONDA WAVE 2026 0KM"
              className="bg-gray-800 border-gray-600 text-white"
              maxLength={100}
            />
            <p className="text-xs text-gray-500">{titulo.length}/100 caracteres</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !titulo.trim()} className="btn-neon">
              {loading ? "Guardando..." : "Guardar Título"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
