"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Hash,
} from "lucide-react"
import { GanadorModal } from "@/components/ganador-modal"
import type { GanadorPasado } from "@/lib/supabase"
import {
  obtenerTodosLosGanadores,
  eliminarGanadorPasado,
  actualizarGanadorPasado,
} from "@/lib/database"

export function GestionGanadores() {
  const [ganadores, setGanadores] = useState<GanadorPasado[]>([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [ganadorEditando, setGanadorEditando] = useState<GanadorPasado | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarGanadores()
  }, [])

  const cargarGanadores = async () => {
    try {
      const data = await obtenerTodosLosGanadores()
      setGanadores(data)
    } catch (error) {
      console.error("Error cargando ganadores:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleNuevoGanador = () => {
    setGanadorEditando(null)
    setModalAbierto(true)
  }

  const handleEditarGanador = (ganador: GanadorPasado) => {
    setGanadorEditando(ganador)
    setModalAbierto(true)
  }

  const handleEliminarGanador = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este ganador?")) {
      return
    }

    try {
      await eliminarGanadorPasado(id)
      cargarGanadores()
    } catch (error) {
      console.error("Error eliminando ganador:", error)
      alert("Error al eliminar el ganador")
    }
  }

  const toggleVisibilidad = async (ganador: GanadorPasado) => {
    try {
      await actualizarGanadorPasado(ganador.id, { visible: !ganador.visible })
      cargarGanadores()
    } catch (error) {
      console.error("Error actualizando visibilidad:", error)
      alert("Error al actualizar la visibilidad")
    }
  }

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha)
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Gestión de Ganadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Gestión de Ganadores Pasados
          </CardTitle>
          <Button onClick={handleNuevoGanador} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Ganador
          </Button>
        </CardHeader>
        <CardContent>
          {ganadores.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No hay ganadores registrados
              </p>
              <Button onClick={handleNuevoGanador}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Primer Ganador
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Ganador</TableHead>
                    <TableHead>Premio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Imágenes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ganadores.map((ganador) => (
                    <TableRow key={ganador.id}>
                      <TableCell className="font-medium">
                        {ganador.orden}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">
                            {ganador.nombre_ganador}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {ganador.precio_premio}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{ganador.premio}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatearFecha(ganador.fecha_sorteo)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono font-bold">
                            {ganador.numero_ganador}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {ganador.imagen_1_url && (
                            <div className="w-8 h-8 rounded overflow-hidden border">
                              <img
                                src={ganador.imagen_1_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {ganador.imagen_2_url && (
                            <div className="w-8 h-8 rounded overflow-hidden border">
                              <img
                                src={ganador.imagen_2_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {ganador.imagen_3_url && (
                            <div className="w-8 h-8 rounded overflow-hidden border">
                              <img
                                src={ganador.imagen_3_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ganador.visible ? "default" : "secondary"}
                        >
                          {ganador.visible ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Visible
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Oculto
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleVisibilidad(ganador)}
                            title={
                              ganador.visible ? "Ocultar" : "Hacer visible"
                            }
                          >
                            {ganador.visible ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditarGanador(ganador)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEliminarGanador(ganador.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <GanadorModal
        isOpen={modalAbierto}
        onClose={() => {
          setModalAbierto(false)
          setGanadorEditando(null)
        }}
        onSuccess={cargarGanadores}
        ganador={ganadorEditando}
      />
    </>
  )
}
