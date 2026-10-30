import { NextResponse } from "next/server"

// Contraseña de "modo dueño": desbloquea el desglose de costos y la config de
// margen de WhatsApp. Es DISTINTA de la contraseña de admin (que también tiene
// el cliente). Vive solo en una env var del servidor.
const OWNER_PASSWORD = process.env.OWNER_PASSWORD

export async function POST(request: Request) {
  try {
    if (!OWNER_PASSWORD) {
      return NextResponse.json(
        { ok: false, error: "Modo dueño no configurado en el servidor" },
        { status: 500 },
      )
    }

    const { password } = await request.json()

    if (password === OWNER_PASSWORD) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 })
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400 })
  }
}
