-- Añadir campo telefono a la tabla compradores
ALTER TABLE public.compradores 
ADD COLUMN IF NOT EXISTS telefono TEXT;

-- Comentario sobre la columna
COMMENT ON COLUMN public.compradores.telefono IS 'Número de teléfono del comprador';
