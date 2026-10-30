import { type NextRequest, NextResponse } from "next/server";
import { crearNuevoSorteo } from "@/lib/database";
import { requireAdminRequest } from "@/lib/admin-api";

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true });
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const {
      nombre,
      totalChances,
      precio6,
      precio12,
      precio24,
      precioPack1Pyg,
      precioPack2Pyg,
      precioPack3Pyg,
      fechaSorteo,
      cantidadPack1,
      cantidadPack2,
      cantidadPack3,
      descripcionPack1,
      descripcionPack2,
      descripcionPack3,
      cantidadPack4,
      precio4,
      precioPack4Pyg,
      descripcionPack4,
      pack4Visible,
      cantidadPack5,
      precio5,
      precioPack5Pyg,
      descripcionPack5,
      pack5Visible,
    } = body;

    if (
      !nombre ||
      !totalChances ||
      !precio6 ||
      !precio12 ||
      !precio24 ||
      !precioPack1Pyg ||
      !precioPack2Pyg ||
      !precioPack3Pyg
    ) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 },
      );
    }

    const nuevoSorteo = await crearNuevoSorteo(
      nombre,
      totalChances,
      precio6,
      precio12,
      precio24,
      fechaSorteo,
      cantidadPack1,
      cantidadPack2,
      cantidadPack3,
      descripcionPack1,
      descripcionPack2,
      descripcionPack3,
      undefined,
      undefined,
      cantidadPack4,
      precio4,
      descripcionPack4,
      pack4Visible,
      cantidadPack5,
      precio5,
      descripcionPack5,
      pack5Visible,
      precioPack1Pyg,
      precioPack2Pyg,
      precioPack3Pyg,
      precioPack4Pyg,
      precioPack5Pyg,
    );

    if (!nuevoSorteo) {
      return NextResponse.json(
        { error: "Error creando sorteo" },
        { status: 500 },
      );
    }

    return NextResponse.json({ sorteo: nuevoSorteo });
  } catch (error) {
    console.error("Error en API crear-sorteo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
