-- Agregar campos para transferencias a la tabla compradores
ALTER TABLE compradores 
ADD COLUMN metodo_pago VARCHAR(20) DEFAULT 'transferencia',
ADD COLUMN comprobante_url VARCHAR(500),
ADD COLUMN estado_transferencia VARCHAR(20) DEFAULT NULL,
ADD COLUMN fecha_transferencia TIMESTAMP DEFAULT NULL,
ADD COLUMN admin_revisor VARCHAR(100) DEFAULT NULL,
ADD COLUMN notas_admin TEXT DEFAULT NULL;

-- Actualizar los estados posibles:
-- estado_pago: 'pendiente', 'pagado', 'cancelado', 'expirado'
-- metodo_pago: 'transferencia' (Mercado Pago deshabilitado)
-- estado_transferencia: 'pendiente', 'aprobado', 'rechazado' (solo para transferencias)
