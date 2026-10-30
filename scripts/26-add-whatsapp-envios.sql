-- Registro de mensajes de WhatsApp enviados (Twilio) para el reporte de
-- costos, y configuración de costo/margen.

CREATE TABLE IF NOT EXISTS public.whatsapp_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comprador_id uuid REFERENCES public.compradores(id) ON DELETE SET NULL,
  sorteo_id uuid,
  telefono text,
  provider text,               -- 'twilio'
  provider_message_id text,    -- sid de Twilio
  estado text,                 -- 'enviado' | 'error'
  costo_unitario numeric,      -- snapshot del costo por mensaje al momento del envío
  moneda text DEFAULT 'USD',
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_envios_created_at ON public.whatsapp_envios (created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_envios_sorteo_id ON public.whatsapp_envios (sorteo_id);

-- Igual que compradores (ver 24-admin-preview-security.sql): fuera de la Data
-- API pública. Solo se accede con la service role desde rutas de servidor.
ALTER TABLE public.whatsapp_envios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_envios FROM anon, authenticated;

-- Config de costos/margen (tabla configuracion key-value ya existente)
INSERT INTO public.configuracion (clave, valor) VALUES
  ('whatsapp_costo_unitario', '0.05'),
  ('whatsapp_moneda', 'USD'),
  ('whatsapp_margen', '0.20')            -- 20%
ON CONFLICT (clave) DO NOTHING;
