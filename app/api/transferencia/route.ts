import { type NextRequest, NextResponse } from "next/server";
import { uploadToSupabase } from "@/lib/supabase-storage";
import { crearCompradorTransferencia, obtenerEstadisticasSorteo, obtenerPromoPorCodigo, obtenerSorteo } from "@/lib/database";
import { MAX_CHANCES_PERSONALIZADAS } from "@/lib/precios-transferencia";
import { MENSAJES_PROMO, validarCodigo } from "@/lib/promos";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePublishedSite } from "@/lib/site-visibility";
import type { PaisTransferencia } from "@/lib/supabase";
import { normalizarTelefono } from "@/lib/whatsapp/normalizar";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sitio de sorteos gratis: no se venden chances. La única forma de participar
// es /api/participacion-gratuita. El flujo de compra queda abajo, sin exportar.
export async function POST() {
  return NextResponse.json(
    { error: "Este sitio no acepta compras." },
    { status: 410 },
  );
}

async function crearCompraPorTransferencia(request: NextRequest) {
  const unpublished = await requirePublishedSite(request);
  if (unpublished) return unpublished;

  try {
    const formData = await request.formData();

    const nombre = ((formData.get("nombre") as string) || "").trim();
    const email = ((formData.get("email") as string) || "").trim().toLowerCase();
    const telefono = ((formData.get("telefono") as string) || "").trim();
    const sorteoId = formData.get("sorteoId") as string;
    const cantidadChances = Number(formData.get("cantidadChances"));
    const paisTransferencia = formData.get(
      "paisTransferencia",
    ) as PaisTransferencia;
    const comprobanteFile = formData.get("comprobante") as File;
    const promoCodigo = String(formData.get("promoCodigo") || "").trim();

    // Validar datos requeridos
    if (
      !nombre ||
      !sorteoId ||
      !cantidadChances ||
      !["AR", "PY"].includes(paisTransferencia) ||
      !(comprobanteFile instanceof File) ||
      comprobanteFile.size === 0
    ) {
      return NextResponse.json(
        { error: "Faltan datos requeridos" },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(cantidadChances) ||
      cantidadChances < 1 ||
      cantidadChances > MAX_CHANCES_PERSONALIZADAS
    ) {
      return NextResponse.json(
        {
          error: `La cantidad de chances debe estar entre 1 y ${MAX_CHANCES_PERSONALIZADAS}`,
        },
        { status: 400 },
      );
    }

    const sorteoCompra = await obtenerSorteo(sorteoId);
    if (
      !sorteoCompra ||
      ["completo", "sorteado", "cerrado"].includes(sorteoCompra.estado)
    ) {
      return NextResponse.json({ error: "Sorteo no disponible" }, { status: 400 });
    }
    const { chancesVendidas } = await obtenerEstadisticasSorteo(sorteoId);
    const chancesRestantes = sorteoCompra.total_chances - chancesVendidas;
    if (sorteoCompra.total_chances > 0 && cantidadChances > chancesRestantes) {
      return NextResponse.json(
        {
          error:
            chancesRestantes > 0
              ? `Solo quedan ${chancesRestantes} chances disponibles`
              : "No quedan chances disponibles",
        },
        { status: 400 },
      );
    }

    const allowedProofTypes: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "application/pdf": "pdf",
    };
    const extension = allowedProofTypes[comprobanteFile.type];
    if (!extension || comprobanteFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error:
            "El comprobante debe ser JPG, PNG, WebP o PDF y pesar hasta 5 MB",
        },
        { status: 400 },
      );
    }

    // Email y WhatsApp son obligatorios: los números se envían por ambos.
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (!normalizarTelefono(telefono, paisTransferencia)) {
      return NextResponse.json(
        { error: "Número de WhatsApp inválido" },
        { status: 400 },
      );
    }

    let promo: { codigoId: string; porcentaje: number; unico: boolean } | undefined;
    if (promoCodigo) {
      if (sorteoCompra.estado !== "activo") return NextResponse.json({ error: "Sorteo no disponible" }, { status: 400 });
      const codigo = await obtenerPromoPorCodigo(promoCodigo);
      const validez = validarCodigo(codigo, codigo?.campania || null, new Date(), sorteoId, cantidadChances);
      if (!validez.ok) return NextResponse.json({ error: MENSAJES_PROMO[validez.motivo] }, { status: 400 });
      promo = { codigoId: codigo!.id, porcentaje: codigo!.campania.porcentaje, unico: codigo!.campania.usos === "unico" };
      if (codigo!.campania.usos === "unico") {
        const { data: pendiente } = await supabaseAdmin.from("compradores").select("id").eq("promo_codigo_id", codigo!.id).eq("estado_pago", "pendiente").eq("metodo_pago", "transferencia").limit(1);
        if (pendiente?.length) return NextResponse.json({ error: "Este código ya tiene una transferencia pendiente" }, { status: 400 });
      }
    }

    const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const comprobanteUrl = await uploadToSupabase(
      comprobanteFile,
      "comprobantes",
      filename,
    );

    // Crear registro pendiente de aprobación
    const nuevoComprador = await crearCompradorTransferencia({
      sorteoId,
      nombre,
      email,
      telefono,
      cantidadChances: cantidadChances,
      comprobanteUrl,
      paisTransferencia,
      promo,
    });

    if (!nuevoComprador) {
      return NextResponse.json(
        { error: "Error creando comprador" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      compradorId: nuevoComprador.id,
      message:
        "Comprobante enviado correctamente. Recibirás una confirmación cuando revisemos tu pago.",
    });
  } catch (error) {
    console.error("Error procesando transferencia:", error);
    if (error instanceof Error && error.message === "Este código ya tiene una transferencia pendiente") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
