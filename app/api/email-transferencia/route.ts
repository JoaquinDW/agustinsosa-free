import { NextRequest, NextResponse } from "next/server";
import {
  enviarEmailTransferenciaAprobada,
  enviarEmailTransferenciaRechazada,
  TransferenciaAprobadaData,
  TransferenciaRechazadaData,
} from "@/lib/email";
import { requireAdminRequest } from "@/lib/admin-api";

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true });
  if (unauthorized) return unauthorized;

  try {
    const { tipo, data } = await request.json();

    console.log("📨 Email API received request:", { tipo });
    console.log("📨 Email data received:", JSON.stringify(data, null, 2));

    if (!tipo || !data) {
      console.error("❌ Missing required parameters in email API");
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 },
      );
    }

    let resultado;

    if (tipo === "aprobada") {
      const transferenciaData: TransferenciaAprobadaData = {
        nombre: data.nombre,
        email: data.email,
        cantidadChances: data.cantidadChances,
        numerosAsignados: data.numerosAsignados,
        precioPagado: data.precioPagado,
        moneda: data.moneda,
        nombreSorteo: data.nombreSorteo || "T-SHIRT SORTEO EXCLUSIVO",
        sorteoImagenUrl: data.sorteoImagenUrl,
        compradorId: data.compradorId,
      };
      console.log(
        "📧 Final email data being sent:",
        JSON.stringify(transferenciaData, null, 2),
      );
      resultado = await enviarEmailTransferenciaAprobada(transferenciaData);
    } else if (tipo === "rechazada") {
      const transferenciaData: TransferenciaRechazadaData = {
        nombre: data.nombre,
        email: data.email,
        cantidadChances: data.cantidadChances,
        precioPagado: data.precioPagado,
        moneda: data.moneda,
        nombreSorteo: data.nombreSorteo || "T-SHIRT SORTEO EXCLUSIVO",
        motivo: data.motivo,
      };
      resultado = await enviarEmailTransferenciaRechazada(transferenciaData);
    } else {
      return NextResponse.json(
        { error: "Tipo de email no válido" },
        { status: 400 },
      );
    }

    if (!resultado.success) {
      return NextResponse.json(
        { error: "Error enviando email", details: resultado.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      mensaje: `Email de transferencia ${tipo} enviado correctamente`,
      data: resultado.data,
    });
  } catch (error) {
    console.error("Error en API de email transferencia:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
