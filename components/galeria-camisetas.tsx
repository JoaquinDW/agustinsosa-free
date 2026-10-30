"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

const camisetas = [
  { id: 1, nombre: "Classic Black", imagen: "/placeholder.svg?height=300&width=250" },
  { id: 2, nombre: "Urban White", imagen: "/placeholder.svg?height=300&width=250" },
  { id: 3, nombre: "Street Green", imagen: "/placeholder.svg?height=300&width=250" },
  { id: 4, nombre: "Vintage Gray", imagen: "/placeholder.svg?height=300&width=250" },
  { id: 5, nombre: "Modern Navy", imagen: "/placeholder.svg?height=300&width=250" },
  { id: 6, nombre: "Bold Red", imagen: "/placeholder.svg?height=300&width=250" },
  { id: 7, nombre: "Cool Blue", imagen: "/placeholder.svg?height=300&width=250" },
  { id: 8, nombre: "Fresh Yellow", imagen: "/placeholder.svg?height=300&width=250" },
  { id: 9, nombre: "Deep Purple", imagen: "/placeholder.svg?height=300&width=250" },
]

export function GaleriaCamisetas() {
  const [animacionVisible, setAnimacionVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimacionVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    const elemento = document.getElementById("galeria")
    if (elemento) {
      observer.observe(elemento)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="galeria" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-16 transition-all duration-1000 ${animacionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Colección Exclusiva</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Descubrí nuestra selección de remeras premium con diseños únicos y calidad superior
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {camisetas.map((camiseta, index) => (
            <div
              key={camiseta.id}
              className={`group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${
                animacionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="relative overflow-hidden">
                <Image
                  src={camiseta.imagen || "/placeholder.svg"}
                  alt={camiseta.nombre}
                  width={250}
                  height={300}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  #{camiseta.id.toString().padStart(3, "0")}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                  {camiseta.nombre}
                </h3>
                <p className="text-gray-600 text-sm">Diseño exclusivo de edición limitada</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
