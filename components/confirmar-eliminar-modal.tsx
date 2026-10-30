"use client";

import { Comprador } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Hash, User, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatearMonto } from "@/lib/moneda";

interface ConfirmarEliminarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  comprador: Comprador | null;
  isLoading?: boolean;
}

export function ConfirmarEliminarModal({
  isOpen,
  onClose,
  onConfirm,
  comprador,
  isLoading = false,
}: ConfirmarEliminarModalProps) {
  if (!comprador) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                ¿Eliminar comprador?
              </DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del comprador */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Comprador</p>
                <p className="text-base font-semibold text-gray-900">
                  {comprador.nombre}
                </p>
                {comprador.email && (
                  <p className="text-sm text-gray-600">{comprador.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="w-5 h-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Números asignados ({comprador.cantidad_chances})
                </p>
                <div className="flex flex-wrap gap-2">
                  {comprador.numeros_asignados.map((numero) => (
                    <Badge
                      key={numero}
                      variant="outline"
                      className="font-mono text-sm"
                    >
                      {numero}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">
                  Monto pagado
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {formatearMonto(
                    comprador.precio_pagado,
                    comprador.moneda || "ARS",
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Advertencias */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium mb-2">
              ⚠️ Al eliminar este comprador:
            </p>
            <ul className="text-sm text-red-700 space-y-1 ml-4">
              <li>
                • Sus {comprador.cantidad_chances} números quedarán disponibles
                para nuevas compras
              </li>
              <li>• Se perderá todo el registro de esta compra</li>
              <li>• Esta acción es permanente e irreversible</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="sm:mr-2"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <span className="mr-2">Eliminando...</span>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </>
            ) : (
              "Sí, eliminar comprador"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
