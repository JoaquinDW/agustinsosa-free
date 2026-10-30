-- Campañas y códigos personales de descuento.
CREATE TABLE IF NOT EXISTS public.promo_campanias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteo_id uuid NOT NULL REFERENCES public.sorteos(id) ON DELETE CASCADE,
  porcentaje integer NOT NULL CHECK (porcentaje BETWEEN 1 AND 90),
  packs_aplicables integer[],
  usos text NOT NULL DEFAULT 'unico' CHECK (usos IN ('unico', 'ilimitado')),
  vence_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_codigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campania_id uuid NOT NULL REFERENCES public.promo_campanias(id) ON DELETE CASCADE,
  codigo text NOT NULL UNIQUE,
  persona_key text NOT NULL,
  nombre text,
  telefono text,
  pais text,
  chances_al_envio integer,
  usos_confirmados integer NOT NULL DEFAULT 0,
  primer_uso_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campania_id, persona_key)
);

ALTER TABLE public.compradores
  ADD COLUMN IF NOT EXISTS promo_codigo_id uuid REFERENCES public.promo_codigos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS precio_lista numeric,
  ADD COLUMN IF NOT EXISTS promo_uso_unico boolean NOT NULL DEFAULT false;

ALTER TABLE public.whatsapp_envios
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'transferencia',
  ADD COLUMN IF NOT EXISTS promo_codigo_id uuid REFERENCES public.promo_codigos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_promo_codigos_campania ON public.promo_codigos (campania_id);
CREATE INDEX IF NOT EXISTS idx_compradores_promo_codigo ON public.compradores (promo_codigo_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_transferencia_pendiente
  ON public.compradores (promo_codigo_id)
  WHERE promo_codigo_id IS NOT NULL AND promo_uso_unico AND metodo_pago = 'transferencia' AND estado_pago = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_whatsapp_envios_promo_codigo ON public.whatsapp_envios (promo_codigo_id, tipo);
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_envio_promo
  ON public.whatsapp_envios (promo_codigo_id) WHERE tipo = 'promo';

ALTER TABLE public.promo_campanias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codigos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.promo_campanias FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_codigos FROM anon, authenticated;

INSERT INTO public.configuracion (clave, valor)
VALUES ('whatsapp_costo_unitario_promo', '0.076')
ON CONFLICT (clave) DO NOTHING;

-- El UPDATE condicional evita que dos confirmaciones gasten a la vez un código único.
CREATE OR REPLACE FUNCTION public.marcar_promo_codigo_usado(p_codigo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE public.promo_codigos pc
  SET usos_confirmados = pc.usos_confirmados + 1,
      primer_uso_at = COALESCE(pc.primer_uso_at, now())
  FROM public.promo_campanias campania
  WHERE pc.id = p_codigo_id
    AND campania.id = pc.campania_id
    AND (campania.usos = 'ilimitado' OR pc.usos_confirmados = 0)
  RETURNING pc.id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.marcar_promo_codigo_usado(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_promo_codigo_usado(uuid) TO service_role;
