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
import { actualizarFechaSorteo } from "@/lib/database"
import type { Sorteo } from "@/lib/supabase"

interface EditarFechaSorteoModalProps {
  isOpen: boolean
  onClose: () => void
  sorteo: Sorteo
  onFechaActualizada: () => void
}

export function EditarFechaSorteoModal({
  isOpen,
  onClose,
  sorteo,
  onFechaActualizada,
}: EditarFechaSorteoModalProps) {
  const [fecha, setFecha] = useState(sorteo.fecha_sorteo || "")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)

    try {
      const success = await actualizarFechaSorteo(sorteo.id, fecha || null)

      if (success) {
        toast({
          title: "Fecha actualizada",
          description: "La fecha del sorteo se actualizó correctamente",
        })
        onFechaActualizada()
        onClose()
      } else {
        throw new Error("No se pudo actualizar la fecha")
      }
    } catch (error) {
      console.error("Error actualizando fecha:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la fecha. Intenta nuevamente.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card-dark border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Fecha del Sorteo</DialogTitle>
          <DialogDescription className="text-gray-400">
            Cambia la fecha en que se realizará el sorteo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-white">
              Fecha del Sorteo
            </Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
            <p className="text-xs text-gray-500">
              Dejá vacío para mostrar "próximamente"
            </p>
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
            <Button type="submit" disabled={loading} className="btn-neon">
              {loading ? "Guardando..." : "Guardar Fecha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
