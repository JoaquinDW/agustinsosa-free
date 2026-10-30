"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RotateCcw, AlertTriangle, Loader2 } from "lucide-react"

interface ResetSorteoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  totalCompradores: number
  totalRecaudado: number
}

export function ResetSorteoModal({
  open,
  onOpenChange,
  onConfirm,
  totalCompradores,
  totalRecaudado,
}: ResetSorteoModalProps) {
  const [resetting, setResetting] = useState(false)

  const handleConfirm = async () => {
    setResetting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error("Error reiniciando sorteo:", error)
    } finally {
      setResetting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            ¿Reiniciar Sorteo?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="text-gray-700">
              <strong>¡ATENCIÓN!</strong> Esta acción eliminará permanentemente todos los datos del sorteo actual:
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-red-700">Compradores:</span>
                <span className="font-semibold text-red-800">{totalCompradores}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">Total recaudado:</span>
                <span className="font-semibold text-red-800">${totalRecaudado.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-sm text-gray-600">Se creará un nuevo sorteo limpio. Esta acción no se puede deshacer.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={resetting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {resetting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reiniciando...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Sí, reiniciar sorteo
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
