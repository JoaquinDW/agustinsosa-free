import { type NextRequest, NextResponse } from "next/server";
import {
  obtenerConfiguracionTransferencia,
  actualizarConfiguracionTransferencia,
} from "@/lib/database";
import { requireAdminRequest } from "@/lib/admin-api";

export async function GET() {
  try {
    const config = await obtenerConfiguracionTransferencia();
    return NextResponse.json(config, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error obteniendo configuración de transferencia:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true });
  if (unauthorized) return unauthorized;

  try {
    const { argentina, paraguay, avisoTitulo, avisoTexto } =
      await request.json();

    if (
      !argentina?.identificador?.trim() ||
      !argentina?.titular?.trim() ||
      !argentina?.etiqueta?.trim()
    ) {
      return NextResponse.json(
        { error: "La cuenta argentina debe estar completa" },
        { status: 400 },
      );
    }

    const paraguayTieneDatos = Boolean(
      paraguay?.banco?.trim() ||
        paraguay?.identificador?.trim() ||
        paraguay?.titular?.trim(),
    );
    if (
      paraguayTieneDatos &&
      (!paraguay?.identificador?.trim() ||
        !paraguay?.titular?.trim() ||
        !paraguay?.etiqueta?.trim())
    ) {
      return NextResponse.json(
        { error: "Completá todos los datos de la cuenta paraguaya" },
        { status: 400 },
      );
    }

    if (!avisoTitulo || !avisoTexto) {
      return NextResponse.json(
        { error: "El título y el texto del aviso son requeridos" },
        { status: 400 },
      );
    }

    const ok = await actualizarConfiguracionTransferencia({
      argentina: {
        banco: argentina.banco?.trim() || "",
        etiqueta: argentina.etiqueta.trim(),
        identificador: argentina.identificador.trim(),
        titular: argentina.titular.trim(),
      },
      paraguay: {
        banco: paraguay?.banco?.trim() || "",
        etiqueta: paraguay?.etiqueta?.trim() || "Número de cuenta",
        identificador: paraguay?.identificador?.trim() || "",
        titular: paraguay?.titular?.trim() || "",
      },
      avisoTitulo: avisoTitulo.trim(),
      avisoTexto: avisoTexto.trim(),
    });

    if (!ok) {
      return NextResponse.json(
        { error: "Error al guardar la configuración" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error actualizando configuración de transferencia:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
