"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  crearGanadorExpress,
  buscarCompradorPorNumero,
  actualizarGanadorExpress,
  eliminarGanadorExpress,
  obtenerGanadoresExpress,
} from "@/lib/database"
import type { GanadorExpress } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Trophy, X, Plus, Edit, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface GanadoresExpressModalProps {
  sorteoId: string
}

export function GanadoresExpressModal({
  sorteoId,
}: GanadoresExpressModalProps) {
  const [abierto, setAbierto] = useState(false)
  const [ganadores, setGanadores] = useState<GanadorExpress[]>([])
  const [numeroGanador, setNumeroGanador] = useState("")
  const [nombreGanador, setNombreGanador] = useState("")
  const [premioMonto, setPremioMonto] = useState("")
  const [buscandoNombre, setBuscandoNombre] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState<GanadorExpress | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (abierto) {
      cargarGanadores()
    }
  }, [abierto, sorteoId])

  const cargarGanadores = async () => {
    const data = await obtenerGanadoresExpress(sorteoId)
    setGanadores(data)
  }

  const buscarNombrePorNumero = async (numero: string) => {
    if (!numero || isNaN(parseInt(numero))) {
      setNombreGanador("")
      return
    }

    setBuscandoNombre(true)
    try {
      const comprador = await buscarCompradorPorNumero(
        sorteoId,
        parseInt(numero)
      )
      if (comprador) {
        setNombreGanador(comprador.nombre)
        toast({
          title: "Comprador encontrado",
          description: `Nombre: ${comprador.nombre}`,
        })
      } else {
        setNombreGanador("")
        toast({
          title: "Número no encontrado",
          description: "Este número no pertenece a ningún comprador",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error buscando comprador:", error)
      toast({
        title: "Error",
        description: "Error al buscar el comprador",
        variant: "destructive",
      })
    } finally {
      setBuscandoNombre(false)
    }
  }

  const handleNumeroChange = (valor: string) => {
    setNumeroGanador(valor)
    if (valor && !isNaN(parseInt(valor))) {
      buscarNombrePorNumero(valor)
    }
  }

  const limpiarFormulario = () => {
    setNumeroGanador("")
    setNombreGanador("")
    setPremioMonto("")
    setEditando(null)
  }

  const handleGuardar = async () => {
    if (!numeroGanador || !premioMonto) {
      toast({
        title: "Error",
        description: "El número ganador y el monto del premio son obligatorios",
        variant: "destructive",
      })
      return
    }

    setGuardando(true)
    try {
      if (editando) {
        const resultado = await actualizarGanadorExpress(editando.id, {
          numero_ganador: parseInt(numeroGanador),
          nombre_ganador: nombreGanador || null,
          premio_monto: premioMonto,
        })

        if (resultado) {
          toast({
            title: "Ganador actualizado",
            description: "El ganador express ha sido actualizado correctamente",
          })
          limpiarFormulario()
          cargarGanadores()
        } else {
          toast({
            title: "Error",
            description: "No se pudo actualizar el ganador",
            variant: "destructive",
          })
        }
      } else {
        const resultado = await crearGanadorExpress(
          sorteoId,
          parseInt(numeroGanador),
          premioMonto,
          nombreGanador || undefined
        )

        if (resultado) {
          toast({
            title: "Ganador agregado",
            description: "El ganador express ha sido agregado correctamente",
          })
          limpiarFormulario()
          cargarGanadores()
        } else {
          toast({
            title: "Error",
            description: "No se pudo agregar el ganador",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error guardando ganador:", error)
      toast({
        title: "Error",
        description: "Error al guardar el ganador",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  const handleEditar = (ganador: GanadorExpress) => {
    setEditando(ganador)
    setNumeroGanador(ganador.numero_ganador.toString())
    setNombreGanador(ganador.nombre_ganador || "")
    setPremioMonto(ganador.premio_monto)
  }

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este ganador express?")) {
      return
    }

    const resultado = await eliminarGanadorExpress(id)
    if (resultado) {
      toast({
        title: "Ganador eliminado",
        description: "El ganador express ha sido eliminado correctamente",
      })
      cargarGanadores()
    } else {
      toast({
        title: "Error",
        description: "No se pudo eliminar el ganador",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Button onClick={() => setAbierto(true)} variant="outline" size="sm">
        <Trophy className="w-4 h-4 mr-2" />
        Ganadores Express
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Gestión de Ganadores Express
            </DialogTitle>
            <DialogDescription>
              Agrega ganadores de premios instantáneos. El sistema buscará
              automáticamente el nombre del comprador si existe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Formulario */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editando ? "Editar Ganador" : "Agregar Nuevo Ganador"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número Ganador *</Label>
                    <Input
                      id="numero"
                      type="number"
                      placeholder="Ej: 4816750"
                      value={numeroGanador}
                      onChange={(e) => handleNumeroChange(e.target.value)}
                      disabled={buscandoNombre || guardando}
                    />
                    {buscandoNombre && (
                      <p className="text-xs text-muted-foreground">
                        Buscando...
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Ganador</Label>
                    <Input
                      id="nombre"
                      placeholder="Se completa automáticamente"
                      value={nombreGanador}
                      onChange={(e) => setNombreGanador(e.target.value)}
                      disabled={guardando}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se autocompleta si el número existe
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="premio">Monto del Premio *</Label>
                    <Input
                      id="premio"
                      placeholder="Ej: 500$ o 10.000$ MIL"
                      value={premioMonto}
                      onChange={(e) => setPremioMonto(e.target.value)}
                      disabled={guardando}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleGuardar}
                    disabled={guardando || !numeroGanador || !premioMonto}
                  >
                    {guardando
                      ? "Guardando..."
                      : editando
                      ? "Actualizar"
                      : "Agregar"}
                  </Button>
                  {editando && (
                    <Button onClick={limpiarFormulario} variant="outline">
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lista de ganadores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ganadores Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                {ganadores.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay ganadores express registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Premio</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ganadores.map((ganador) => (
                        <TableRow key={ganador.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {ganador.numero_ganador}
                            </Badge>
                          </TableCell>
                          <TableCell>{ganador.nombre_ganador || "-"}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {ganador.premio_monto}
                          </TableCell>
                          <TableCell>
                            {new Date(
                              ganador.fecha_premio
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditar(ganador)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEliminar(ganador.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
