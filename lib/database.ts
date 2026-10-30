import { supabase } from "./supabase";
import type {
  Comprador,
  Sorteo,
  GanadorExpress,
  ConfiguracionTransferencia,
  PaisTransferencia,
} from "./supabase";
import { callAdminDatabase } from "./admin-database-client";
import { obtenerPrecioTransferencia } from "./precios-transferencia";
import { generarCodigoPromo, type CampaniaPromo, type CodigoPromo } from "./promos";
import { precioConPromo } from "./promos";
import { normalizarTelefono } from "./whatsapp/normalizar";
import { anonimizarNombreRanking, LIMITE_RANKING_PUBLICO } from "./ranking-publico";
import { PREMIOS_RANKING_VACIOS, validarPremiosRanking, type PremioRanking, type ResultadoRanking } from "./ranking-premios";

export interface FilaRanking {
  persona_key: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  pais_transferencia: PaisTransferencia | null;
  chances: number;
  compras: number;
  ultima_compra: string;
  ultimo_envio_promo?: string | null;
}

const clavePremiosRanking = (sorteoId: string) => `ranking_premios_${sorteoId}`;
const claveResultadoRanking = (sorteoId: string) => `ranking_resultado_${sorteoId}`;

export async function obtenerPremiosRanking(sorteoId: string): Promise<PremioRanking[]> {
  if (typeof window !== "undefined") return callAdminDatabase<PremioRanking[]>("obtenerPremiosRanking", [sorteoId]);
  const { data, error } = await supabase.from("configuracion").select("valor").eq("clave", clavePremiosRanking(sorteoId)).maybeSingle();
  if (error) throw error;
  return data ? validarPremiosRanking(JSON.parse(data.valor)) : PREMIOS_RANKING_VACIOS;
}

export async function actualizarPremiosRanking(sorteoId: string, premios: PremioRanking[]): Promise<boolean> {
  if (typeof window !== "undefined") return callAdminDatabase<boolean>("actualizarPremiosRanking", [sorteoId, premios]);
  const sorteo = await obtenerSorteo(sorteoId);
  if (!sorteo || sorteo.estado !== "activo") throw new Error("Solo se pueden editar premios de un sorteo activo");
  const valor = JSON.stringify(validarPremiosRanking(premios));
  const { error } = await supabase.from("configuracion").upsert({ clave: clavePremiosRanking(sorteoId), valor, updated_at: new Date().toISOString() });
  if (error) throw error;
  return true;
}

export async function obtenerResultadoRanking(sorteoId: string): Promise<ResultadoRanking[]> {
  if (typeof window !== "undefined") return callAdminDatabase<ResultadoRanking[]>("obtenerResultadoRanking", [sorteoId]);
  const { data, error } = await supabase.from("configuracion").select("valor").eq("clave", claveResultadoRanking(sorteoId)).maybeSingle();
  if (error) throw error;
  return data ? JSON.parse(data.valor) as ResultadoRanking[] : [];
}

export async function guardarResultadoRanking(sorteoId: string): Promise<void> {
  const [ranking, premios] = await Promise.all([obtenerRankingSorteo(sorteoId, LIMITE_RANKING_PUBLICO), obtenerPremiosRanking(sorteoId)]);
  const resultado: ResultadoRanking[] = ranking.map((fila, indice) => ({
    ...(premios[indice] ?? { puesto: indice + 1, titulo: "", descripcion: "", imagenUrl: "", montoGuaranies: "" }),
    personaKey: fila.persona_key, nombre: fila.nombre,
    nombrePublico: anonimizarNombreRanking(fila.nombre), email: fila.email, telefono: fila.telefono, chances: fila.chances,
  }));
  const { error } = await supabase.from("configuracion").upsert({
    clave: claveResultadoRanking(sorteoId), valor: JSON.stringify(resultado), updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export interface PromoConCampania extends CodigoPromo {
  nombre: string | null;
  telefono: string | null;
  campania: CampaniaPromo & { id: string };
}

export async function obtenerRankingSorteo(sorteoId: string, limite?: number): Promise<FilaRanking[]> {
  if (typeof window !== "undefined") throw new Error("El ranking completo solo está disponible en servidor");
  const filas: FilaRanking[] = [];
  const tamano = limite ?? 1000;
  for (let desde = 0;; desde += tamano) {
    const { data, error } = await supabase.rpc("obtener_ranking_sorteo", {
      p_sorteo_id: sorteoId, p_limite: limite ?? null,
    }).order("chances", { ascending: false }).order("ultima_compra", { ascending: true }).order("persona_key", { ascending: true }).range(desde, desde + tamano - 1);
    if (error) throw error;
    filas.push(...(data || []).map((fila: FilaRanking) => ({ ...fila, chances: Number(fila.chances), compras: Number(fila.compras) })));
    if (limite || !data || data.length < tamano) break;
  }
  return filas;
}

export async function obtenerRankingAdmin(sorteoId: string): Promise<FilaRanking[]> {
  if (typeof window !== "undefined") return callAdminDatabase<FilaRanking[]>("obtenerRankingAdmin", [sorteoId]);
  const ranking = await obtenerRankingSorteo(sorteoId);
  const ultimo = new Map<string, string>();
  for (let desde = 0;; desde += 1000) {
    const { data, error } = await supabase.rpc("obtener_ultimo_envio_promo", { p_sorteo_id: sorteoId }).order("persona_key", { ascending: true }).range(desde, desde + 999);
    if (error) throw error;
    for (const envio of data || []) ultimo.set(envio.persona_key, envio.ultimo_envio);
    if (!data || data.length < 1000) break;
  }
  return ranking.map((fila) => ({ ...fila, ultimo_envio_promo: ultimo.get(fila.persona_key) ?? null }));
}

export async function obtenerPromoPorCodigo(codigo: string): Promise<PromoConCampania | null> {
  if (typeof window !== "undefined") throw new Error("La promo solo se consulta en servidor");
  const { data, error } = await supabase.from("promo_codigos")
    .select("id, codigo, campania_id, nombre, telefono, usos_confirmados, campania:promo_campanias!promo_codigos_campania_id_fkey(id, sorteo_id, porcentaje, packs_aplicables, usos, vence_at)")
    .eq("codigo", codigo.trim().toUpperCase()).maybeSingle();
  if (error) throw error;
  return data as unknown as PromoConCampania | null;
}

export async function marcarCodigoUsado(codigoId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("marcar_promo_codigo_usado", { p_codigo_id: codigoId });
  if (error) throw error;
  return Boolean(data);
}

export async function crearCampaniaPromo(input: {
  sorteoId: string;
  porcentaje: number;
  packsAplicables: number[] | null;
  usos: "unico" | "ilimitado";
  venceAt: string;
  destinatarios: string[];
}): Promise<{ campaniaId: string; total: number }> {
  const ranking = await obtenerRankingSorteo(input.sorteoId);
  const seleccionados = ranking.filter((fila) => input.destinatarios.includes(fila.persona_key) && fila.telefono);
  const { data: campania, error } = await supabase.from("promo_campanias").insert({
    sorteo_id: input.sorteoId, porcentaje: input.porcentaje,
    packs_aplicables: input.packsAplicables, usos: input.usos, vence_at: input.venceAt,
  }).select("id").single();
  if (error || !campania) throw error || new Error("No se creó la campaña");
  for (let inicio = 0; inicio < seleccionados.length; inicio += 200) {
    const lote = seleccionados.slice(inicio, inicio + 200);
    let insertado = false;
    for (let intento = 0; intento < 5 && !insertado; intento++) {
      const { error: errorCodigo } = await supabase.from("promo_codigos").upsert(lote.map((fila) => ({
        campania_id: campania.id, codigo: generarCodigoPromo(), persona_key: fila.persona_key,
        nombre: fila.nombre, telefono: fila.telefono, pais: fila.pais_transferencia,
        chances_al_envio: fila.chances,
      })), { onConflict: "campania_id,persona_key", ignoreDuplicates: true });
      if (!errorCodigo) insertado = true;
      else if (errorCodigo.code !== "23505") throw errorCodigo;
    }
    if (!insertado) throw new Error("No se pudo generar un código único");
  }
  return { campaniaId: campania.id, total: seleccionados.length };
}

export interface ReporteCampaniaPromo {
  id: string;
  createdAt: string;
  porcentaje: number;
  venceAt: string;
  total: number;
  enviados: number;
  entregados: number;
  errores: number;
  procesando: number;
  usados: number;
  recaudado: { moneda: string; monto: number }[];
  costoWhatsApp: number;
}

export async function obtenerReporteCampanias(sorteoId: string): Promise<ReporteCampaniaPromo[]> {
  if (typeof window !== "undefined") return callAdminDatabase<ReporteCampaniaPromo[]>("obtenerReporteCampanias", [sorteoId]);
  const campanias: any[] = [];
  for (let desde = 0;; desde += 1000) {
    const { data, error } = await supabase.rpc("obtener_reporte_campanias", { p_sorteo_id: sorteoId }).order("created_at", { ascending: false }).order("id", { ascending: false }).range(desde, desde + 999);
    if (error) throw error;
    campanias.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return campanias.map((campania: any) => ({
    id: campania.id, createdAt: campania.created_at, porcentaje: campania.porcentaje,
    venceAt: campania.vence_at, total: Number(campania.total), enviados: Number(campania.enviados), entregados: Number(campania.entregados),
    errores: Number(campania.errores), procesando: Number(campania.procesando), usados: Number(campania.usados),
    recaudado: campania.recaudado || [], costoWhatsApp: Number(campania.costo_whatsapp),
  }));
}

// Verificar si las tablas existen
export async function verificarTablas(): Promise<boolean> {
  try {
    const { error } = await supabase.from("sorteos").select("id").limit(1);
    return !error;
  } catch (error) {
    console.error("Error verificando tablas:", error);
    return false;
  }
}

// Crear sorteo por defecto si no existe
export async function crearSorteoDefecto(): Promise<Sorteo | null> {
  try {
    const { data, error } = await supabase
      .from("sorteos")
      .insert({
        nombre: "T-SHIRT 150M - SORTEO EXCLUSIVO",
        descripcion: "Sorteo exclusivo de remera premium edición limitada",
        total_chances: 9999,
        cantidad_pack_1: 6,
        cantidad_pack_2: 12,
        cantidad_pack_3: 24,
        precio_6_chances: 21000,
        precio_12_chances: 42000,
        precio_24_chances: 84000,
        precio_pack_1_pyg: 147000,
        precio_pack_2_pyg: 294000,
        precio_pack_3_pyg: 588000,
        fecha_sorteo: "2025-02-15",
        estado: "activo",
        imagen_url: "/placeholder.svg?height=400&width=400&text=Sorteo+Remera",
        titulo_remera: "Remera Exclusiva", // Added default title
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando sorteo por defecto:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error creando sorteo por defecto:", error);
    return null;
  }
}

// Obtener el sorteo activo (más reciente)
export async function obtenerSorteoActivo(): Promise<Sorteo | null> {
  try {
    // Verificar si las tablas existen
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      console.log("Las tablas no existen, usando datos por defecto");
      return {
        id: "default",
        nombre: "T-SHIRT 150M - SORTEO EXCLUSIVO",
        descripcion: "Sorteo exclusivo de remera premium edición limitada",
        total_chances: 9999,
        cantidad_pack_1: 6,
        cantidad_pack_2: 12,
        cantidad_pack_3: 24,
        precio_6_chances: 21000,
        precio_12_chances: 42000,
        precio_24_chances: 84000,
        precio_pack_1_pyg: 147000,
        precio_pack_2_pyg: 294000,
        precio_pack_3_pyg: 588000,
        pack_1_visible: true, // Visibilidad del pack 1
        pack_2_visible: true, // Visibilidad del pack 2
        pack_3_visible: true, // Visibilidad del pack 3
        descripcion_pack_1: "Pack básico",
        descripcion_pack_2: "Pack medio",
        descripcion_pack_3: "Pack completo",
        cantidad_pack_4: 0,
        precio_pack_4: 0,
        precio_pack_4_pyg: 0,
        pack_4_visible: false,
        descripcion_pack_4: "",
        cantidad_pack_5: 0,
        precio_pack_5: 0,
        precio_pack_5_pyg: 0,
        pack_5_visible: false,
        descripcion_pack_5: "",
        fecha_sorteo: "2025-02-15",
        estado: "activo",
        imagen_url: "/placeholder.svg?height=400&width=400&text=Sorteo+Remera",
        titulo_remera: "Remera Exclusiva", // Added default title
        carousel_image_1: null,
        carousel_image_2: null,
        carousel_image_3: null,
        carousel_image_4: null,
        carousel_image_5: null,
        carousel_image_6: null,
        carousel_image_7: null,
        carousel_image_8: null,
        ganador_id: null,
        numero_ganador: null,
        ganador_nombre: null,
        fecha_sorteo_realizado: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Primero intentar obtener un sorteo activo
    const { data: sorteoActivo, error: errorActivo } = await supabase
      .from("sorteos")
      .select("*")
      .eq("estado", "activo")
      .single();

    if (!errorActivo && sorteoActivo) {
      return sorteoActivo;
    }

    // Si no hay sorteo activo, obtener el más reciente
    const { data: sorteoReciente, error: errorReciente } = await supabase
      .from("sorteos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (errorReciente) {
      if (errorReciente.code === "PGRST116") {
        // La web pública nunca crea registros directamente con la clave anon.
        if (typeof window !== "undefined") return null;
        return await crearSorteoDefecto();
      }
      console.error("Error obteniendo sorteo:", errorReciente);
      return null;
    }

    return sorteoReciente;
  } catch (error) {
    console.error("Error obteniendo sorteo:", error);
    return null;
  }
}

// Obtener todos los sorteos (históricos)
export async function obtenerTodosSorteos(): Promise<Sorteo[]> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<Sorteo[]>("obtenerTodosSorteos");
  }
  try {
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return [];
    }

    const { data, error } = await supabase
      .from("sorteos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error obteniendo sorteos:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error obteniendo sorteos:", error);
    return [];
  }
}

// Crear nuevo sorteo (SIN borrar compradores anteriores)
export async function crearNuevoSorteo(
  nombre: string,
  totalChances: number,
  precio6: number,
  precio12: number,
  precio24: number,
  fechaSorteo: string,
  cantidadPack1 = 6,
  cantidadPack2 = 12,
  cantidadPack3 = 24,
  descripcionPack1 = "",
  descripcionPack2 = "",
  descripcionPack3 = "",
  imagenUrl?: string,
  tituloRemera?: string,
  cantidadPack4 = 0,
  precio4 = 0,
  descripcionPack4 = "",
  pack4Visible = false,
  cantidadPack5 = 0,
  precio5 = 0,
  descripcionPack5 = "",
  pack5Visible = false,
  precioPack1Pyg = precio6 * 7,
  precioPack2Pyg = precio12 * 7,
  precioPack3Pyg = precio24 * 7,
  precioPack4Pyg = precio4 * 7,
  precioPack5Pyg = precio5 * 7,
): Promise<Sorteo | null> {
  try {
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return null;
    }

    // CAMBIO IMPORTANTE: Solo cambiar el estado del sorteo activo a "cerrado"
    // NO borramos los compradores
    await cambiarEstadoSorteoActivo("cerrado");

    const { data, error } = await supabase
      .from("sorteos")
      .insert({
        nombre,
        total_chances: totalChances,
        cantidad_pack_1: cantidadPack1,
        cantidad_pack_2: cantidadPack2,
        cantidad_pack_3: cantidadPack3,
        descripcion_pack_1: descripcionPack1,
        descripcion_pack_2: descripcionPack2,
        descripcion_pack_3: descripcionPack3,
        precio_6_chances: precio6,
        precio_12_chances: precio12,
        precio_24_chances: precio24,
        precio_pack_1_pyg: precioPack1Pyg,
        precio_pack_2_pyg: precioPack2Pyg,
        precio_pack_3_pyg: precioPack3Pyg,
        cantidad_pack_4: cantidadPack4,
        precio_pack_4: precio4,
        precio_pack_4_pyg: precioPack4Pyg,
        pack_4_visible: pack4Visible,
        descripcion_pack_4: descripcionPack4,
        cantidad_pack_5: cantidadPack5,
        precio_pack_5: precio5,
        precio_pack_5_pyg: precioPack5Pyg,
        pack_5_visible: pack5Visible,
        descripcion_pack_5: descripcionPack5,
        fecha_sorteo: fechaSorteo,
        estado: "activo",
        imagen_url:
          imagenUrl ||
          "/placeholder.svg?height=400&width=400&text=Sorteo+Remera",
        titulo_remera: tituloRemera || "Remera Exclusiva",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando nuevo sorteo:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error creando nuevo sorteo:", error);
    return null;
  }
}

// Cambiar estado del sorteo activo (nueva función)
export async function cambiarEstadoSorteoActivo(
  nuevoEstado: string,
): Promise<boolean> {
  try {
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    const { error } = await supabase
      .from("sorteos")
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq("estado", "activo");

    if (error) {
      console.error("Error cambiando estado del sorteo activo:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error cambiando estado del sorteo activo:", error);
    return false;
  }
}

// Cerrar sorteo activo (mantener por compatibilidad)
export async function cerrarSorteoActivo(): Promise<boolean> {
  return await cambiarEstadoSorteoActivo("cerrado");
}

// Realizar sorteo (seleccionar ganador)
export async function realizarSorteo(
  sorteoId: string,
): Promise<{ ganador: Comprador; numeroGanador: number } | null> {
  if (typeof window !== "undefined") {
    return callAdminDatabase("realizarSorteo", [sorteoId]);
  }
  try {
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return null;
    }

    // Obtener todos los números vendidos
    const { data: compradores, error: compradoresError } = await supabase
      .from("compradores")
      .select("*")
      .eq("sorteo_id", sorteoId)
      .eq("estado_pago", "pagado");

    if (compradoresError || !compradores || compradores.length === 0) {
      console.error("Error obteniendo compradores:", compradoresError);
      return null;
    }

    // Crear array con todos los números vendidos
    const todosLosNumeros: { numero: number; comprador: Comprador }[] = [];
    compradores.forEach((comprador) => {
      comprador.numeros_asignados.forEach((numero: number) => {
        todosLosNumeros.push({ numero, comprador });
      });
    });

    if (todosLosNumeros.length === 0) {
      return null;
    }

    // Seleccionar número ganador aleatoriamente
    const indiceGanador = Math.floor(Math.random() * todosLosNumeros.length);
    const { numero: numeroGanador, comprador: ganador } =
      todosLosNumeros[indiceGanador];

    // Actualizar sorteo con ganador
    await guardarResultadoRanking(sorteoId);
    const { error: sorteoError } = await supabase
      .from("sorteos")
      .update({
        estado: "sorteado",
        ganador_id: ganador.id,
        numero_ganador: numeroGanador,
        fecha_sorteo_realizado: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sorteoId);

    if (sorteoError) {
      console.error("Error actualizando sorteo:", sorteoError);
      return null;
    }

    // Marcar ganador en tabla compradores
    const { error: ganadorError } = await supabase
      .from("compradores")
      .update({ es_ganador: true })
      .eq("id", ganador.id);

    if (ganadorError) {
      console.error("Error marcando ganador:", ganadorError);
    }

    return { ganador, numeroGanador };
  } catch (error) {
    console.error("Error realizando sorteo:", error);
    return null;
  }
}

// Finalizar sorteo manualmente con ganador ingresado por el admin
export async function finalizarSorteoManual(
  sorteoId: string,
  ganadorNombre: string,
  numeroGanador: number,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("finalizarSorteoManual", [
      sorteoId,
      ganadorNombre,
      numeroGanador,
    ]);
  }
  try {
    await guardarResultadoRanking(sorteoId);
    const { error } = await supabase
      .from("sorteos")
      .update({
        estado: "sorteado",
        ganador_nombre: ganadorNombre,
        numero_ganador: numeroGanador,
        fecha_sorteo_realizado: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sorteoId);

    if (error) {
      console.error("Error finalizando sorteo manualmente:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error finalizando sorteo manualmente:", error);
    return false;
  }
}

// Actualizar imagen del sorteo
export async function actualizarImagenSorteo(
  sorteoId: string,
  imagenUrl: string,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("actualizarImagenSorteo", [
      sorteoId,
      imagenUrl,
    ]);
  }
  try {
    // Si es el sorteo por defecto, no podemos actualizar en Supabase
    if (sorteoId === "default") {
      console.log("No se puede actualizar imagen del sorteo por defecto");
      return false;
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    const { error } = await supabase
      .from("sorteos")
      .update({ imagen_url: imagenUrl, updated_at: new Date().toISOString() })
      .eq("id", sorteoId);

    if (error) {
      console.error("Error actualizando imagen:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error actualizando imagen:", error);
    return false;
  }
}

// Actualizar imágenes del carrusel
export async function actualizarImagenesCarrusel(
  sorteoId: string,
  imagen1?: string,
  imagen2?: string,
  imagen3?: string,
  imagen4?: string,
  imagen5?: string,
  imagen6?: string,
  imagen7?: string,
  imagen8?: string,
): Promise<boolean> {
  try {
    // Si es el sorteo por defecto, no podemos actualizar en Supabase
    if (sorteoId === "default") {
      console.log(
        "No se puede actualizar imágenes del carrusel del sorteo por defecto",
      );
      return false;
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    const updateData: any = { updated_at: new Date().toISOString() };

    if (imagen1 !== undefined) updateData.carousel_image_1 = imagen1;
    if (imagen2 !== undefined) updateData.carousel_image_2 = imagen2;
    if (imagen3 !== undefined) updateData.carousel_image_3 = imagen3;
    if (imagen4 !== undefined) updateData.carousel_image_4 = imagen4;
    if (imagen5 !== undefined) updateData.carousel_image_5 = imagen5;
    if (imagen6 !== undefined) updateData.carousel_image_6 = imagen6;
    if (imagen7 !== undefined) updateData.carousel_image_7 = imagen7;
    if (imagen8 !== undefined) updateData.carousel_image_8 = imagen8;

    const { error } = await supabase
      .from("sorteos")
      .update(updateData)
      .eq("id", sorteoId);

    if (error) {
      console.error("Error actualizando imágenes del carrusel:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error actualizando imágenes del carrusel:", error);
    return false;
  }
}

// Actualizar precios y cantidades del sorteo
export async function actualizarPreciosYCantidadesSorteo(
  sorteoId: string,
  pack1: {
    cantidad: number;
    precio: number;
    precioParaguay: number;
    visible: boolean;
    descripcion: string;
  },
  pack2: {
    cantidad: number;
    precio: number;
    precioParaguay: number;
    visible: boolean;
    descripcion: string;
  },
  pack3: {
    cantidad: number;
    precio: number;
    precioParaguay: number;
    visible: boolean;
    descripcion: string;
  },
  pack4: {
    cantidad: number;
    precio: number;
    precioParaguay: number;
    visible: boolean;
    descripcion: string;
  } = {
    cantidad: 0,
    precio: 0,
    precioParaguay: 0,
    visible: false,
    descripcion: "",
  },
  pack5: {
    cantidad: number;
    precio: number;
    precioParaguay: number;
    visible: boolean;
    descripcion: string;
  } = {
    cantidad: 0,
    precio: 0,
    precioParaguay: 0,
    visible: false,
    descripcion: "",
  },
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("actualizarPreciosYCantidadesSorteo", [
      sorteoId,
      pack1,
      pack2,
      pack3,
      pack4,
      pack5,
    ]);
  }
  try {
    // Si es el sorteo por defecto, no podemos actualizar en Supabase
    if (sorteoId === "default") {
      console.log("No se puede actualizar precios del sorteo por defecto");
      return false;
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    const { error } = await supabase
      .from("sorteos")
      .update({
        cantidad_pack_1: pack1.cantidad,
        precio_6_chances: pack1.precio,
        precio_pack_1_pyg: pack1.precioParaguay,
        pack_1_visible: pack1.visible,
        descripcion_pack_1: pack1.descripcion,
        cantidad_pack_2: pack2.cantidad,
        precio_12_chances: pack2.precio,
        precio_pack_2_pyg: pack2.precioParaguay,
        pack_2_visible: pack2.visible,
        descripcion_pack_2: pack2.descripcion,
        cantidad_pack_3: pack3.cantidad,
        precio_24_chances: pack3.precio,
        precio_pack_3_pyg: pack3.precioParaguay,
        pack_3_visible: pack3.visible,
        descripcion_pack_3: pack3.descripcion,
        cantidad_pack_4: pack4.cantidad,
        precio_pack_4: pack4.precio,
        precio_pack_4_pyg: pack4.precioParaguay,
        pack_4_visible: pack4.visible,
        descripcion_pack_4: pack4.descripcion,
        cantidad_pack_5: pack5.cantidad,
        precio_pack_5: pack5.precio,
        precio_pack_5_pyg: pack5.precioParaguay,
        pack_5_visible: pack5.visible,
        descripcion_pack_5: pack5.descripcion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sorteoId);

    if (error) {
      console.error("Error actualizando precios y cantidades:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error actualizando precios y cantidades:", error);
    return false;
  }
}

// Actualizar precios del sorteo
export async function actualizarPreciosSorteo(
  sorteoId: string,
  precio6: number,
  precio12: number,
  precio24: number,
  precioPack1Pyg: number,
  precioPack2Pyg: number,
  precioPack3Pyg: number,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("actualizarPreciosSorteo", [
      sorteoId,
      precio6,
      precio12,
      precio24,
      precioPack1Pyg,
      precioPack2Pyg,
      precioPack3Pyg,
    ]);
  }
  try {
    // Si es el sorteo por defecto, no podemos actualizar en Supabase
    if (sorteoId === "default") {
      console.log("No se puede actualizar precios del sorteo por defecto");
      return false;
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    const { error } = await supabase
      .from("sorteos")
      .update({
        precio_6_chances: precio6,
        precio_12_chances: precio12,
        precio_24_chances: precio24,
        precio_pack_1_pyg: precioPack1Pyg,
        precio_pack_2_pyg: precioPack2Pyg,
        precio_pack_3_pyg: precioPack3Pyg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sorteoId);

    if (error) {
      console.error("Error actualizando precios:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error actualizando precios:", error);
    return false;
  }
}

// Actualizar nombre y descripción de un sorteo
export async function actualizarDetallesSorteo(
  sorteoId: string,
  nombre: string,
  descripcion: string,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("actualizarDetallesSorteo", [
      sorteoId,
      nombre,
      descripcion,
    ]);
  }
  try {
    // Si es el sorteo por defecto, no podemos actualizar en Supabase
    if (sorteoId === "default") {
      console.log("No se puede actualizar detalles del sorteo por defecto");
      return false;
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    const { error } = await supabase
      .from("sorteos")
      .update({
        nombre,
        descripcion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sorteoId);

    if (error) {
      console.error("Error actualizando detalles:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error actualizando detalles:", error);
    return false;
  }
}

// Obtener compradores de un sorteo específico
export async function obtenerCompradores(
  sorteoId: string,
): Promise<Comprador[]> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<Comprador[]>("obtenerCompradores", [sorteoId]);
  }
  try {
    // Si es el sorteo por defecto, usar localStorage
    if (sorteoId === "default") {
      const datosGuardados = localStorage.getItem("sorteoData");
      if (datosGuardados) {
        try {
          const datos = JSON.parse(datosGuardados);
          return datos.compradores || [];
        } catch (error) {
          console.error("Error parsing localStorage data:", error);
          localStorage.removeItem("sorteoData");
          return [];
        }
      }
      return [];
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return [];
    }

    // Usar paginación para obtener TODOS los compradores sin límite
    let allData: Comprador[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("compradores")
        .select("*")
        .eq("sorteo_id", sorteoId)
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error obteniendo compradores:", error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += pageSize;

        // Si recibimos menos de pageSize, ya no hay más datos
        if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return allData;
  } catch (error) {
    console.error("Error obteniendo compradores:", error);
    return [];
  }
}

// Nueva función: Obtener compradores del sorteo actual (más reciente)
// SOLO compradores con estado_pago = 'pagado'
export async function obtenerCompradoresSorteoActual(): Promise<Comprador[]> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<Comprador[]>("obtenerCompradoresSorteoActual");
  }
  try {
    const sorteoActual = await obtenerSorteoActivo();
    if (!sorteoActual) {
      return [];
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return [];
    }

    // Usar paginación para obtener TODOS los compradores PAGADOS
    let allData: Comprador[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("compradores")
        .select("*")
        .eq("sorteo_id", sorteoActual.id)
        .eq("estado_pago", "pagado") // FILTRO AGREGADO
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error obteniendo compradores:", error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += pageSize;

        if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return allData;
  } catch (error) {
    console.error("Error obteniendo compradores del sorteo actual:", error);
    return [];
  }
}

// Obtener estadísticas del sorteo
// OPTIMIZADO: Usa función SQL para calcular en el servidor y reducir egress
export async function obtenerEstadisticasSorteo(sorteoId: string) {
  if (typeof window !== "undefined") {
    const response = await fetch(
      `/api/estadisticas?sorteoId=${encodeURIComponent(sorteoId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error("No se pudieron obtener las estadísticas");
    }
    return response.json();
  }
  try {
    // El sorteo "default" es sólo el fallback visual cuando no hay conexión.
    // En servidor no existe localStorage ni hay compradores persistidos para él.
    if (sorteoId === "default") {
      return { totalCompradores: 0, chancesVendidas: 0, totalRecaudado: 0 };
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return { totalCompradores: 0, chancesVendidas: 0, totalRecaudado: 0 };
    }

    // OPTIMIZACIÓN: Usar función SQL que calcula en el servidor
    // Esto reduce el egress de ~500KB a ~100 bytes
    const { data, error } = await supabase.rpc("obtener_estadisticas_sorteo", {
      sorteo_id_param: sorteoId,
    });

    if (error) {
      console.error("Error obteniendo estadísticas:", error);
      return { totalCompradores: 0, chancesVendidas: 0, totalRecaudado: 0 };
    }

    if (!data || data.length === 0) {
      return { totalCompradores: 0, chancesVendidas: 0, totalRecaudado: 0 };
    }

    // La función retorna un array con un solo elemento
    const stats = data[0];
    return {
      totalCompradores: Number(stats.total_compradores),
      chancesVendidas: Number(stats.chances_vendidas),
      totalRecaudado: Number(stats.total_recaudado),
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return { totalCompradores: 0, chancesVendidas: 0, totalRecaudado: 0 };
  }
}

// Mercado Pago deshabilitado permanentemente. Creación de comprador anterior comentada.
// // Crear un nuevo comprador
// export async function crearComprador(
//   sorteoId: string,
//   nombre: string,
//   email: string | undefined,
//   telefono: string | undefined,
//   instagram_username: string | undefined,
//   cantidadChances: number,
//   numerosAsignados: number[],
//   precioPagado: number,
//   mercadoPagoId?: string,
//   promo?: { codigoId: string; precioLista: number },
// ): Promise<Comprador | null> {
//   try {
//     // Si es el sorteo por defecto, usar localStorage
//     if (sorteoId === "default") {
//       const datosGuardados = localStorage.getItem("sorteoData");
//       let datos: any = { compradores: [], chancesVendidas: 0 };
//
//       if (datosGuardados) {
//         try {
//           datos = JSON.parse(datosGuardados);
//         } catch (error) {
//           console.error("Error parsing localStorage data:", error);
//           localStorage.removeItem("sorteoData");
//         }
//       }
//
//       const nuevoComprador = {
//         id: Date.now().toString(),
//         sorteo_id: sorteoId,
//         nombre,
//         email: email || undefined,
//         telefono: telefono || undefined,
//         instagram_username: instagram_username || undefined,
//         cantidad_chances: cantidadChances,
//         numeros_asignados: numerosAsignados,
//         precio_pagado: precioPagado,
//         estado_pago: "pagado",
//         mercadopago_id: mercadoPagoId || null,
//         metodo_pago: "mercadopago",
//         promo_codigo_id: promo?.codigoId ?? null,
//         precio_lista: promo?.precioLista ?? null,
//         es_ganador: false,
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),
//       };
//
//       datos.compradores.push(nuevoComprador);
//       datos.chancesVendidas = (datos.chancesVendidas || 0) + cantidadChances;
//
//       localStorage.setItem("sorteoData", JSON.stringify(datos));
//       return nuevoComprador;
//     }
//
//     const tablasExisten = await verificarTablas();
//     if (!tablasExisten) {
//       throw new Error("Las tablas de la base de datos no existen");
//     }
//
//     const { data, error } = await supabase
//       .from("compradores")
//       .insert({
//         sorteo_id: sorteoId,
//         nombre,
//         email: email || null,
//         telefono: telefono || null,
//         instagram_username: instagram_username || null,
//         cantidad_chances: cantidadChances,
//         numeros_asignados: numerosAsignados,
//         precio_pagado: precioPagado,
//         estado_pago: "pagado",
//         mercadopago_id: mercadoPagoId || null,
//         metodo_pago: "mercadopago",
//         promo_codigo_id: promo?.codigoId ?? null,
//         precio_lista: promo?.precioLista ?? null,
//         es_ganador: false,
//       })
//       .select()
//       .single();
//
//     if (error) {
//       console.error("Error creando comprador:", error);
//       return null;
//     }
//
//     // Verificar si se completó el sorteo después de esta venta
//     // await verificarSorteoCompletoAPI(sorteoId)
//
//     return data;
//   } catch (error) {
//     console.error("Error creando comprador:", error);
//     return null;
//   }
// }
//

// Generar números aleatorios únicos
export async function generarNumerosUnicos(
  sorteoId: string,
  cantidad: number,
): Promise<number[]> {
  try {
    // Si es el sorteo por defecto, usar localStorage (comportamiento legacy)
    if (sorteoId === "default") {
      const numerosOcupados = new Set<number>();
      const datosGuardados = localStorage.getItem("sorteoData");
      if (datosGuardados) {
        try {
          const datos = JSON.parse(datosGuardados);
          const compradores = datos.compradores || [];
          compradores.forEach((comprador: any) => {
            comprador.numerosAsignados?.forEach((num: number) =>
              numerosOcupados.add(num),
            );
          });
        } catch (error) {
          console.error("Error parsing localStorage data:", error);
          localStorage.removeItem("sorteoData");
        }
      }

      // Generar números disponibles para sorteo default
      const sorteo = await obtenerSorteo(sorteoId);
      const totalChances = sorteo?.total_chances || 9999;
      const numerosDisponibles: number[] = [];
      for (let i = 0; i <= totalChances; i++) {
        if (!numerosOcupados.has(i)) {
          numerosDisponibles.push(i);
        }
      }

      // Seleccionar aleatoriamente
      const numerosSeleccionados: number[] = [];
      for (let i = 0; i < cantidad && numerosDisponibles.length > 0; i++) {
        const indiceAleatorio = Math.floor(
          Math.random() * numerosDisponibles.length,
        );
        numerosSeleccionados.push(
          numerosDisponibles.splice(indiceAleatorio, 1)[0],
        );
      }
      return numerosSeleccionados.sort((a, b) => a - b);
    }

    // Para sorteos reales: usar función atómica de PostgreSQL
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      throw new Error("Las tablas de la base de datos no existen");
    }

    // Llamar a la función PostgreSQL que genera números de forma atómica
    // Esta función usa FOR UPDATE para prevenir race conditions
    const { data, error } = await supabase.rpc(
      "generar_numeros_unicos_atomico",
      {
        p_sorteo_id: sorteoId,
        p_cantidad: cantidad,
      },
    );

    if (error) {
      console.error("Error generando números únicos:", error);
      throw new Error(
        `Error generando números: ${error.message || "Error desconocido"}`,
      );
    }

    if (!data || data.length === 0) {
      throw new Error("No se pudieron generar números únicos");
    }

    console.log(
      `✅ Generados ${data.length} números únicos de forma atómica:`,
      data,
    );
    return data;
  } catch (error) {
    console.error("Error generando números únicos:", error);
    throw error; // Re-throw para que el caller pueda manejarlo
  }
}

// Nueva función: Obtener todos los compradores de todos los sorteos (para marketing)
export async function obtenerTodosLosCompradores(): Promise<Comprador[]> {
  try {
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return [];
    }

    // Usar paginación para obtener TODOS los compradores
    let allData: Comprador[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("compradores")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error obteniendo todos los compradores:", error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += pageSize;

        if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return allData;
  } catch (error) {
    console.error("Error obteniendo todos los compradores:", error);
    return [];
  }
}

// Crear un comprador con pago por transferencia (pendiente de confirmación)
export async function crearCompradorTransferencia({
  sorteoId,
  nombre,
  email,
  telefono,
  instagram_username,
  cantidadChances,
  comprobanteUrl,
  paisTransferencia,
  promo,
}: {
  sorteoId: string;
  nombre: string;
  email?: string;
  telefono: string;
  instagram_username?: string;
  cantidadChances: number;
  comprobanteUrl: string;
  paisTransferencia: PaisTransferencia;
  promo?: { codigoId: string; porcentaje: number; unico: boolean };
}): Promise<Comprador | null> {
  try {
    if (!normalizarTelefono(telefono, paisTransferencia)) {
      throw new Error("El teléfono es obligatorio y debe ser válido");
    }
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      throw new Error("Las tablas de la base de datos no existen");
    }

    const sorteo = await obtenerSorteo(sorteoId);
    if (!sorteo) {
      throw new Error("No se pudo obtener información del sorteo");
    }

    const configTransferencia = await obtenerConfiguracionTransferencia();
    const cuenta =
      paisTransferencia === "PY"
        ? configTransferencia.paraguay
        : configTransferencia.argentina;
    if (!cuenta.identificador.trim() || !cuenta.titular.trim()) {
      throw new Error(
        `Cuenta bancaria no configurada para ${paisTransferencia}`,
      );
    }

    // NO generar números automáticamente para transferencias
    // Los números se asignarán cuando el admin apruebe la transferencia
    const numerosAsignados: number[] = [];

    const precio = obtenerPrecioTransferencia(
      sorteo,
      cantidadChances,
      paisTransferencia,
    );
    const precioFinal = promo ? precioConPromo(sorteo, cantidadChances, paisTransferencia, { porcentaje: promo.porcentaje }).final : precio.monto;

    const { data, error } = await supabase
      .from("compradores")
      .insert({
        sorteo_id: sorteoId,
        nombre,
        email: email || null,
        telefono: telefono.trim(),
        instagram_username: instagram_username || null,
        cantidad_chances: cantidadChances,
        numeros_asignados: numerosAsignados, // Array vacío hasta aprobación
        precio_pagado: precioFinal,
        precio_lista: promo ? precio.monto : null,
        promo_codigo_id: promo?.codigoId ?? null,
        promo_uso_unico: promo?.unico ?? false,
        estado_pago: "pendiente", // Estado pendiente para transferencias
        es_ganador: false,
        comprobante_url: comprobanteUrl,
        metodo_pago: "transferencia",
        pais_transferencia: paisTransferencia,
        moneda: precio.moneda,
        estado_transferencia: "pendiente",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando comprador con transferencia:", error);
      if (promo?.unico && error.code === "23505") throw new Error("Este código ya tiene una transferencia pendiente");
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error creando comprador con transferencia:", error);
    if (error instanceof Error && error.message === "Este código ya tiene una transferencia pendiente") throw error;
    return null;
  }
}

// Verificar si un email ya participó gratis en este sorteo (límite: 1 por email por sorteo)
export async function existeParticipacionGratuita(
  sorteoId: string,
  email: string,
): Promise<boolean> {
  try {
    const emailNormalizado = email.trim().toLowerCase();
    if (!emailNormalizado) return false;

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) return false;

    const { data, error } = await supabase
      .from("compradores")
      .select("id")
      .eq("sorteo_id", sorteoId)
      .eq("metodo_pago", "gratuito")
      .ilike("email", emailNormalizado)
      .limit(1);

    if (error) {
      console.error("Error verificando participación gratuita:", error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error("Error verificando participación gratuita:", error);
    return false;
  }
}

// Crear participante gratuito (página /free): 1 número, sin pago.
// estado_pago = 'pagado' para entrar al pool y ser elegible; metodo_pago = 'gratuito' como marca.
export async function crearCompradorGratuito({
  sorteoId,
  nombre,
  email,
  telefono,
  numerosAsignados,
  datosEncuesta,
}: {
  sorteoId: string;
  nombre: string;
  email?: string;
  telefono: string;
  numerosAsignados: number[];
  datosEncuesta?: Record<string, any>;
}): Promise<Comprador | null> {
  try {
    if (!normalizarTelefono(telefono)) throw new Error("El teléfono es obligatorio y debe ser válido");
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      throw new Error("Las tablas de la base de datos no existen");
    }

    const { data, error } = await supabase
      .from("compradores")
      .insert({
        sorteo_id: sorteoId,
        nombre,
        email: email || null,
        telefono: telefono.trim(),
        cantidad_chances: 1,
        numeros_asignados: numerosAsignados,
        precio_pagado: 0,
        estado_pago: "pagado",
        metodo_pago: "gratuito",
        datos_encuesta: datosEncuesta || null,
        es_ganador: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando comprador gratuito:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error creando comprador gratuito:", error);
    return null;
  }
}

// Obtener transferencias pendientes de confirmación
export async function obtenerTransferenciasPendientes(): Promise<Comprador[]> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<Comprador[]>("obtenerTransferenciasPendientes");
  }
  try {
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return [];
    }

    const { data, error } = await supabase
      .from("compradores")
      .select("*")
      .eq("estado_pago", "pendiente")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error obteniendo transferencias pendientes:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error obteniendo transferencias pendientes:", error);
    return [];
  }
}

// Aprobar transferencia y asignar números
export async function aprobarTransferencia(
  compradorId: string,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("aprobarTransferencia", [compradorId]);
  }
  try {
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    // Obtener datos del comprador y del sorteo
    const { data: comprador, error: errorComprador } = await supabase
      .from("compradores")
      .select(
        `
        *,
        sorteos!compradores_sorteo_id_fkey(nombre)
      `,
      )
      .eq("id", compradorId)
      .single();

    if (errorComprador || !comprador) {
      console.error("Error obteniendo comprador:", errorComprador);
      return false;
    }
    if (comprador.estado_pago === "pagado") return true;
    if (comprador.estado_pago !== "pendiente") return false;

    // Generar números únicos si no los tiene
    let numerosAsignados = comprador.numeros_asignados;
    if (!numerosAsignados || numerosAsignados.length === 0) {
      numerosAsignados = await generarNumerosUnicos(
        comprador.sorteo_id,
        comprador.cantidad_chances,
      );

      // VALIDACIÓN POST-GENERACIÓN: Verificar que NO haya duplicados
      console.log(
        `🔍 [aprobarTransferencia] Validando ${numerosAsignados.length} números para comprador ${compradorId}...`,
      );

      const { verificarNumerosUnicos } = await import(
        "./verificarNumerosUnicos"
      );
      const verificacion = await verificarNumerosUnicos(
        comprador.sorteo_id,
        numerosAsignados,
        compradorId,
      );

      if (verificacion.duplicados) {
        console.error("❌ DUPLICADOS DETECTADOS en aprobarTransferencia:", {
          compradorId,
          sorteoId: comprador.sorteo_id,
          numerosGenerados: numerosAsignados,
          conflictos: verificacion.numerosConflicto,
          mensaje: verificacion.mensaje,
        });

        // ABORTAR la aprobación
        throw new Error(
          `Duplicados detectados al aprobar transferencia: ${verificacion.mensaje}`,
        );
      }

      console.log(
        `✅ [aprobarTransferencia] Validación exitosa: ${verificacion.mensaje}`,
      );
    }

    // Actualizar estado a pagado y asignar números
    const { data: aprobados, error: errorUpdate } = await supabase
      .from("compradores")
      .update({
        estado_pago: "pagado",
        numeros_asignados: numerosAsignados,
        updated_at: new Date().toISOString(),
      })
      .eq("id", compradorId)
      .eq("estado_pago", "pendiente")
      .select("id");

    if (errorUpdate || !aprobados?.length) {
      console.error("Error aprobando transferencia:", errorUpdate);
      return false;
    }
    if (comprador.promo_codigo_id) {
      try {
        if (!(await marcarCodigoUsado(comprador.promo_codigo_id))) console.warn("Código promo ya usado al aprobar transferencia", comprador.promo_codigo_id);
      } catch (errorPromo) { console.warn("No se pudo marcar la promo usada:", errorPromo); }
    }

    // Verificar si se completó el sorteo después de aprobar esta transferencia
    // await verificarSorteoCompletoAPI(comprador.sorteo_id)

    return true;
  } catch (error) {
    console.error("Error aprobando transferencia:", error);
    return false;
  }
}

// Rechazar transferencia
export async function rechazarTransferencia(
  compradorId: string,
  motivo?: string,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("rechazarTransferencia", [
      compradorId,
      motivo,
    ]);
  }
  try {
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    // Obtener datos del comprador antes de rechazar
    const { data: comprador, error: errorComprador } = await supabase
      .from("compradores")
      .select(
        `
        *,
        sorteos!compradores_sorteo_id_fkey(nombre)
      `,
      )
      .eq("id", compradorId)
      .single();

    if (errorComprador || !comprador) {
      console.error("Error obteniendo comprador:", errorComprador);
      return false;
    }

    const { error } = await supabase
      .from("compradores")
      .update({
        estado_pago: "cancelado",
        updated_at: new Date().toISOString(),
        // Guardamos el motivo en mercadopago_id temporalmente
        mercadopago_id: motivo ? `RECHAZADO: ${motivo}` : "RECHAZADO",
      })
      .eq("id", compradorId);

    if (error) {
      console.error("Error rechazando transferencia:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error rechazando transferencia:", error);
    return false;
  }
}

// Obtener un sorteo específico por ID
export async function obtenerSorteo(sorteoId: string): Promise<Sorteo | null> {
  try {
    // Si es el sorteo por defecto, retornar datos por defecto
    if (sorteoId === "default") {
      return {
        id: "default",
        nombre: "T-SHIRT 150M - SORTEO EXCLUSIVO",
        descripcion: "Sorteo exclusivo de remera premium edición limitada",
        total_chances: 9999,
        cantidad_pack_1: 6,
        cantidad_pack_2: 12,
        cantidad_pack_3: 24,
        precio_6_chances: 21000,
        precio_12_chances: 42000,
        precio_24_chances: 84000,
        precio_pack_1_pyg: 147000,
        precio_pack_2_pyg: 294000,
        precio_pack_3_pyg: 588000,
        pack_1_visible: true,
        pack_2_visible: true,
        pack_3_visible: true,
        descripcion_pack_1: "Honda Wave 2025",
        descripcion_pack_2:
          "Honda Wave 2025 + 5 oportunidades en pre-venta Nueva Titan 2018",
        descripcion_pack_3:
          "Honda Wave 2025 + 5 chances pre-venta New Titan 2018",
        cantidad_pack_4: 0,
        precio_pack_4: 0,
        precio_pack_4_pyg: 0,
        pack_4_visible: false,
        descripcion_pack_4: "",
        cantidad_pack_5: 0,
        precio_pack_5: 0,
        precio_pack_5_pyg: 0,
        pack_5_visible: false,
        descripcion_pack_5: "",
        fecha_sorteo: "2025-02-15",
        estado: "activo",
        imagen_url: "/placeholder.svg?height=400&width=400&text=Sorteo+Remera",
        titulo_remera: "Remera Exclusiva", // Added default title
        carousel_image_1: null,
        carousel_image_2: null,
        carousel_image_3: null,
        carousel_image_4: null,
        carousel_image_5: null,
        carousel_image_6: null,
        carousel_image_7: null,
        carousel_image_8: null,
        ganador_id: null,
        numero_ganador: null,
        ganador_nombre: null,
        fecha_sorteo_realizado: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return null;
    }

    const { data, error } = await supabase
      .from("sorteos")
      .select("*")
      .eq("id", sorteoId)
      .single();

    if (error) {
      console.error("Error obteniendo sorteo:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error obteniendo sorteo:", error);
    return null;
  }
}

// Actualizar título de la remera
export async function actualizarTituloRemera(
  sorteoId: string,
  titulo: string,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("actualizarTituloRemera", [
      sorteoId,
      titulo,
    ]);
  }
  try {
    // Si es el sorteo por defecto, no podemos actualizar en Supabase
    if (sorteoId === "default") {
      console.log("No se puede actualizar título del sorteo por defecto");
      return false;
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    const { error } = await supabase
      .from("sorteos")
      .update({
        titulo_remera: titulo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sorteoId);

    if (error) {
      console.error("Error actualizando título de remera:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error actualizando título de remera:", error);
    return false;
  }
}

export async function actualizarFechaSorteo(
  sorteoId: string,
  fechaSorteo: string | null,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("actualizarFechaSorteo", [
      sorteoId,
      fechaSorteo,
    ]);
  }
  try {
    if (sorteoId === "default") {
      console.log("No se puede actualizar fecha del sorteo por defecto");
      return false;
    }

    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    const { error } = await supabase
      .from("sorteos")
      .update({
        fecha_sorteo: fechaSorteo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sorteoId);

    if (error) {
      console.error("Error actualizando fecha del sorteo:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error actualizando fecha del sorteo:", error);
    return false;
  }
}

/**
 * Llama a la API para verificar si un sorteo se completó
 */
async function verificarSorteoCompletoAPI(sorteoId: string): Promise<void> {
  try {
    // No verificar para sorteo por defecto
    if (sorteoId === "default") {
      return;
    }

    // Solo verificar en el cliente/servidor, no en build
    if (
      typeof window === "undefined" &&
      process.env.NODE_ENV !== "production"
    ) {
      // En desarrollo, hacer la llamada a localhost
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      await fetch(`${baseUrl}/api/verificar-sorteo-completo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CRON_SECRET
            ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
            : {}),
        },
        body: JSON.stringify({ sorteoId }),
      });
    }
  } catch (error) {
    console.error("Error llamando a la API de verificación:", error);
  }
}

// ============================================
// FUNCIONES PARA GANADORES PASADOS
// ============================================

export async function obtenerGanadoresPasados() {
  try {
    const { data, error } = await supabase
      .from("ganadores_pasados")
      .select("*")
      .eq("visible", true)
      .order("orden", { ascending: false });

    if (error) {
      console.error("Error obteniendo ganadores pasados:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error obteniendo ganadores pasados:", error);
    return [];
  }
}

export async function obtenerTodosLosGanadores() {
  if (typeof window !== "undefined") {
    return callAdminDatabase<any[]>("obtenerTodosLosGanadores");
  }
  try {
    const { data, error } = await supabase
      .from("ganadores_pasados")
      .select("*")
      .order("orden", { ascending: false });

    if (error) {
      console.error("Error obteniendo todos los ganadores:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error obteniendo todos los ganadores:", error);
    return [];
  }
}

export async function crearGanadorPasado(ganador: {
  nombre_ganador: string;
  premio: string;
  precio_premio: string;
  fecha_sorteo: string;
  numero_ganador: number;
  imagen_1_url?: string | null;
  imagen_2_url?: string | null;
  imagen_3_url?: string | null;
  orden: number;
  visible?: boolean;
}) {
  if (typeof window !== "undefined") {
    return callAdminDatabase("crearGanadorPasado", [ganador]);
  }
  try {
    const { data, error } = await supabase
      .from("ganadores_pasados")
      .insert({
        ...ganador,
        visible: ganador.visible ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando ganador pasado:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error creando ganador pasado:", error);
    return null;
  }
}

export async function actualizarGanadorPasado(
  id: string,
  actualizaciones: Partial<{
    nombre_ganador: string;
    premio: string;
    precio_premio: string;
    fecha_sorteo: string;
    numero_ganador: number;
    imagen_1_url: string | null;
    imagen_2_url: string | null;
    imagen_3_url: string | null;
    orden: number;
    visible: boolean;
  }>,
) {
  if (typeof window !== "undefined") {
    return callAdminDatabase("actualizarGanadorPasado", [id, actualizaciones]);
  }
  try {
    const { data, error } = await supabase
      .from("ganadores_pasados")
      .update(actualizaciones)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando ganador pasado:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error actualizando ganador pasado:", error);
    return null;
  }
}

export async function eliminarGanadorPasado(id: string) {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("eliminarGanadorPasado", [id]);
  }
  try {
    const { error } = await supabase
      .from("ganadores_pasados")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error eliminando ganador pasado:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error eliminando ganador pasado:", error);
    return false;
  }
}

// Eliminar un comprador (libera sus números para que puedan ser vendidos nuevamente)
export async function eliminarComprador(compradorId: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("eliminarComprador", [compradorId]);
  }
  try {
    const tablasExisten = await verificarTablas();
    if (!tablasExisten) {
      return false;
    }

    // Obtener datos del comprador antes de eliminar (para logs/registro)
    const { data: comprador, error: errorComprador } = await supabase
      .from("compradores")
      .select("*")
      .eq("id", compradorId)
      .single();

    if (errorComprador || !comprador) {
      console.error("Error obteniendo comprador:", errorComprador);
      return false;
    }

    // Verificar que no sea ganador
    if (comprador.es_ganador) {
      console.error("No se puede eliminar un comprador que es ganador");
      return false;
    }

    // Eliminar el comprador (esto liberará automáticamente sus números)
    const { error } = await supabase
      .from("compradores")
      .delete()
      .eq("id", compradorId);

    if (error) {
      console.error("Error eliminando comprador:", error);
      return false;
    }

    console.log(
      `Comprador eliminado: ${
        comprador.nombre
      } - Números liberados: ${comprador.numeros_asignados.join(", ")}`,
    );
    return true;
  } catch (error) {
    console.error("Error eliminando comprador:", error);
    return false;
  }
}

// ===== GANADORES EXPRESS =====

// Obtener ganadores express del sorteo activo
// OPTIMIZADO: Usa función SQL que solo trae campos necesarios
export async function obtenerGanadoresExpress(
  sorteoId?: string,
): Promise<GanadorExpress[]> {
  try {
    // OPTIMIZACIÓN: Usar función SQL optimizada
    // Solo trae los campos necesarios y hace el join en el servidor
    const { data, error } = await supabase.rpc(
      "obtener_ganadores_express_visibles",
      {
        sorteo_id_param: sorteoId && sorteoId !== "default" ? sorteoId : null,
      },
    );

    if (error) {
      console.error("Error obteniendo ganadores express:", error);
      return [];
    }

    // Mapear los resultados al tipo GanadorExpress
    return (
      data?.map((item: any) => ({
        id: item.id,
        sorteo_id: sorteoId || "", // No lo necesitamos del servidor
        numero_ganador: item.numero_ganador,
        nombre_ganador: item.nombre_ganador,
        premio_monto: item.premio_monto,
        fecha_premio: item.fecha_premio,
        visible: true, // Ya están filtrados
        created_at: item.created_at,
        updated_at: item.created_at, // Usar created_at como updated_at
      })) || []
    );
  } catch (error) {
    console.error("Error obteniendo ganadores express:", error);
    return [];
  }
}

// Buscar comprador por número en un sorteo
export async function buscarCompradorPorNumero(
  sorteoId: string,
  numero: number,
): Promise<Comprador | null> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<Comprador | null>("buscarCompradorPorNumero", [
      sorteoId,
      numero,
    ]);
  }
  try {
    console.log("🔍 Buscando número:", numero, "en sorteo:", sorteoId);

    // Si el sorteoId es "default", obtener el sorteo activo real de la base de datos
    let sorteoIdReal = sorteoId;
    if (sorteoId === "default") {
      console.log("⚠️ sorteoId es 'default', buscando sorteo activo real...");

      const { data: sorteoActivo, error: errorSorteo } = await supabase
        .from("sorteos")
        .select("id")
        .eq("estado", "activo")
        .single();

      if (errorSorteo || !sorteoActivo) {
        console.log("❌ No se encontró un sorteo activo en la base de datos");
        return null;
      }

      sorteoIdReal = sorteoActivo.id;
      console.log("✅ Sorteo activo encontrado:", sorteoIdReal);
    }

    // Obtener todos los compradores del sorteo
    const { data: compradores, error } = await supabase
      .from("compradores")
      .select("*")
      .eq("sorteo_id", sorteoIdReal);

    if (error) {
      console.error("Error buscando comprador por número:", error);
      return null;
    }

    if (!compradores || compradores.length === 0) {
      console.log("⚠️ No se encontraron compradores en este sorteo");
      return null;
    }

    console.log(`📊 Total compradores en sorteo: ${compradores.length}`);

    // Buscar el comprador que tiene este número en su array
    const compradorEncontrado = compradores.find((comprador) => {
      const tieneNumero = comprador.numeros_asignados.includes(numero);
      if (tieneNumero) {
        console.log(
          "✅ Número encontrado en:",
          comprador.nombre,
          "- Números:",
          comprador.numeros_asignados,
        );
      }
      return tieneNumero;
    });

    if (!compradorEncontrado) {
      console.log("❌ Número no encontrado en ningún comprador");
      // Mostrar algunos números para debugging
      const numerosEjemplo = compradores.slice(0, 3).map((c) => ({
        nombre: c.nombre,
        numeros: c.numeros_asignados.slice(0, 5),
      }));
      console.log("📝 Ejemplos de números asignados:", numerosEjemplo);
    }

    return compradorEncontrado || null;
  } catch (error) {
    console.error("Error buscando comprador por número:", error);
    return null;
  }
}

// Crear ganador express
export async function crearGanadorExpress(
  sorteoId: string,
  numeroGanador: number,
  premioMonto: string,
  nombreGanador?: string,
): Promise<GanadorExpress | null> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<GanadorExpress | null>("crearGanadorExpress", [
      sorteoId,
      numeroGanador,
      premioMonto,
      nombreGanador,
    ]);
  }
  try {
    // Si el sorteoId es "default", obtener el sorteo activo real
    let sorteoIdReal = sorteoId;
    if (sorteoId === "default") {
      const { data: sorteoActivo, error: errorSorteo } = await supabase
        .from("sorteos")
        .select("id")
        .eq("estado", "activo")
        .single();

      if (errorSorteo || !sorteoActivo) {
        console.error("⚠️ No se encontró un sorteo activo en la base de datos");
        return null;
      }

      sorteoIdReal = sorteoActivo.id;
    }

    const { data, error } = await supabase
      .from("ganadores_express")
      .insert({
        sorteo_id: sorteoIdReal,
        numero_ganador: numeroGanador,
        nombre_ganador: nombreGanador || null,
        premio_monto: premioMonto,
        fecha_premio: new Date().toISOString().split("T")[0],
        visible: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando ganador express:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error creando ganador express:", error);
    return null;
  }
}

// Actualizar ganador express
export async function actualizarGanadorExpress(
  id: string,
  actualizaciones: Partial<{
    numero_ganador: number;
    nombre_ganador: string | null;
    premio_monto: string;
    fecha_premio: string;
    visible: boolean;
  }>,
): Promise<GanadorExpress | null> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<GanadorExpress | null>(
      "actualizarGanadorExpress",
      [id, actualizaciones],
    );
  }
  try {
    const { data, error } = await supabase
      .from("ganadores_express")
      .update(actualizaciones)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando ganador express:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error actualizando ganador express:", error);
    return null;
  }
}

// Eliminar ganador express
export async function eliminarGanadorExpress(id: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("eliminarGanadorExpress", [id]);
  }
  try {
    const { error } = await supabase
      .from("ganadores_express")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error eliminando ganador express:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error eliminando ganador express:", error);
    return false;
  }
}

// Valores por defecto del aviso de transferencia
const AVISO_TRANSFERENCIA_TITULO_DEFAULT = "IMPORTANTE — TRANSFERENCIAS";
const AVISO_TRANSFERENCIA_TEXTO_DEFAULT =
  "Las transferencias deben estar emitidas a nombre de la misma persona que completa este formulario (nombre y apellido). Si el titular de la transferencia no coincide, la compra se anula directamente sin excepción.";

// Obtener configuración de cuenta de transferencia
export async function obtenerConfiguracionTransferencia(): Promise<ConfiguracionTransferencia> {
  try {
    const { data } = await supabase
      .from("configuracion")
      .select("clave, valor")
      .in("clave", [
        "alias_transferencia",
        "titular_transferencia",
        "banco_transferencia_argentina",
        "etiqueta_transferencia_argentina",
        "alias_transferencia_paraguay",
        "titular_transferencia_paraguay",
        "banco_transferencia_paraguay",
        "etiqueta_transferencia_paraguay",
        "aviso_transferencia_titulo",
        "aviso_transferencia_texto",
      ]);

    const map = Object.fromEntries(
      data?.map((r: { clave: string; valor: string }) => [r.clave, r.valor]) ??
        [],
    );
    return {
      argentina: {
        banco: map["banco_transferencia_argentina"] ?? "",
        etiqueta: map["etiqueta_transferencia_argentina"] ?? "Alias",
        identificador: map["alias_transferencia"] ?? "sosamotos",
        titular: map["titular_transferencia"] ?? "Agustín Sosa",
      },
      paraguay: {
        banco: map["banco_transferencia_paraguay"] ?? "",
        etiqueta: map["etiqueta_transferencia_paraguay"] ?? "Número de cuenta",
        identificador: map["alias_transferencia_paraguay"] ?? "",
        titular: map["titular_transferencia_paraguay"] ?? "",
      },
      avisoTitulo:
        map["aviso_transferencia_titulo"] ?? AVISO_TRANSFERENCIA_TITULO_DEFAULT,
      avisoTexto:
        map["aviso_transferencia_texto"] ?? AVISO_TRANSFERENCIA_TEXTO_DEFAULT,
    };
  } catch (error) {
    console.error("Error obteniendo configuración de transferencia:", error);
    return {
      argentina: {
        banco: "",
        etiqueta: "Alias",
        identificador: "sosamotos",
        titular: "Agustín Sosa",
      },
      paraguay: {
        banco: "",
        etiqueta: "Número de cuenta",
        identificador: "",
        titular: "",
      },
      avisoTitulo: AVISO_TRANSFERENCIA_TITULO_DEFAULT,
      avisoTexto: AVISO_TRANSFERENCIA_TEXTO_DEFAULT,
    };
  }
}

// Actualizar configuración de cuenta de transferencia
export async function actualizarConfiguracionTransferencia(
  config: ConfiguracionTransferencia,
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from("configuracion").upsert([
      {
        clave: "alias_transferencia",
        valor: config.argentina.identificador,
        updated_at: now,
      },
      {
        clave: "titular_transferencia",
        valor: config.argentina.titular,
        updated_at: now,
      },
      {
        clave: "banco_transferencia_argentina",
        valor: config.argentina.banco,
        updated_at: now,
      },
      {
        clave: "etiqueta_transferencia_argentina",
        valor: config.argentina.etiqueta,
        updated_at: now,
      },
      {
        clave: "alias_transferencia_paraguay",
        valor: config.paraguay.identificador,
        updated_at: now,
      },
      {
        clave: "titular_transferencia_paraguay",
        valor: config.paraguay.titular,
        updated_at: now,
      },
      {
        clave: "banco_transferencia_paraguay",
        valor: config.paraguay.banco,
        updated_at: now,
      },
      {
        clave: "etiqueta_transferencia_paraguay",
        valor: config.paraguay.etiqueta,
        updated_at: now,
      },
      {
        clave: "aviso_transferencia_titulo",
        valor: config.avisoTitulo,
        updated_at: now,
      },
      {
        clave: "aviso_transferencia_texto",
        valor: config.avisoTexto,
        updated_at: now,
      },
    ]);

    if (error) {
      console.error(
        "Error actualizando configuración de transferencia:",
        error,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error actualizando configuración de transferencia:", error);
    return false;
  }
}

// Premios secundarios (números bendecidos)
export interface PremiosSecundarios {
  numeros: string[];
  monto: string;
  titulo: string;
  visible: boolean;
}

const PREMIOS_SECUNDARIOS_DEFAULTS: PremiosSecundarios = {
  numeros: ["8899", "6868", "828", "168", "33"],
  monto: "$50 mil",
  titulo: "NÚMEROS BENDECIDOS",
  visible: true,
};

export async function obtenerPremiosSecundarios(): Promise<PremiosSecundarios> {
  try {
    const { data } = await supabase
      .from("configuracion")
      .select("clave, valor")
      .in("clave", [
        "premios_secundarios_numeros",
        "premios_secundarios_monto",
        "premios_secundarios_titulo",
        "premios_secundarios_visible",
      ]);

    const map = Object.fromEntries(
      data?.map((r: { clave: string; valor: string }) => [r.clave, r.valor]) ??
        [],
    );

    return {
      numeros: map["premios_secundarios_numeros"]
        ? JSON.parse(map["premios_secundarios_numeros"])
        : PREMIOS_SECUNDARIOS_DEFAULTS.numeros,
      monto:
        map["premios_secundarios_monto"] ?? PREMIOS_SECUNDARIOS_DEFAULTS.monto,
      titulo:
        map["premios_secundarios_titulo"] ??
        PREMIOS_SECUNDARIOS_DEFAULTS.titulo,
      visible:
        map["premios_secundarios_visible"] !== undefined
          ? map["premios_secundarios_visible"] === "true"
          : PREMIOS_SECUNDARIOS_DEFAULTS.visible,
    };
  } catch (error) {
    console.error("Error obteniendo premios secundarios:", error);
    return PREMIOS_SECUNDARIOS_DEFAULTS;
  }
}

export async function actualizarPremiosSecundarios(
  premios: PremiosSecundarios,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("actualizarPremiosSecundarios", [
      premios,
    ]);
  }
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from("configuracion").upsert([
      {
        clave: "premios_secundarios_numeros",
        valor: JSON.stringify(premios.numeros),
        updated_at: now,
      },
      {
        clave: "premios_secundarios_monto",
        valor: premios.monto,
        updated_at: now,
      },
      {
        clave: "premios_secundarios_titulo",
        valor: premios.titulo,
        updated_at: now,
      },
      {
        clave: "premios_secundarios_visible",
        valor: String(premios.visible),
        updated_at: now,
      },
    ]);

    if (error) {
      console.error("Error actualizando premios secundarios:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error actualizando premios secundarios:", error);
    return false;
  }
}

// ── WhatsApp: registro de envíos + configuración de costo/margen ─────────────

export interface ConfiguracionWhatsApp {
  costoUnitario: number;
  costoUnitarioPromo: number;
  moneda: string;
  margen: number; // fracción, ej 0.20 = 20%
}

const CONFIG_WHATSAPP_DEFAULTS: ConfiguracionWhatsApp = {
  costoUnitario: 0.05,
  costoUnitarioPromo: 0.076,
  moneda: "USD",
  margen: 0.2,
};

export async function obtenerConfiguracionWhatsApp(): Promise<ConfiguracionWhatsApp> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<ConfiguracionWhatsApp>(
      "obtenerConfiguracionWhatsApp",
    );
  }
  try {
    const { data } = await supabase
      .from("configuracion")
      .select("clave, valor")
      .in("clave", [
        "whatsapp_costo_unitario",
        "whatsapp_costo_unitario_promo",
        "whatsapp_moneda",
        "whatsapp_margen",
      ]);

    const map = Object.fromEntries(
      data?.map((r: { clave: string; valor: string }) => [r.clave, r.valor]) ??
        [],
    );

    return {
      costoUnitario: map["whatsapp_costo_unitario"]
        ? Number(map["whatsapp_costo_unitario"])
        : CONFIG_WHATSAPP_DEFAULTS.costoUnitario,
      costoUnitarioPromo: map["whatsapp_costo_unitario_promo"]
        ? Number(map["whatsapp_costo_unitario_promo"])
        : CONFIG_WHATSAPP_DEFAULTS.costoUnitarioPromo,
      moneda: map["whatsapp_moneda"] ?? CONFIG_WHATSAPP_DEFAULTS.moneda,
      margen: map["whatsapp_margen"]
        ? Number(map["whatsapp_margen"])
        : CONFIG_WHATSAPP_DEFAULTS.margen,
    };
  } catch (error) {
    console.error("Error obteniendo configuración de WhatsApp:", error);
    return CONFIG_WHATSAPP_DEFAULTS;
  }
}

export async function actualizarConfiguracionWhatsApp(
  config: ConfiguracionWhatsApp,
): Promise<boolean> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<boolean>("actualizarConfiguracionWhatsApp", [
      config,
    ]);
  }
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from("configuracion").upsert([
      {
        clave: "whatsapp_costo_unitario",
        valor: String(config.costoUnitario),
        updated_at: now,
      },
      { clave: "whatsapp_costo_unitario_promo", valor: String(config.costoUnitarioPromo), updated_at: now },
      { clave: "whatsapp_moneda", valor: config.moneda, updated_at: now },
      {
        clave: "whatsapp_margen",
        valor: String(config.margen),
        updated_at: now,
      },
    ]);

    if (error) {
      console.error("Error actualizando configuración de WhatsApp:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error actualizando configuración de WhatsApp:", error);
    return false;
  }
}

export interface RegistrarEnvioWhatsAppInput {
  comprador_id?: string | null;
  sorteo_id?: string | null;
  telefono?: string | null;
  provider: string;
  provider_message_id?: string | null;
  estado: "enviado" | "error";
  costo_unitario: number;
  moneda: string;
  tipo?: "transferencia" | "promo";
  promo_codigo_id?: string | null;
}

// Solo servidor (lo usa /api/whatsapp-transferencia): la tabla no es
// accesible con la anon key.
export async function registrarEnvioWhatsApp(
  input: RegistrarEnvioWhatsAppInput,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("whatsapp_envios").insert([input]);
    if (error) {
      console.error("Error registrando envío de WhatsApp:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error registrando envío de WhatsApp:", error);
    return false;
  }
}

export interface ReporteWhatsApp {
  cantidad: number;
  costoBase: number;
  costoConMargen: number;
  moneda: string;
  margen: number;
  porMes: {
    mes: string;
    cantidad: number;
    costoBase: number;
    costoConMargen: number;
  }[];
  porSorteo: {
    sorteoId: string;
    cantidad: number;
    costoBase: number;
    costoConMargen: number;
  }[];
  porTipo: { tipo: string; cantidad: number; costoBase: number; costoConMargen: number }[];
}

// Reporte de envíos facturables (estado 'enviado'). Se agrega en JS tras paginar todas las filas.
export async function obtenerReporteWhatsApp(filtros?: {
  desde?: string;
  hasta?: string;
  sorteoId?: string;
}): Promise<ReporteWhatsApp> {
  if (typeof window !== "undefined") {
    return callAdminDatabase<ReporteWhatsApp>("obtenerReporteWhatsApp", [
      filtros,
    ]);
  }
  const { margen, moneda } = await obtenerConfiguracionWhatsApp();
  const vacio: ReporteWhatsApp = {
    cantidad: 0,
    costoBase: 0,
    costoConMargen: 0,
    moneda,
    margen,
    porMes: [],
    porSorteo: [],
    porTipo: [],
  };
  try {
    // Paginado para traer TODAS las filas: sin .range(), Supabase corta en 1000.
    let rows: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from("whatsapp_envios")
        .select("costo_unitario, created_at, moneda, sorteo_id, tipo")
        .in("estado", ["enviado", "entregado", "leido"]);

      if (filtros?.desde) query = query.gte("created_at", filtros.desde);
      if (filtros?.hasta) query = query.lte("created_at", filtros.hasta);
      if (filtros?.sorteoId) query = query.eq("sorteo_id", filtros.sorteoId);

      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) {
        console.error("Error obteniendo reporte de WhatsApp:", error);
        return vacio;
      }

      if (data && data.length > 0) {
        rows = [...rows, ...data];
        from += pageSize;
        if (data.length < pageSize) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    const costoBase = rows.reduce(
      (acc, r: any) => acc + (Number(r.costo_unitario) || 0),
      0,
    );

    const agrupar = (clave: (r: any) => string) => {
      const map = new Map<string, { cantidad: number; costoBase: number }>();
      for (const r of rows) {
        const key = clave(r);
        const prev = map.get(key) ?? { cantidad: 0, costoBase: 0 };
        prev.cantidad += 1;
        prev.costoBase += Number(r.costo_unitario) || 0;
        map.set(key, prev);
      }
      return [...map.entries()];
    };

    const porMes = agrupar((r) => (r.created_at as string).slice(0, 7)) // YYYY-MM
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([mes, v]) => ({
        mes,
        cantidad: v.cantidad,
        costoBase: v.costoBase,
        costoConMargen: v.costoBase * (1 + margen),
      }));

    const porSorteo = agrupar((r) => r.sorteo_id ?? "sin-sorteo")
      .sort((a, b) => b[1].costoBase - a[1].costoBase)
      .map(([sorteoId, v]) => ({
        sorteoId,
        cantidad: v.cantidad,
        costoBase: v.costoBase,
        costoConMargen: v.costoBase * (1 + margen),
      }));
    const porTipo = agrupar((r) => r.tipo || "transferencia")
      .map(([tipo, v]) => ({ tipo, cantidad: v.cantidad, costoBase: v.costoBase, costoConMargen: v.costoBase * (1 + margen) }));

    return {
      cantidad: rows.length,
      costoBase,
      costoConMargen: costoBase * (1 + margen),
      moneda,
      margen,
      porMes,
      porSorteo,
      porTipo,
    };
  } catch (error) {
    console.error("Error obteniendo reporte de WhatsApp:", error);
    return vacio;
  }
}
