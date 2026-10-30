"use client"

// Componente anterior deshabilitado: únicamente transferencia mediante CompraModalNuevo.
export function CompraModal() {
  return null
}

// Implementación anterior de Mercado Pago comentada:
// "use client"
//
// import { useState } from "react"
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { ArrowLeft, CreditCard, ShoppingCart } from "lucide-react"
// import { MetodoPagoSelector } from "./metodo-pago-selector"
// import { TransferenciaModal } from "./transferencia-modal"
//
// interface CompraModalProps {
//   isOpen: boolean
//   onClose: () => void
//   pack: { chances: number; precio: number } | null
//   onCompraMercadoPago: (nombre: string, email: string, telefono: string) => void
//   onCompraTransferencia: (data: {
//     nombre: string
//     email: string
//     telefono: string
//     comprobanteFile: File
//   }) => void
// }
//
// export function CompraModal({
//   isOpen,
//   onClose,
//   pack,
//   onCompraMercadoPago,
//   onCompraTransferencia,
// }: CompraModalProps) {
//   const [paso, setPaso] = useState<"metodo" | "datos-mp" | "transferencia">(
//     "metodo"
//   )
//   const [nombre, setNombre] = useState("")
//   const [email, setEmail] = useState("")
//   const [telefono, setTelefono] = useState("")
//   const [loading, setLoading] = useState(false)
//
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (!nombre.trim() || !email.trim() || !telefono.trim() || !pack) return
//
//     setLoading(true)
//     // let response = await fetch(
//     //   "https://api.mercadopago.com/checkout/preferences",
//     //   {
//     //     method: "POST",
//     //     headers: {
//     //       Authorization:
//     //         "Bearer TEST-6367813546576106-080216-3423d6550a5e42863d0d063cca53891f-389442168",
//     //     },
//     //     body: JSON.stringify({
//     //       items: [
//     //         {
//     //           title: `Sorteo de remeras - ${pack.chances} chances`,
//     //           unit_price: pack.precio,
//     //           quantity: 1,
//     //         },
//     //       ],
//     //     }),
//     //   }
//     // )
//     // let data = await response.json()
//     // console.log(data)
//     // window.open(data.init_point, "_blank")
//
//     // Este componente ya no se usa - se reemplazó por CompraModalNuevo
//     // El código se mantiene por referencia histórica
//     try {
//       // onCompra(nombre.trim(), email.trim(), telefono.trim())
//       console.log("CompraModal legacy - no implementado")
//
//       // Reset form
//       setNombre("")
//       setEmail("")
//       setTelefono("")
//     } catch (error) {
//       console.error("Error en la compra:", error)
//       alert("Error al procesar la compra. Intenta nuevamente.")
//     } finally {
//       setLoading(false)
//     }
//   }
//
//   if (!pack) return null
//
//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader>
//           <DialogTitle className="flex items-center gap-2 text-xl">
//             <ShoppingCart className="h-5 w-5 text-green-600" />
//             Finalizar Compra
//           </DialogTitle>
//         </DialogHeader>
//
//         <div className="space-y-6">
//           {/* Resumen del pack */}
//           <div className="bg-green-50 rounded-lg p-4 border border-green-200">
//             <div className="flex justify-between items-center mb-2">
//               <span className="font-semibold text-gray-900">
//                 Pack seleccionado:
//               </span>
//               <span className="text-green-600 font-bold">
//                 {pack.chances} chances
//               </span>
//             </div>
//             <div className="flex justify-between items-center">
//               <span className="text-gray-600">Total a pagar:</span>
//               <span className="text-2xl font-bold text-green-600">
//                 ${pack.precio.toLocaleString()}
//               </span>
//             </div>
//           </div>
//
//           {/* Formulario */}
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="space-y-2">
//               <Label htmlFor="nombre">Nombre completo *</Label>
//               <Input
//                 id="nombre"
//                 type="text"
//                 placeholder="Ingresá tu nombre completo"
//                 value={nombre}
//                 onChange={(e) => setNombre(e.target.value)}
//                 required
//                 className="h-12"
//               />
//             </div>
//
//             <div className="space-y-2">
//               <Label htmlFor="email">Email *</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="tu@email.com"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//                 className="h-12"
//               />
//             </div>
//
//             <div className="space-y-2">
//               <Label htmlFor="telefono">Número de celular *</Label>
//               <Input
//                 id="telefono"
//                 type="tel"
//                 placeholder="Ej: +54 9 11 1234-5678"
//                 value={telefono}
//                 onChange={(e) => setTelefono(e.target.value)}
//                 required
//                 className="h-12"
//               />
//             </div>
//
//             <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
//               <div className="flex items-start gap-3">
//                 <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
//                 <div className="text-sm text-blue-800">
//                   <p className="font-semibold mb-1">Proceso de pago:</p>
//                   <p>
//                     Después de completar este formulario, serás redirigido a
//                     MercadoPago para realizar el pago de forma segura.
//                   </p>
//                 </div>
//               </div>
//             </div>
//
//             <div className="flex gap-3 pt-4">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={onClose}
//                 className="flex-1 bg-transparent"
//                 disabled={loading}
//               >
//                 Cancelar
//               </Button>
//               <Button
//                 type="submit"
//                 className="flex-1 bg-green-600 hover:bg-green-700"
//                 disabled={
//                   loading || !nombre.trim() || !email.trim() || !telefono.trim()
//                 }
//               >
//                 {loading ? (
//                   <div className="flex items-center gap-2">
//                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                     Procesando...
//                   </div>
//                 ) : (
//                   <>
//                     <CreditCard className="w-4 h-4 mr-2" />
//                     Ir a pagar
//                   </>
//                 )}
//               </Button>
//             </div>
//           </form>
//         </div>
//       </DialogContent>
//     </Dialog>
//   )
// }
