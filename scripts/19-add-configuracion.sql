-- Tabla de configuración global (key-value)
CREATE TABLE IF NOT EXISTS configuracion (
  clave VARCHAR(100) PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valores por defecto para la cuenta de transferencia
INSERT INTO configuracion (clave, valor)
  VALUES ('alias_transferencia', 'sosamotos')
  ON CONFLICT (clave) DO NOTHING;

INSERT INTO configuracion (clave, valor)
  VALUES ('titular_transferencia', 'Agustín Sosa')
  ON CONFLICT (clave) DO NOTHING;
