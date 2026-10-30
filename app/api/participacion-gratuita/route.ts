import { type NextRequest, NextResponse } from "next/server"
import {
  buscarParticipacionGratuitaDuplicada,
  crearCompradorGratuito,
  generarNumerosUnicos,
  obtenerSorteoActivo,
} from "@/lib/database"
import { verificarNumerosUnicos } from "@/lib/verificarNumerosUnicos"
import { enviarEmailConfirmacion } from "@/lib/email"
import { requirePublishedSite } from "@/lib/site-visibility"
import { normalizarTelefono } from "@/lib/whatsapp/normalizar"
import { limpiarOrigen, registrarLead } from "@/lib/leads"
import {
  CUENTAS_INSTAGRAM,
  MAX_BYTES_CAPTURA,
  TIPOS_CAPTURA,
  normalizarInstagram,
} from "@/lib/consentimientos"
import { uploadToSupabase } from "@/lib/supabase-storage"

export async function POST(request: NextRequest) {
  const unpublished = await requirePublishedSite(request)
  if (unpublished) return unpublished

  try {
    // multipart/form-data: datos + una captura por cuenta de Instagram.
    const formData = await request.formData()
    const nombre = String(formData.get("nombre") || "")
    const email = String(formData.get("email") || "")
    const telefono = String(formData.get("telefono") || "")
    const instagram = normalizarInstagram(String(formData.get("instagram") || ""))
    const aceptaEmail = formData.get("aceptaEmail") === "true"
    const aceptaWhatsapp = formData.get("aceptaWhatsapp") === "true"
    let origen: unknown = null
    try {
      origen = JSON.parse(String(formData.get("origen") || "null"))
    } catch {
      origen = null
    }

    // Validar campos de contacto obligatorios
    if (!nombre?.trim() || !email?.trim() || !telefono?.trim()) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (nombre, email y teléfono)." },
        { status: 400 }
      )
    }
    // Se guarda normalizado (549… / 595…) para detectar el mismo número
    // escrito de distintas formas.
    const telefonoNormalizado = normalizarTelefono(telefono)
    if (!telefonoNormalizado) {
      return NextResponse.json({ error: "Ingresá un número de teléfono válido." }, { status: 400 })
    }
    if (!instagram) {
      return NextResponse.json(
        { error: "Ingresá tu usuario de Instagram (por ejemplo @tuusuario)." },
        { status: 400 }
      )
    }

    // Capturas de que sigue a las cuentas de Instagram (obligatorias)
    const capturas: { cuenta: string; archivo: File; extension: string }[] = []
    for (const cuenta of CUENTAS_INSTAGRAM) {
      const archivo = formData.get(`captura_${cuenta.id}`)
      if (!(archivo instanceof File) || archivo.size === 0) {
        return NextResponse.json(
          { error: `Falta la captura de que seguís a @${cuenta.id} en Instagram.` },
          { status: 400 }
        )
      }
      const extension = TIPOS_CAPTURA[archivo.type]
      if (!extension || archivo.size > MAX_BYTES_CAPTURA) {
        return NextResponse.json(
          { error: "Las capturas deben ser imágenes (JPG, PNG, WebP o HEIC) de hasta 5 MB." },
          { status: 400 }
        )
      }
      capturas.push({ cuenta: cuenta.id, archivo, extension })
    }

    const emailNormalizado = email.trim().toLowerCase()

    // Obtener el sorteo vigente
    const sorteo = await obtenerSorteoActivo()
    if (!sorteo) {
      return NextResponse.json({ error: "No hay un sorteo disponible." }, { status: 404 })
    }

    // Si el sorteo ya no admite participantes, no quedan números para asignar
    if (sorteo.estado !== "activo") {
      return NextResponse.json(
        {
          error:
            "Este sorteo ya no está disponible para participar. ¡Atento a la próxima promoción!",
        },
        { status: 409 }
      )
    }

    // Límite: una participación por email, teléfono y usuario de Instagram por sorteo
    // Si la consulta falla, se sigue: los índices únicos de la base rechazan
    // igual el duplicado al insertar.
    const duplicado = await buscarParticipacionGratuitaDuplicada(sorteo.id, {
      email: emailNormalizado,
      telefono: telefonoNormalizado,
      instagram,
    }).catch((errorDuplicado) => {
      console.error("Error buscando participación duplicada:", errorDuplicado)
      return null
    })
    if (duplicado) {
      const dato = {
        email: "este email",
        telefono: "este número de WhatsApp",
        instagram: "este usuario de Instagram",
      }[duplicado]
      return NextResponse.json(
        { error: `Ya hay una participación en este sorteo con ${dato}. Solo se permite una por persona.` },
        { status: 409 }
      )
    }

    // Subir las capturas al bucket privado antes de asignar el número
    const capturasInstagram: Record<string, string> = {}
    try {
      const base = `instagram/${sorteo.id}/${Date.now()}-${crypto.randomUUID()}`
      for (const captura of capturas) {
        capturasInstagram[captura.cuenta] = await uploadToSupabase(
          captura.archivo,
          "comprobantes",
          `${base}-${captura.cuenta}.${captura.extension}`
        )
      }
    } catch (uploadError) {
      console.error("Error subiendo capturas de Instagram:", uploadError)
      return NextResponse.json(
        { error: "No se pudieron subir las capturas. Intentá nuevamente." },
        { status: 500 }
      )
    }

    // Generar 1 número único del mismo pool del sorteo
    const numerosAsignados = await generarNumerosUnicos(sorteo.id, 1)

    if (!numerosAsignados || numerosAsignados.length < 1) {
      return NextResponse.json(
        { error: "No hay números disponibles en este momento." },
        { status: 409 }
      )
    }

    // Validación post-generación: asegurar que no haya duplicados
    const verificacion = await verificarNumerosUnicos(sorteo.id, numerosAsignados)
    if (verificacion.duplicados) {
      console.error("❌ DUPLICADOS DETECTADOS en participacion-gratuita:", {
        sorteoId: sorteo.id,
        numerosGenerados: numerosAsignados,
        conflictos: verificacion.numerosConflicto,
        mensaje: verificacion.mensaje,
      })
      return NextResponse.json(
        {
          error: "Error generando tu número. Por favor, intentá nuevamente.",
          detalles:
            process.env.NODE_ENV === "development" ? verificacion.mensaje : undefined,
        },
        { status: 500 }
      )
    }

    // Crear el participante gratuito
    const nuevoComprador = await crearCompradorGratuito({
      sorteoId: sorteo.id,
      nombre: nombre.trim(),
      email: emailNormalizado,
      telefono: telefonoNormalizado,
      numerosAsignados,
      datosEncuesta: { instagram, capturas_instagram: capturasInstagram },
    })

    // Si otra participación con los mismos datos entró a la vez, el índice
    // único de la base rechaza esta.
    if (!nuevoComprador) {
      return NextResponse.json(
        { error: "No se pudo registrar tu participación. Si ya participaste, solo se permite una por persona." },
        { status: 500 }
      )
    }

    // Guardar el contacto para promociones del sitio principal. Si falla, la
    // participación ya quedó registrada: no se le devuelve error al usuario.
    try {
      await registrarLead({
        nombre: nombre.trim(),
        email: emailNormalizado,
        telefono: telefonoNormalizado,
        instagram,
        pais: telefonoNormalizado?.startsWith("595") ? "PY" : "AR",
        aceptaEmail: aceptaEmail === true,
        aceptaWhatsapp: aceptaWhatsapp === true,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        origen: limpiarOrigen(origen),
        sorteoId: sorteo.id,
      })
    } catch (leadError) {
      console.error("Error registrando lead:", leadError)
    }

    // Enviar email de confirmación directamente (no fallar la operación si el email falla).
    // Se llama a la función en vez de hacer fetch a /api/send-email para garantizar que
    // se use el template gratuito de ESTE entorno (evita pegarle a un deploy con código viejo).
    try {
      await enviarEmailConfirmacion({
        nombre: nombre.trim(),
        email: emailNormalizado,
        cantidadChances: 1,
        numerosAsignados,
        precioPagado: 0,
        sorteoNombre: sorteo.nombre,
        sorteoImagenUrl: sorteo.carousel_image_1 || sorteo.imagen_url || undefined,
        // Sin compradorId a propósito: no hay contenido digital para participaciones gratuitas.
        esGratuito: true,
      })
    } catch (emailError) {
      console.error("Error enviando email de participación gratuita:", emailError)
    }

    return NextResponse.json({
      success: true,
      numeroAsignado: numerosAsignados[0],
      compradorId: nuevoComprador.id,
    })
  } catch (error) {
    console.error("Error en participación gratuita:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
