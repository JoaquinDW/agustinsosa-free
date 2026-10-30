import { notFound } from "next/navigation"

// Mercado Pago deshabilitado permanentemente. Página de retorno oculta.
export default function PagoDeshabilitadoPage() {
  notFound()
}

// Implementación anterior deshabilitada:
// "use client"
//
// import { useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { XCircle, Home, RefreshCw } from "lucide-react"
// import Link from "next/link"
//
// export default function PagoErrorPage() {
//   useEffect(() => {
//     // Limpiar localStorage ya que el pago falló
//     localStorage.removeItem("sorteo_compra_pendiente")
//   }, [])
//
//   return (
//     <div className="min-h-screen bg-dark-gradient flex items-center justify-center">
//       <Card className="w-full max-w-md mx-4">
//         <CardHeader className="text-center">
//           <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
//           <CardTitle className="text-red-600">Pago no completado</CardTitle>
//         </CardHeader>
//         <CardContent className="text-center space-y-4">
//           <p className="text-gray-600">
//             Tu pago no pudo ser procesado. Esto puede deberse a:
//           </p>
//           <ul className="text-sm text-gray-500 text-left space-y-1">
//             <li>• Fondos insuficientes</li>
//             <li>• Problema con la tarjeta</li>
//             <li>• Pago cancelado por el usuario</li>
//             <li>• Error temporal del sistema</li>
//           </ul>
//
//           <div className="pt-4 space-y-3">
//             <Link href="/">
//               <Button className="w-full">
//                 <RefreshCw className="w-4 h-4 mr-2" />
//                 Intentar nuevamente
//               </Button>
//             </Link>
//             <Link href="/">
//               <Button variant="outline" className="w-full">
//                 <Home className="w-4 h-4 mr-2" />
//                 Volver al inicio
//               </Button>
//             </Link>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }
