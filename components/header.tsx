"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import Image from "next/image"

export function Header({ marca = "Sosa Motos", rankingVisible = false }: { marca?: string; rankingVisible?: boolean }) {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-700 group-hover:ring-[#ff0040]/60 transition-all duration-300">
              <Image
                src="/sosamotos.jpeg"
                alt={marca}
                fill
                className="object-cover"
              />
            </div>
            <span className="text-lg font-semibold text-white tracking-wide group-hover:text-[#ff0040] transition-colors duration-300">
              {marca}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors duration-200 text-sm tracking-wide"
            >
              Inicio
            </Link>
            <Link
              href="/#tus-numeros"
              className="text-gray-400 hover:text-white transition-colors duration-200 text-sm tracking-wide"
            >
              Tus números
            </Link>
            <Link
              href="/#ganadores"
              className="text-gray-400 hover:text-white transition-colors duration-200 text-sm tracking-wide"
            >
              Ganadores
            </Link>
            {rankingVisible && (
              <Link href="/ranking" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm tracking-wide">
                Ranking
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="md:hidden text-gray-400 hover:text-white transition-colors p-2"
          >
            {menuAbierto ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {menuAbierto && (
          <div className="md:hidden py-4 border-t border-gray-800/50">
            <nav className="flex flex-col space-y-1">
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition-colors duration-200 px-2 py-2 text-sm tracking-wide"
                onClick={() => setMenuAbierto(false)}
              >
                Inicio
              </Link>
              <Link
                href="/#tus-numeros"
                className="text-gray-400 hover:text-white transition-colors duration-200 px-2 py-2 text-sm tracking-wide"
                onClick={() => setMenuAbierto(false)}
              >
                Mis números
              </Link>
              <Link
                href="/#ganadores"
                className="text-gray-400 hover:text-white transition-colors duration-200 px-2 py-2 text-sm tracking-wide"
                onClick={() => setMenuAbierto(false)}
              >
                Ganadores
              </Link>
              {rankingVisible && (
                <Link href="/ranking" className="text-gray-400 hover:text-white transition-colors duration-200 px-2 py-2 text-sm tracking-wide" onClick={() => setMenuAbierto(false)}>
                  Ranking
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
