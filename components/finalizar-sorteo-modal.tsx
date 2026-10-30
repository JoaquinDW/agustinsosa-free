"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flag, Loader2 } from "lucide-react"

interface FinalizarSorteoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  porcentajeVendido: number
  onFinalizado: (ganadorNombre: string, numeroGanador: number) => Promise<void>
}

export function FinalizarSorteoModal({
  open,
  onOpenChange,
  porcentajeVendido,
  onFinalizado,
}: FinalizarSorteoModalProps) {
  const [loading, setLoading] = useState(false)
  const [ganadorNombre, setGanadorNombre] = useState("")
  const [numeroGanador, setNumeroGanador] = useState("")

  const handleConfirmar = async () => {
    const numero = parseInt(numeroGanador, 10)
    if (!ganadorNombre.trim() || isNaN(numero) || numero <= 0) return

    setLoading(true)
    try {
      await onFinalizado(ganadorNombre.trim(), numero)
      setGanadorNombre("")
      setNumeroGanador("")
      onOpenChange(false)
    } catch (error) {
      console.error("Error finalizando sorteo:", error)
    } finally {
      setLoading(false)
    }
  }

  const puedeConfirmar =
    ganadorNombre.trim().length > 0 &&
    numeroGanador.trim().length > 0 &&
    !isNaN(parseInt(numeroGanador, 10)) &&
    parseInt(numeroGanador, 10) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-orange-500" />
            Terminar Sorteo
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm">
              <strong>Atención:</strong> El sorteo se finalizará en su estado
              actual ({porcentajeVendido.toFixed(0)}% vendido). Esta acción no
              se puede deshacer.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ganador-nombre">Nombre del Ganador</Label>
            <Input
              id="ganador-nombre"
              placeholder="Ej: WALTER PEDRAZA"
              value={ganadorNombre}
              onChange={(e) => setGanadorNombre(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero-ganador">Número Ganador</Label>
            <Input
              id="numero-ganador"
              type="number"
              placeholder="Ej: 4470"
              value={numeroGanador}
              onChange={(e) => setNumeroGanador(e.target.value)}
              disabled={loading}
              min={1}
            />
          </div>
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
          <Button
            onClick={handleConfirmar}
            disabled={loading || !puedeConfirmar}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <Flag className="h-4 w-4 mr-2" />
                Terminar Sorteo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
