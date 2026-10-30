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
import { DollarSign } from "lucide-react"

interface EditarPreciosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preciosActuales: {
    precio6: number
    precio12: number
    precio24: number
  }
  onPreciosActualizados: (precio6: number, precio12: number, precio24: number) => void
}

export function EditarPreciosModal({
  open,
  onOpenChange,
  preciosActuales,
  onPreciosActualizados,
}: EditarPreciosModalProps) {
  const [precio6, setPrecio6] = useState(preciosActuales.precio6.toString())
  const [precio12, setPrecio12] = useState(preciosActuales.precio12.toString())
  const [precio24, setPrecio24] = useState(preciosActuales.precio24.toString())
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const nuevoPrecio6 = Number.parseInt(precio6.replace(/\D/g, ""))
      const nuevoPrecio12 = Number.parseInt(precio12.replace(/\D/g, ""))
      const nuevoPrecio24 = Number.parseInt(precio24.replace(/\D/g, ""))

      if (nuevoPrecio6 <= 0 || nuevoPrecio12 <= 0 || nuevoPrecio24 <= 0) {
        alert("Los precios deben ser mayores a 0")
        return
      }

      await onPreciosActualizados(nuevoPrecio6, nuevoPrecio12, nuevoPrecio24)
      onOpenChange(false)
    } catch (error) {
      console.error("Error actualizando precios:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatearPrecio = (valor: string) => {
    const numeros = valor.replace(/\D/g, "")
    return numeros.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const handlePrecioChange = (valor: string, setter: (value: string) => void) => {
    const numerosSolo = valor.replace(/\D/g, "")
    setter(numerosSolo)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Editar Precios del Sorteo
          </DialogTitle>
          <DialogDescription>Actualiza los precios de las diferentes opciones de chances.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="precio6">Precio 6 chances</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="precio6"
                  type="text"
                  value={formatearPrecio(precio6)}
                  onChange={(e) => handlePrecioChange(e.target.value, setPrecio6)}
                  className="pl-8"
                  placeholder="21.000"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="precio12">Precio 12 chances</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="precio12"
                  type="text"
                  value={formatearPrecio(precio12)}
                  onChange={(e) => handlePrecioChange(e.target.value, setPrecio12)}
                  className="pl-8"
                  placeholder="42.000"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="precio24">Precio 24 chances</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="precio24"
                  type="text"
                  value={formatearPrecio(precio24)}
                  onChange={(e) => handlePrecioChange(e.target.value, setPrecio24)}
                  className="pl-8"
                  placeholder="84.000"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar Precios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
