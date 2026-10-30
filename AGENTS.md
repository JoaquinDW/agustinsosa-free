# Regla permanente de pagos

- El único medio de pago habilitado es transferencia bancaria.
- Todo flujo de Mercado Pago debe permanecer comentado, deshabilitado y oculto. Jamás descomentar, reactivar, enlazar ni ofrecer Mercado Pago en la interfaz, APIs o páginas de retorno.
- Al modificar checkout, promociones o pagos, comprobar que `/api/crear-preferencia`, `/api/mercadopago` y `/api/confirmar-pago` sigan deshabilitados y que `/pago/exito`, `/pago/error` y `/pago/pendiente` sigan ocultas.
- Las referencias históricas a columnas `mercadopago_id` pueden permanecer para compatibilidad con datos de transferencias anteriores; no son autorización para reactivar el flujo.
