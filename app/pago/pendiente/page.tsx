import { notFound } from "next/navigation"

// Mercado Pago deshabilitado permanentemente. Página de retorno oculta.
export default function PagoDeshabilitadoPage() {
  notFound()
}

// Implementación anterior deshabilitada:
// "use client"
//
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Clock, Home, RefreshCw } from "lucide-react"
// import Link from "next/link"
//
// export default function PagoPendientePage() {
//   return (
//     <div className="min-h-screen bg-dark-gradient flex items-center justify-center">
//       <Card className="w-full max-w-md mx-4">
//         <CardHeader className="text-center">
//           <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
//           <CardTitle className="text-yellow-600">Pago pendiente</CardTitle>
//         </CardHeader>
//         <CardContent className="text-center space-y-4">
//           <p className="text-gray-600">
//             Tu pago está siendo procesado. Esto puede tomar unos minutos.
//           </p>
//
//           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
//             <p className="text-yellow-800 text-sm">
//               <strong>¿Qué hacer?</strong>
//               <br />
//               Recibirás un email de confirmación una vez que se apruebe el pago.
//               También puedes revisar el estado en tu cuenta de MercadoPago.
//             </p>
//           </div>
//
//           <div className="pt-4 space-y-3">
//             <Link href="/pago/exito">
//               <Button className="w-full">
//                 <RefreshCw className="w-4 h-4 mr-2" />
//                 Verificar estado del pago
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
