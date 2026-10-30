"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, Hash } from "lucide-react"

interface CompradoresSearchProps {
  onSearch: (query: string, filter: string, numeroExacto: string) => void
  totalResults: number
  totalCompradores: number
}

export function CompradoresSearch({
  onSearch,
  totalResults,
  totalCompradores,
}: CompradoresSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState("todos")
  const [numeroExacto, setNumeroExacto] = useState("")
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Efecto para debounce de búsqueda
  useEffect(() => {
    // Limpiar el timer anterior si existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Crear nuevo timer
    debounceTimerRef.current = setTimeout(() => {
      onSearch(searchQuery, filter, numeroExacto)
    }, 300) // 300ms de debounce

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, filter, numeroExacto, onSearch])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleFilterChange = (value: string) => {
    setFilter(value)
  }

  const handleNumeroChange = (value: string) => {
    // Solo permitir números
    const soloNumeros = value.replace(/\D/g, "")
    setNumeroExacto(soloNumeros)
  }

  const limpiarFiltros = () => {
    // Limpiar el timer de debounce si existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setSearchQuery("")
    setFilter("todos")
    setNumeroExacto("")

    // Ejecutar búsqueda inmediatamente sin debounce
    onSearch("", "todos", "")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, email, Instagram o WhatsApp..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar número exacto"
            value={numeroExacto}
            onChange={(e) => handleNumeroChange(e.target.value)}
            className="pl-10"
            type="text"
            inputMode="numeric"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por chances" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los chances</SelectItem>
              <SelectItem value="6">6 chances</SelectItem>
              <SelectItem value="12">12 chances</SelectItem>
              <SelectItem value="24">24 chances</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          Mostrando {totalResults} de {totalCompradores} compradores
        </span>
        {(searchQuery || filter !== "todos" || numeroExacto) && (
          <button
            onClick={limpiarFiltros}
            className="text-blue-600 hover:text-blue-800"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}
