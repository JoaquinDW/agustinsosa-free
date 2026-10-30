# Guía de Corrección de Números Duplicados

## 📋 Resumen del Problema

Se detectó un bug crítico de **race condition** en la función `generarNumerosUnicos` que causó que múltiples compradores recibieran los mismos números en sus sorteos.

### Estadísticas del Problema
- **29,967** números asignados en total
- **10,000** números únicos (debería haber 10,000)
- **19,967** números duplicados
- Múltiples compradores afectados

### Causa Raíz
La función `generarNumerosUnicos` leía los números ocupados y generaba nuevos números **sin bloqueo de transacción**, permitiendo que dos requests simultáneos leyeran el mismo estado y asignaran los mismos números.

---

## 🔧 Solución Implementada

### 1. Prevención de Futuros Duplicados

Se creó una función PostgreSQL atómica que usa `FOR UPDATE` para bloquear filas durante la generación de números:

**Archivo:** `scripts/02-fix-duplicate-numbers.sql`
- Función `generar_numeros_unicos_atomico()` con row-level locking
- Funciones de diagnóstico para detectar duplicados
- Funciones para identificar compradores afectados

**Archivo:** `lib/database.ts` (modificado)
- `generarNumerosUnicos()` ahora usa la función PostgreSQL atómica
- Previene completamente las race conditions

### 2. Corrección de Duplicados Existentes

**Archivo:** `scripts/fix-duplicates.ts`
- Script TypeScript para reasignar números
- Estrategia "First Come, First Served": el comprador más antiguo mantiene el número
- Genera reportes detallados de cambios

---

## 📝 Paso a Paso: Cómo Ejecutar la Corrección

### Paso 1: Backup de la Base de Datos (CRÍTICO)

```bash
# Conectarse a Supabase y crear backup
# Opción A: Desde el dashboard de Supabase
# Settings → Database → Backup

# Opción B: Export manual
psql -h <supabase-host> -U postgres -d postgres \
  -c "\copy compradores TO '/tmp/compradores_backup.csv' CSV HEADER"
```

### Paso 2: Aplicar las Funciones SQL

```bash
# Conectarse a Supabase y ejecutar el script SQL
psql -h <supabase-host> -U postgres -d postgres \
  -f scripts/02-fix-duplicate-numbers.sql
```

O desde el dashboard de Supabase:
1. Ir a **SQL Editor**
2. Abrir `scripts/02-fix-duplicate-numbers.sql`
3. Copiar y pegar el contenido
4. Ejecutar el script completo

### Paso 3: Obtener el ID del Sorteo Activo

```bash
# Desde el SQL Editor de Supabase
SELECT id, nombre, estado FROM sorteos WHERE estado = 'activo';
```

Copiar el `id` del sorteo activo.

### Paso 4: Diagnóstico Inicial

```bash
# Verificar el estado actual de duplicados
# En SQL Editor de Supabase:
SELECT * FROM diagnosticar_duplicados('<SORTEO_ID>');
```

Esto mostrará:
- Total de números asignados
- Números únicos
- Cantidad de duplicados
- Compradores afectados

### Paso 5: Ejecutar el Script de Corrección (DRY RUN)

```bash
# Primero, simular la corrección sin hacer cambios
npx tsx scripts/fix-duplicates.ts "<SORTEO_ID>" dry-run
```

Esto generará:
- Reporte de qué cambios se harían
- Lista de compradores afectados
- Números que serían reasignados
- **Sin modificar la base de datos**

### Paso 6: Revisar el Reporte

Abrir el archivo generado:
```
scripts/fix-duplicates-report-YYYY-MM-DD-HH-MM-SS.txt
```

Verificar que:
- Los cambios sean correctos
- Hay suficientes números disponibles
- Los compradores correctos mantienen sus números

### Paso 7: Ejecutar la Corrección Real

```bash
# CUIDADO: Esto modificará la base de datos
npx tsx scripts/fix-duplicates.ts "<SORTEO_ID>" execute
```

### Paso 8: Verificar Resultado

```bash
# Verificar que ya no hay duplicados
# En SQL Editor de Supabase:
SELECT * FROM diagnosticar_duplicados('<SORTEO_ID>');
```

Debería mostrar `numeros_duplicados: 0`

---

## 🔍 Queries de Diagnóstico Útiles

### Ver todos los números duplicados con detalles

```sql
WITH numeros_expandidos AS (
  SELECT
    c.id as comprador_id,
    c.nombre,
    c.sorteo_id,
    c.cantidad_chances,
    c.estado_pago,
    c.created_at,
    unnest(c.numeros_asignados) as numero
  FROM compradores c
  WHERE c.estado_pago = 'pagado'
    AND c.sorteo_id = '<SORTEO_ID>'
),
numeros_duplicados AS (
  SELECT
    numero,
    COUNT(*) as veces_usado
  FROM numeros_expandidos
  GROUP BY numero
  HAVING COUNT(*) > 1
)
SELECT
  nd.numero,
  nd.veces_usado,
  ne.comprador_id,
  ne.nombre,
  TO_CHAR(ne.created_at, 'DD/MM/YYYY HH24:MI:SS') as fecha_compra
FROM numeros_duplicados nd
JOIN numeros_expandidos ne ON nd.numero = ne.numero
ORDER BY nd.numero, ne.created_at;
```

### Ver números disponibles (sin asignar)

```sql
SELECT * FROM obtener_numeros_disponibles_para_reasignacion('<SORTEO_ID>');
```

### Ver compradores que serán modificados

```sql
SELECT
  comprador_nombre,
  numeros_duplicados,
  numeros_unicos,
  fecha_compra
FROM obtener_compradores_con_duplicados('<SORTEO_ID>')
WHERE debe_mantener = false
ORDER BY fecha_compra;
```

---

## 📧 Notificación a Compradores Afectados

Después de corregir los duplicados, **DEBES** notificar a los compradores cuyos números cambiaron.

### Template de Email

```
Asunto: Actualización de tus números del sorteo

Hola [NOMBRE],

Detectamos un error técnico que causó que algunos números fueran asignados
a más de una persona. Para garantizar la equidad del sorteo, hemos corregido
este problema.

TUS NÚMEROS ORIGINALES:
[NÚMEROS_ANTIGUOS]

TUS NÚMEROS ACTUALIZADOS:
[NÚMEROS_NUEVOS]

Tu cantidad total de chances NO ha cambiado: [CANTIDAD_CHANCES] chances.

El sorteo se realizará de manera justa con tus nuevos números. Lamentamos
las molestias y agradecemos tu comprensión.

Si tienes alguna pregunta, no dudes en contactarnos.

Saludos,
[TU NOMBRE/EMPRESA]
```

### Obtener lista de emails de afectados

```sql
SELECT
  c.nombre,
  c.email,
  c.telefono,
  c.instagram_username,
  c.numeros_asignados
FROM compradores c
WHERE c.id IN (
  SELECT comprador_id
  FROM obtener_compradores_con_duplicados('<SORTEO_ID>')
  WHERE debe_mantener = false
);
```

---

## ✅ Checklist de Corrección

- [ ] Backup de base de datos realizado
- [ ] Script SQL ejecutado (`02-fix-duplicate-numbers.sql`)
- [ ] ID del sorteo activo obtenido
- [ ] Diagnóstico inicial ejecutado
- [ ] Dry run ejecutado y reporte revisado
- [ ] Corrección real ejecutada
- [ ] Verificación post-corrección: 0 duplicados confirmado
- [ ] Compradores afectados notificados por email
- [ ] Reporte de corrección guardado para auditoría

---

## 🚨 Prevención para el Futuro

### Monitoreo Automático

Agregar esta query a tu backoffice para ejecutarse cada hora:

```sql
SELECT
  sorteo_id,
  numeros_duplicados
FROM diagnosticar_duplicados()
WHERE numeros_duplicados > 0;
```

Si devuelve resultados, enviar alerta inmediata.

### Testing

Antes de cada deploy, ejecutar tests de concurrencia:

```typescript
// test/generarNumerosUnicos.test.ts
test('debe prevenir duplicados en requests concurrentes', async () => {
  const sorteoId = 'test-sorteo'

  // Simular 10 requests simultáneos
  const promises = Array(10).fill(null).map(() =>
    generarNumerosUnicos(sorteoId, 6)
  )

  const resultados = await Promise.all(promises)
  const todosLosNumeros = resultados.flat()
  const numerosUnicos = new Set(todosLosNumeros)

  // No debe haber duplicados
  expect(todosLosNumeros.length).toBe(numerosUnicos.size)
})
```

---

## 🆘 Troubleshooting

### Error: "No hay suficientes números disponibles"

**Causa:** Hay más duplicados de lo esperado o el sorteo está lleno.

**Solución:**
```sql
-- Ver cuántos números realmente están disponibles
SELECT COUNT(*) FROM obtener_numeros_disponibles_para_reasignacion('<SORTEO_ID>');

-- Ver cuántos necesitamos
SELECT
  SUM(array_length(numeros_duplicados, 1)) as necesarios
FROM obtener_compradores_con_duplicados('<SORTEO_ID>')
WHERE debe_mantener = false;
```

### Error: "función generar_numeros_unicos_atomico no existe"

**Causa:** El script SQL no se ejecutó correctamente.

**Solución:** Re-ejecutar `02-fix-duplicate-numbers.sql` completo.

### Los duplicados persisten después de la corrección

**Causa:** Nuevas ventas ocurrieron durante la corrección.

**Solución:**
1. Pausar ventas temporalmente
2. Re-ejecutar el script de corrección
3. Reanudar ventas

---

## 📞 Soporte

Si encuentras problemas durante la corrección:

1. **NO ejecutar** más correcciones sin revisar
2. Revisar los logs del script (`console.log`)
3. Verificar el estado con `diagnosticar_duplicados()`
4. Si es necesario, restaurar desde el backup

---

## 📚 Referencias

- **Race Condition:** [Wikipedia](https://en.wikipedia.org/wiki/Race_condition)
- **PostgreSQL FOR UPDATE:** [Docs](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- **Supabase RPC Functions:** [Docs](https://supabase.com/docs/guides/database/functions)
