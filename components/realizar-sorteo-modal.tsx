"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Play, Loader2, Trophy } from "lucide-react"

interface RealizarSorteoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sorteoId: string
  onSorteoRealizado: () => void
}

export function RealizarSorteoModal({ open, onOpenChange, sorteoId, onSorteoRealizado }: RealizarSorteoModalProps) {
  const [loading, setLoading] = useState(false)

  const handleRealizarSorteo = async () => {
    setLoading(true)
    try {
      // Llamar a la función del padre que maneja el sorteo
      await onSorteoRealizado()
      onOpenChange(false)
    } catch (error) {
      console.error("Error realizando sorteo:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Realizar Sorteo
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-gray-600 mb-4">
            ¿Estás seguro de que quieres realizar el sorteo? Esta acción no se puede deshacer.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm">
              <strong>Importante:</strong> Se seleccionará un ganador aleatoriamente entre todos los números vendidos.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleRealizarSorteo} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Realizando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Realizar Sorteo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
