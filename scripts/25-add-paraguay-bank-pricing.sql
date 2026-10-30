-- Expansión de cobros por transferencia a Paraguay.
-- Mantiene los campos históricos de precio como ARS y agrega un precio PYG
-- independiente para cada pack.

ALTER TABLE sorteos
  ADD COLUMN IF NOT EXISTS precio_pack_1_pyg INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_pack_2_pyg INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_pack_3_pyg INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_pack_4_pyg INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_pack_5_pyg INTEGER NOT NULL DEFAULT 0;

-- La referencia provista para el lanzamiento usa una relación 1 ARS = 7 PYG.
-- El backoffice permite reemplazar estos importes antes de publicar.
UPDATE sorteos
SET
  precio_pack_1_pyg = CASE WHEN precio_pack_1_pyg = 0 THEN precio_6_chances * 7 ELSE precio_pack_1_pyg END,
  precio_pack_2_pyg = CASE WHEN precio_pack_2_pyg = 0 THEN precio_12_chances * 7 ELSE precio_pack_2_pyg END,
  precio_pack_3_pyg = CASE WHEN precio_pack_3_pyg = 0 THEN precio_24_chances * 7 ELSE precio_pack_3_pyg END,
  precio_pack_4_pyg = CASE WHEN precio_pack_4_pyg = 0 THEN precio_pack_4 * 7 ELSE precio_pack_4_pyg END,
  precio_pack_5_pyg = CASE WHEN precio_pack_5_pyg = 0 THEN precio_pack_5 * 7 ELSE precio_pack_5_pyg END;

ALTER TABLE sorteos
  DROP CONSTRAINT IF EXISTS sorteos_precio_pack_1_pyg_check,
  DROP CONSTRAINT IF EXISTS sorteos_precio_pack_2_pyg_check,
  DROP CONSTRAINT IF EXISTS sorteos_precio_pack_3_pyg_check,
  DROP CONSTRAINT IF EXISTS sorteos_precio_pack_4_pyg_check,
  DROP CONSTRAINT IF EXISTS sorteos_precio_pack_5_pyg_check;

ALTER TABLE sorteos
  ADD CONSTRAINT sorteos_precio_pack_1_pyg_check CHECK (precio_pack_1_pyg >= 0),
  ADD CONSTRAINT sorteos_precio_pack_2_pyg_check CHECK (precio_pack_2_pyg >= 0),
  ADD CONSTRAINT sorteos_precio_pack_3_pyg_check CHECK (precio_pack_3_pyg >= 0),
  ADD CONSTRAINT sorteos_precio_pack_4_pyg_check CHECK (precio_pack_4_pyg >= 0),
  ADD CONSTRAINT sorteos_precio_pack_5_pyg_check CHECK (precio_pack_5_pyg >= 0);

ALTER TABLE compradores
  ADD COLUMN IF NOT EXISTS pais_transferencia VARCHAR(2),
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'ARS';

UPDATE compradores
SET pais_transferencia = 'AR'
WHERE metodo_pago = 'transferencia' AND pais_transferencia IS NULL;

ALTER TABLE compradores
  DROP CONSTRAINT IF EXISTS compradores_pais_transferencia_check,
  DROP CONSTRAINT IF EXISTS compradores_moneda_check;

ALTER TABLE compradores
  ADD CONSTRAINT compradores_pais_transferencia_check
    CHECK (pais_transferencia IS NULL OR pais_transferencia IN ('AR', 'PY')),
  ADD CONSTRAINT compradores_moneda_check CHECK (moneda IN ('ARS', 'PYG'));

CREATE INDEX IF NOT EXISTS idx_compradores_pais_transferencia
  ON compradores(pais_transferencia)
  WHERE metodo_pago = 'transferencia';

-- La cuenta argentina conserva las claves existentes para no perder datos.
INSERT INTO configuracion (clave, valor)
VALUES
  ('banco_transferencia_argentina', ''),
  ('etiqueta_transferencia_argentina', 'Alias'),
  ('banco_transferencia_paraguay', ''),
  ('etiqueta_transferencia_paraguay', 'Número de cuenta'),
  ('alias_transferencia_paraguay', ''),
  ('titular_transferencia_paraguay', '')
ON CONFLICT (clave) DO NOTHING;
