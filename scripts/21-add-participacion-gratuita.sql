-- Participación gratuita (página /free)
-- Un participante gratuito es un comprador con:
--   estado_pago = 'pagado' (entra al pool y es elegible para ganar)
--   metodo_pago = 'gratuito' (marca distintiva, solo a modo estadístico)
--   precio_pagado = 0, cantidad_chances = 1
--
-- metodo_pago ya existe (VARCHAR(20)); se reutiliza con el nuevo valor 'gratuito'.
-- estado_pago: 'pendiente', 'pagado', 'cancelado', 'expirado'
-- metodo_pago: 'mercadopago', 'transferencia', 'gratuito'

-- Guarda dirección + todas las respuestas de la encuesta de marketing.
-- Solo se llena para participaciones gratuitas (NULL para compras).
ALTER TABLE compradores
ADD COLUMN IF NOT EXISTS datos_encuesta JSONB;

-- Índice parcial para acelerar el chequeo de "una participación gratuita por email por sorteo".
CREATE INDEX IF NOT EXISTS idx_compradores_gratuito_email
ON compradores (sorteo_id, lower(email))
WHERE metodo_pago = 'gratuito';
