import { type NextRequest, NextResponse } from "next/server"
import { enviarEmailConfirmacion, type EmailData } from "@/lib/email"
import { requireAdminRequest } from "@/lib/admin-api"

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized

  try {
    const emailData: EmailData = await request.json()

    const resultado = await enviarEmailConfirmacion(emailData)

    if (resultado.success) {
      return NextResponse.json({ success: true, message: "Email enviado correctamente" })
    } else {
      return NextResponse.json({ success: false, error: "Error enviando email" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error en API de email:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
