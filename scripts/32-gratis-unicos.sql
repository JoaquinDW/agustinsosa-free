-- Sitio de sorteos gratis: una participación por persona en cada sorteo.
-- Respaldo en la base del chequeo de /api/participacion-gratuita
-- (buscarParticipacionGratuitaDuplicada): si dos envíos iguales llegan a la
-- vez, el segundo INSERT falla en vez de quedar duplicado.

-- Teléfonos de participaciones gratuitas anteriores al formato normalizado
-- (549 + 10 dígitos para Argentina), igual que los guarda ahora la API.
UPDATE gratis.compradores
SET telefono = '549' || telefono
WHERE metodo_pago = 'gratuito'
  AND telefono ~ '^[1-9][0-9]{9}$';

CREATE UNIQUE INDEX IF NOT EXISTS compradores_gratuito_email_unico
  ON gratis.compradores (sorteo_id, lower(email))
  WHERE metodo_pago = 'gratuito' AND email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS compradores_gratuito_telefono_unico
  ON gratis.compradores (sorteo_id, telefono)
  WHERE metodo_pago = 'gratuito';

CREATE UNIQUE INDEX IF NOT EXISTS compradores_gratuito_instagram_unico
  ON gratis.compradores (sorteo_id, (datos_encuesta ->> 'instagram'))
  WHERE metodo_pago = 'gratuito' AND datos_encuesta ? 'instagram';
