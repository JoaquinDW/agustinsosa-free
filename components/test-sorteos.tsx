"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Play,
  RotateCcw,
  Clock,
  Zap,
  TestTube2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TestSorteosProps {
  sorteoActivo: any
}

export function TestSorteos({ sorteoActivo }: TestSorteosProps) {
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<string>("")
  const [diasASimular, setDiasASimular] = useState(1)
  const { toast } = useToast()

  const ejecutarTest = async (accion: string, params = {}) => {
    if (!sorteoActivo?.id) {
      toast({
        title: "Error",
        description: "No hay sorteo activo para testear",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setResultado("")

    try {
      const response = await fetch("/api/test-sorteos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accion,
          sorteoId: sorteoActivo.id,
          ...params,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResultado(JSON.stringify(data, null, 2))
        toast({
          title: "✅ Test ejecutado",
          description: data.message,
        })
      } else {
        setResultado(`Error: ${data.error || "Error desconocido"}`)
        toast({
          title: "❌ Error en test",
          description: data.error || "Error desconocido",
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Error de conexión"
      setResultado(`Error de conexión: ${errorMsg}`)
      toast({
        title: "❌ Error de conexión",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testearScrapper = async () => {
    setLoading(true)
    setResultado("")

    try {
      const response = await fetch("/api/scrapper")
      const data = await response.json()

      setResultado(JSON.stringify(data, null, 2))

      if (data.success) {
        toast({
          title: "🎲 Scrapper ejecutado",
          description: `Número obtenido: ${data.numero}`,
        })
      } else {
        toast({
          title: "❌ Error en scrapper",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error"
      setResultado(`Error: ${errorMsg}`)
      toast({
        title: "❌ Error",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const estadoActual = sorteoActivo?.estado || "desconocido"
  const puedeCompletar = estadoActual === "activo"
  const puedeSimular = estadoActual === "completo"
  const puedeResetear = ["completo", "sorteado"].includes(estadoActual)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube2 className="h-5 w-5" />
          Testing del Sistema de Sorteos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado actual */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Estado actual:</span>
          <Badge
            variant={
              estadoActual === "activo"
                ? "default"
                : estadoActual === "completo"
                ? "secondary"
                : estadoActual === "sorteado"
                ? "outline"
                : "destructive"
            }
          >
            {estadoActual.toUpperCase()}
          </Badge>
        </div>

        {/* Controles de testing */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Test completo automático */}
          <Button
            onClick={() => ejecutarTest("test-completo")}
            disabled={loading}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Test Completo
          </Button>

          {/* Completar sorteo forzado */}
          <Button
            onClick={() => ejecutarTest("completar-sorteo")}
            disabled={loading || !puedeCompletar}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Completar
          </Button>

          {/* Simular día siguiente */}
          <Button
            onClick={() =>
              ejecutarTest("simular-dia-siguiente", { diasASimular })
            }
            disabled={loading || !puedeSimular}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Simular {diasASimular}d
          </Button>

          {/* Resetear sorteo */}
          <Button
            onClick={() => ejecutarTest("resetear-sorteo")}
            disabled={loading || !puedeResetear}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Resetear
          </Button>

          {/* Test solo scrapper */}
          <Button
            onClick={testearScrapper}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Solo Scrapper
          </Button>

          {/* Verificar sorteos manualmente */}
          <Button
            onClick={async () => {
              setLoading(true)
              try {
                const response = await fetch("/api/verificar-sorteos", {
                  method: "POST",
                })
                const data = await response.json()
                setResultado(JSON.stringify(data, null, 2))
                toast({
                  title: data.success ? "✅ Verificación OK" : "❌ Error",
                  description: data.message || data.error,
                  variant: data.success ? "default" : "destructive",
                })
              } catch (error) {
                toast({
                  title: "❌ Error",
                  description: "Error de conexión",
                  variant: "destructive",
                })
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Verificar
          </Button>
        </div>

        {/* Control de días a simular */}
        <div className="flex items-center gap-2">
          <Label htmlFor="dias">Días a simular:</Label>
          <Input
            id="dias"
            type="number"
            min="1"
            max="30"
            value={diasASimular}
            onChange={(e) => setDiasASimular(parseInt(e.target.value) || 1)}
            className="w-20"
          />
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="space-y-2">
            <Label>Resultado:</Label>
            <Textarea
              value={resultado}
              readOnly
              className="min-h-[200px] font-mono text-xs"
            />
          </div>
        )}

        {/* Ayuda */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Test Completo:</strong> Ejecuta todo el flujo
            automáticamente
          </p>
          <p>
            <strong>Completar:</strong> Marca el sorteo como completo (todas las
            chances vendidas)
          </p>
          <p>
            <strong>Simular días:</strong> Modifica la fecha para simular que
            pasó tiempo
          </p>
          <p>
            <strong>Resetear:</strong> Vuelve el sorteo a estado activo
          </p>
          <p>
            <strong>Solo Scrapper:</strong> Prueba obtener número de la lotería
          </p>
          <p>
            <strong>Verificar:</strong> Ejecuta la verificación manual de
            sorteos pendientes
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
