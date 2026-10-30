"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface TablaPaginacionProps {
  pagina: number
  totalItems: number
  porPagina: number
  onPaginaChange: (pagina: number) => void
  onPorPaginaChange: (porPagina: number) => void
}

export function TablaPaginacion({
  pagina,
  totalItems,
  porPagina,
  onPaginaChange,
  onPorPaginaChange,
}: TablaPaginacionProps) {
  const totalPaginas = Math.max(1, Math.ceil(totalItems / porPagina))
  const desde = totalItems === 0 ? 0 : (pagina - 1) * porPagina + 1
  const hasta = Math.min(pagina * porPagina, totalItems)

  if (totalItems === 0) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          {desde}-{hasta} de {totalItems}
        </span>
        <Select
          value={String(porPagina)}
          onValueChange={(value) => onPorPaginaChange(Number(value))}
        >
          <SelectTrigger className="w-[110px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25 / página</SelectItem>
            <SelectItem value="50">50 / página</SelectItem>
            <SelectItem value="100">100 / página</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPaginaChange(pagina - 1)}
          disabled={pagina <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-gray-600 min-w-[90px] text-center">
          Página {pagina} de {totalPaginas}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPaginaChange(pagina + 1)}
          disabled={pagina >= totalPaginas}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
