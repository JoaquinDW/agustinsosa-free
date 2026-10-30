"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Database, CheckCircle } from "lucide-react"
import { verificarTablas } from "@/lib/database"

export function DatabaseStatus() {
  const [tablasExisten, setTablasExisten] = useState<boolean | null>(null)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    verificarEstado()
  }, [])

  const verificarEstado = async () => {
    setVerificando(true)
    const existen = await verificarTablas()
    setTablasExisten(existen)
    setVerificando(false)
  }

  if (verificando) {
    return (
      <Alert className="mb-6">
        <Database className="h-4 w-4 animate-pulse" />
        <AlertDescription>Verificando conexión con la base de datos...</AlertDescription>
      </Alert>
    )
  }

  if (tablasExisten === false) {
    return (
      <Alert className="mb-6 border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <strong>Modo de demostración:</strong> Las tablas de Supabase no están configuradas. Los datos se guardan
              temporalmente en el navegador.
            </div>
            <Button onClick={verificarEstado} variant="outline" size="sm" className="ml-4 bg-transparent">
              Verificar nuevamente
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (tablasExisten === true) {
    return (
      <Alert className="mb-6 border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Base de datos conectada:</strong> Los datos se guardan en Supabase correctamente.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
