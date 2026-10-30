"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Star, X, Plus, Save } from "lucide-react"
import { actualizarPremiosSecundarios } from "@/lib/database"
import type { PremiosSecundarios } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"

interface Props {
  premios: PremiosSecundarios
  onActualizado: (premios: PremiosSecundarios) => void
}

export function PremiosSecundariosManager({ premios, onActualizado }: Props) {
  const [numeros, setNumeros] = useState<string[]>(premios.numeros)
  const [monto, setMonto] = useState(premios.monto)
  const [titulo, setTitulo] = useState(premios.titulo)
  const [visible, setVisible] = useState(premios.visible)
  const [nuevoNumero, setNuevoNumero] = useState("")
  const [guardando, setGuardando] = useState(false)
  const { toast } = useToast()

  const agregarNumero = () => {
    const num = nuevoNumero.trim()
    if (!num || numeros.includes(num)) {
      setNuevoNumero("")
      return
    }
    setNumeros([...numeros, num])
    setNuevoNumero("")
  }

  const eliminarNumero = (num: string) => {
    setNumeros(numeros.filter((n) => n !== num))
  }

  const guardar = async () => {
    setGuardando(true)
    const nuevos: PremiosSecundarios = { numeros, monto, titulo, visible }
    const ok = await actualizarPremiosSecundarios(nuevos)
    setGuardando(false)
    if (ok) {
      onActualizado(nuevos)
      toast({ title: "Premios secundarios guardados" })
    } else {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios" })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Premios Secundarios (Números Bendecidos)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Estos números y el monto se muestran en la sección "Premios" de la página pública.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibilidad */}
        <div className="flex items-center gap-3">
          <Switch
            id="visible"
            checked={visible}
            onCheckedChange={setVisible}
          />
          <Label htmlFor="visible">
            Visible en página pública
          </Label>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <Label>Título de la sección</Label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="NÚMEROS BENDECIDOS"
          />
        </div>

        {/* Monto */}
        <div className="space-y-2">
          <Label>Premio (monto)</Label>
          <Input
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="$50 mil"
          />
        </div>

        {/* Números */}
        <div className="space-y-3">
          <Label>Números ganadores</Label>
          <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 rounded-lg border border-gray-200">
            {numeros.length === 0 && (
              <span className="text-sm text-gray-400">Sin números cargados</span>
            )}
            {numeros.map((num) => (
              <Badge
                key={num}
                className="bg-yellow-100 text-yellow-800 border border-yellow-300 text-sm font-bold px-3 py-1 flex items-center gap-1"
              >
                {num}
                <button
                  onClick={() => eliminarNumero(num)}
                  className="ml-1 hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={nuevoNumero}
              onChange={(e) => setNuevoNumero(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregarNumero()}
              placeholder="Ej: 1234"
              className="max-w-[160px]"
            />
            <Button variant="outline" onClick={agregarNumero} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </div>
        </div>

        <Button onClick={guardar} disabled={guardando} className="bg-gray-900 hover:bg-gray-800">
          <Save className="w-4 h-4 mr-2" />
          {guardando ? "Guardando..." : "Guardar cambios"}
        </Button>
      </CardContent>
    </Card>
  )
}
