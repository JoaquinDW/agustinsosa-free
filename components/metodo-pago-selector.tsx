"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Banknote } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MetodoPagoSelectorProps {
  pack: {
    chances: number
    precio: number
  } | null
  // Mercado Pago deshabilitado: no volver a exponer este callback.
  // onMercadoPago: () => void
  onTransferencia: () => void
  alias?: string
  titular?: string
}

export function MetodoPagoSelector({
  pack,
  onTransferencia,
  alias = "sosamotos",
  titular = "Agustín Sosa",
}: MetodoPagoSelectorProps) {
  const [aliasCopiado, setAliasCopiado] = useState(false)
  const { toast } = useToast()

  const copiarAlias = async () => {
    try {
      await navigator.clipboard.writeText(alias)
      setAliasCopiado(true)
      toast({
        title: "¡Alias copiado!",
        description: "Ya puedes pegarlo en tu app bancaria",
      })
      setTimeout(() => setAliasCopiado(false), 2000)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo copiar el alias",
      })
    }
  }

  if (!pack) return null

  return (
    <div className="space-y-6">
      {/* COMENTADO: Sección de selección de método de pago - Solo hay transferencia por ahora */}
      {/* 
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2 text-white">
          Elegí tu método de pago
        </h3>
        <p className="text-gray-400">
          {pack.chances} chances por ${pack.precio.toLocaleString()}
        </p>
      </div>
      */}

      {/* MercadoPago - COMENTADO */}
      {/* <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-blue-500" />
              <div>
                <CardTitle className="text-lg text-white">MercadoPago</CardTitle>
                <p className="text-sm text-gray-400">
                  Tarjeta de crédito/débito
                </p>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Inmediato</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">
            Pago seguro con tarjeta. Confirmación automática.
          </p>
          <Button
            onClick={onMercadoPago}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Pagar con MercadoPago
          </Button>
        </CardContent>
      </Card> */}

      {/* Transferencia - ÚNICO MÉTODO ACTIVO */}
      <div className="text-center mb-4">
        <h3 className="text-xl font-semibold mb-2 text-white">
          Transferencia Bancaria
        </h3>
        <p className="text-gray-400">
          {pack.chances} chances por ${pack.precio.toLocaleString()}
        </p>
      </div>

      <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Banknote className="w-6 h-6 text-green-500" />
              <div>
                <CardTitle className="text-lg text-white">
                  Transferencia Bancaria
                </CardTitle>
                <p className="text-sm text-gray-400">
                  Transferí desde tu banco
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              Manual
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            Realiza una transferencia bancaria y luego sube el comprobante.
          </p>

          <Button
            onClick={onTransferencia}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Continuar con Transferencia
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
