import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServerKey =
  typeof window === "undefined"
    ? process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    : undefined;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable",
  );
}

// Schema de Postgres donde viven las tablas. El sitio principal usa "public";
// la versión de sorteos gratis apunta al schema "gratis" de la misma base
// (ver scripts/31-crear-schema-gratis.sql).
export const supabaseDbSchema =
  process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA || "public";

// En rutas de servidor se usa la service role. El navegador recibe únicamente
// la publishable/anon key y queda sujeto a RLS.
export const supabase = createClient(
  supabaseUrl,
  supabaseServerKey || supabasePublishableKey,
  {
    db: { schema: supabaseDbSchema as "public" },
    ...(supabaseServerKey
      ? { auth: { persistSession: false, autoRefreshToken: false } }
      : {}),
  },
);

// Tipos para TypeScript
export interface Sorteo {
  id: string;
  nombre: string;
  descripcion: string | null;
  total_chances: number;
  cantidad_pack_1: number;
  cantidad_pack_2: number;
  cantidad_pack_3: number;
  precio_6_chances: number;
  precio_12_chances: number;
  precio_24_chances: number;
  precio_pack_1_pyg: number;
  precio_pack_2_pyg: number;
  precio_pack_3_pyg: number;
  pack_1_visible: boolean; // Configurar si el pack 1 es visible
  pack_2_visible: boolean; // Configurar si el pack 2 es visible
  pack_3_visible: boolean; // Configurar si el pack 3 es visible
  descripcion_pack_1: string; // Descripción personalizable del pack 1
  descripcion_pack_2: string; // Descripción personalizable del pack 2
  descripcion_pack_3: string; // Descripción personalizable del pack 3
  cantidad_pack_4: number;
  precio_pack_4: number;
  precio_pack_4_pyg: number;
  pack_4_visible: boolean;
  descripcion_pack_4: string;
  cantidad_pack_5: number;
  precio_pack_5: number;
  precio_pack_5_pyg: number;
  pack_5_visible: boolean;
  descripcion_pack_5: string;
  fecha_sorteo: string | null;
  estado: string; // 'activo', 'completo', 'sorteado', 'cerrado'
  imagen_url: string | null;
  titulo_remera: string; // Added titulo_remera field
  carousel_image_1: string | null;
  carousel_image_2: string | null;
  carousel_image_3: string | null;
  carousel_image_4: string | null;
  carousel_image_5: string | null;
  carousel_image_6: string | null;
  carousel_image_7: string | null;
  carousel_image_8: string | null;
  ganador_id: string | null;
  numero_ganador: number | null;
  ganador_nombre: string | null;
  fecha_sorteo_realizado: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comprador {
  id: string;
  sorteo_id: string;
  nombre: string;
  email?: string; // Opcional - el usuario puede elegir no proporcionar email
  telefono?: string; // Puede faltar en registros históricos; es obligatorio en compras nuevas.
  celular?: string;
  instagram_username?: string; // Opcional - solo requerido si elige Instagram como método de contacto
  cantidad_chances: number;
  numeros_asignados: number[];
  precio_pagado: number;
  precio_lista?: number | null;
  promo_codigo_id?: string | null;
  estado_pago: string; // 'pendiente', 'pagado', 'cancelado', 'expirado'
  mercadopago_id?: string | null; // Campo legado, usado también por comprobantes antiguos; no habilita Mercado Pago.
  metodo_pago?: string; // Nuevos registros: 'transferencia' o 'gratuito'; 'mercadopago' solo histórico.
  pais_transferencia?: PaisTransferencia | null;
  moneda?: Moneda;
  datos_encuesta?: Record<string, any>; // Solo participaciones gratuitas (/free): dirección + respuestas de la encuesta
  comprobante_url?: string;
  estado_transferencia?: string; // 'pendiente', 'aprobado', 'rechazado'
  fecha_transferencia?: string;
  admin_revisor?: string;
  notas_admin?: string;
  es_ganador: boolean;
  created_at: string;
  updated_at: string;
}

export interface GanadorPasado {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export type PaisTransferencia = "AR" | "PY";
export type Moneda = "ARS" | "PYG";

export interface CuentaTransferencia {
  banco: string;
  etiqueta: string;
  identificador: string;
  titular: string;
}

export interface ConfiguracionTransferencia {
  argentina: CuentaTransferencia;
  paraguay: CuentaTransferencia;
  avisoTitulo: string;
  avisoTexto: string;
}

export interface GanadorExpress {
  id: string;
  sorteo_id: string;
  numero_ganador: number;
  nombre_ganador: string | null;
  premio_monto: string;
  fecha_premio: string;
  visible: boolean;
  created_at: string;
  updated_at: string;
}
