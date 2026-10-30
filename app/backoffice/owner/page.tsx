"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"
import { ReporteWhatsapp } from "@/components/reporte-whatsapp"
import { obtenerTodosSorteos } from "@/lib/database"
import type { Sorteo } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Ruta privada de "modo dueño". No está enlazada desde ningún lado de la UI:
// se accede solo escribiendo /backoffice/owner. Muestra el costo base de Twilio
// y el margen de facturación de WhatsApp, que el cliente no debe ver.
// Requiere además la sesión de admin del backoffice (los datos van por
// /api/admin/data); sin ella callAdminDatabase redirige a /backoffice.
export default function OwnerPage() {
  const { toast } = useToast()
  const [password, setPassword] = useState("")
  const [verificando, setVerificando] = useState(false)
  const [autorizado, setAutorizado] = useState(false)
  const [sorteos, setSorteos] = useState<Sorteo[]>([])

  const verificar = async () => {
    setVerificando(true)
    try {
      const res = await fetch("/api/owner-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const todosSorteos = await obtenerTodosSorteos()
        setSorteos(todosSorteos)
        setAutorizado(true)
        setPassword("")
      } else {
        toast({ variant: "destructive", title: "Contraseña incorrecta" })
      }
    } catch {
      toast({ variant: "destructive", title: "No se pudo verificar" })
    } finally {
      setVerificando(false)
    }
  }

  if (!autorizado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-600" />
              Modo dueño
            </CardTitle>
            {/* <p className="text-sm text-muted-foreground pt-1">
              Ingresá la contraseña de dueño para ver la facturación de WhatsApp.
            </p> */}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="owner-pass">Contraseña</Label>
              <Input
                id="owner-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verificar()}
                placeholder="Contraseña de dueño"
                autoFocus
              />
            </div>
            <Button
              onClick={verificar}
              disabled={verificando}
              className="w-full"
            >
              {verificando ? "Verificando..." : "Entrar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Modo dueño</h1>
          <p className="text-sm text-muted-foreground">
            Facturación privada de WhatsApp. El cliente no ve esta pantalla.
          </p>
        </div>
        <ReporteWhatsapp sorteos={sorteos} ownerMode />
      </div>
    </div>
  )
}
