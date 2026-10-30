"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, MailWarning } from "lucide-react"

interface TransferenciaExitoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TransferenciaExitoModal({
  isOpen,
  onClose,
}: TransferenciaExitoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#111] text-white border-0 px-1 py-10 lg:py-2 overflow-hidden max-h-[95vh] overflow-y-auto rounded-2xl">
        <DialogTitle className="sr-only">¡Transferencia registrada!</DialogTitle>
        <div className="px-6 py-8">
          <div className="rounded-2xl border border-green-600/60 bg-[#161616] p-6 shadow-[0_0_30px_rgba(22,163,74,0.18)]">
            {/* Logo */}
            <div className="flex justify-center mb-5">
              <img
                src="/sosamotos.jpeg"
                alt="Logo"
                className="w-16 h-16 rounded-full object-cover border-2 border-green-600/60"
              />
            </div>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-green-600/10 border border-green-600/40 mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-xl font-extrabold uppercase tracking-wide text-green-500 leading-tight">
                ¡Transferencia registrada!
              </h2>
            </div>

            <p className="text-gray-200 text-[15px] leading-relaxed mb-5 text-center">
              Tu pago está pendiente de confirmación. Te notificaremos por email
              cuando sea aprobado.
            </p>

            <div className="flex items-start gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/40 p-4 mb-6">
              <MailWarning className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-200 text-sm leading-relaxed">
                Revisá tu carpeta de <strong>spam</strong> o{" "}
                <strong>correo no deseado</strong> por si el email no llega a tu
                bandeja principal.
              </p>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold uppercase tracking-wide text-base h-12"
            >
              Entendido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
