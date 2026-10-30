-- Migración: Agregar campo instagram_username y hacer email opcional
-- Fecha: 2025-11-08

-- 1. Agregar campo instagram_username
ALTER TABLE compradores
ADD COLUMN IF NOT EXISTS instagram_username VARCHAR(255);

-- 2. Hacer el campo email opcional (nullable)
ALTER TABLE compradores
ALTER COLUMN email DROP NOT NULL;

-- 3. Agregar comentario para documentación
COMMENT ON COLUMN compradores.instagram_username IS 'Usuario de Instagram del comprador (sin @). Se usa cuando el comprador elige Instagram como método de contacto en lugar de WhatsApp';
COMMENT ON COLUMN compradores.email IS 'Email del comprador (opcional). El usuario debe proporcionar al menos un método de contacto: telefono (WhatsApp) o instagram_username';
