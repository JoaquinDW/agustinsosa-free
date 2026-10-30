-- Historial automático de la tabla `configuracion`.
-- Cada vez que se sobrescribe el `valor` de una fila (por ejemplo `contenido_sitio`,
-- donde viven los textos de la página y los Términos y Condiciones), se guarda la
-- versión anterior en `contenido_historial`. Garantía a nivel base: aplica sin importar
-- qué cliente hizo el cambio (backoffice, script, API con anon key, etc.).
-- Recuperar una versión previa:
--   SELECT valor_anterior, reemplazado_at
--   FROM contenido_historial
--   WHERE clave = 'contenido_sitio'
--   ORDER BY reemplazado_at DESC;

CREATE TABLE IF NOT EXISTS contenido_historial (
  id             BIGSERIAL   PRIMARY KEY,
  clave          TEXT        NOT NULL,
  valor_anterior TEXT        NOT NULL,
  reemplazado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contenido_historial_clave_fecha
  ON contenido_historial (clave, reemplazado_at DESC);

CREATE OR REPLACE FUNCTION registrar_historial_configuracion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER              -- para insertar en el historial aunque el cliente sea anon
AS $$
BEGIN
  IF OLD.valor IS DISTINCT FROM NEW.valor THEN
    INSERT INTO contenido_historial (clave, valor_anterior)
    VALUES (OLD.clave, OLD.valor);

    -- Conservar solo las últimas 50 versiones por clave.
    DELETE FROM contenido_historial
    WHERE id IN (
      SELECT id FROM contenido_historial
      WHERE clave = OLD.clave
      ORDER BY reemplazado_at DESC
      OFFSET 50
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historial_configuracion ON configuracion;
CREATE TRIGGER trg_historial_configuracion
  BEFORE UPDATE ON configuracion
  FOR EACH ROW EXECUTE FUNCTION registrar_historial_configuracion();

-- El historial es de solo-lectura para los clientes; el INSERT lo hace el trigger
-- (SECURITY DEFINER), no el cliente. Sin políticas de INSERT/UPDATE/DELETE, la anon key
-- no puede alterar ni borrar el historial.
ALTER TABLE contenido_historial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura de historial" ON contenido_historial;
CREATE POLICY "Lectura de historial" ON contenido_historial
  FOR SELECT USING (true);
