BEGIN;

-- Evita efectos secundarios al reintentar una restauración.
DROP TRIGGER IF EXISTS trg_historial_configuracion ON public.configuracion;
DROP TRIGGER IF EXISTS trigger_validar_numeros_unicos ON public.compradores;

DROP TABLE IF EXISTS public._restore_contenido_historial;
DROP TABLE IF EXISTS public._restore_ganadores_pasados;
DROP TABLE IF EXISTS public._restore_configuracion;
DROP TABLE IF EXISTS public._restore_compradores;

CREATE UNLOGGED TABLE public._restore_contenido_historial (
  id TEXT,
  clave TEXT,
  valor_anterior TEXT,
  reemplazado_at TEXT
);

CREATE UNLOGGED TABLE public._restore_ganadores_pasados (
  id TEXT,
  nombre_ganador TEXT,
  premio TEXT,
  precio_premio TEXT,
  fecha_sorteo TEXT,
  numero_ganador TEXT,
  imagen_1_url TEXT,
  imagen_2_url TEXT,
  imagen_3_url TEXT,
  orden TEXT,
  visible TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE UNLOGGED TABLE public._restore_configuracion (
  clave TEXT,
  valor TEXT,
  updated_at TEXT
);

CREATE UNLOGGED TABLE public._restore_compradores (
  id TEXT,
  sorteo_id TEXT,
  nombre TEXT,
  email TEXT,
  cantidad_chances TEXT,
  numeros_asignados TEXT,
  precio_pagado TEXT,
  estado_pago TEXT,
  mercadopago_id TEXT,
  created_at TEXT,
  updated_at TEXT,
  es_ganador TEXT,
  telefono TEXT,
  metodo_pago TEXT,
  comprobante_url TEXT,
  estado_transferencia TEXT,
  fecha_transferencia TEXT,
  admin_revisor TEXT,
  notas_admin TEXT,
  instagram_username TEXT,
  datos_encuesta TEXT
);

COMMIT;
