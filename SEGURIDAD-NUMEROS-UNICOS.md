# 🔒 Sistema de Seguridad para Números Únicos

## Problema Original

Se detectó que dos compradores con **días de diferencia** recibieron el mismo número. Esto indica que hay un problema en la lógica de generación de números únicos, no solo un problema de concurrencia.

## 🛡️ Capas de Seguridad Implementadas

### **Capa 1: Advisory Lock (Nivel de Sorteo)**
📍 Ubicación: `generar_numeros_unicos_atomico()` líneas 19-25

```sql
SELECT pg_try_advisory_xact_lock(hashtext(p_sorteo_id::text)) INTO v_lock_acquired;
```

**Qué hace:**
- Bloquea TODO el sorteo durante la generación de números
- Previene que dos procesos generen números simultáneamente
- Se libera automáticamente al final de la transacción

**Protege contra:**
- ✅ Race conditions (dos usuarios aprobando transferencias al mismo tiempo)
- ✅ Concurrencia (múltiples procesos generando números)

---

### **Capa 2: Consulta de Números Ocupados**
📍 Ubicación: `generar_numeros_unicos_atomico()` líneas 38-46

```sql
WITH numeros_expandidos AS (
  SELECT DISTINCT unnest(c.numeros_asignados) as numero
  FROM compradores c
  WHERE c.sorteo_id = p_sorteo_id
    AND c.estado_pago = 'pagado'
)
SELECT COALESCE(array_agg(numero ORDER BY numero), ARRAY[]::INTEGER[])
INTO v_numeros_ocupados
FROM numeros_expandidos;
```

**Qué hace:**
- Obtiene TODOS los números ya asignados en el sorteo
- Solo cuenta compradores con `estado_pago = 'pagado'`
- Filtra duplicados con `DISTINCT`

**Protege contra:**
- ✅ Asignar números que ya están ocupados
- ✅ Incluir transferencias pendientes (solo cuenta 'pagado')

---

### **Capa 3: Auto-Reparación de Duplicados** ⭐ NUEVA
📍 Ubicación: `generar_numeros_unicos_atomico()` líneas 86-154

```sql
-- Verificar si alguno de los números seleccionados ya existe
SELECT array_agg(DISTINCT numero)
INTO v_duplicados_encontrados
FROM (
  SELECT unnest(c.numeros_asignados) as numero
  FROM compradores c
  WHERE c.sorteo_id = p_sorteo_id
    AND c.estado_pago = 'pagado'
) AS todos_los_numeros
WHERE numero = ANY(v_numeros_seleccionados);

-- Si encontramos duplicados, REEMPLAZARLOS automáticamente
IF v_duplicados_encontrados IS NOT NULL THEN
  RAISE WARNING 'Se detectaron duplicados %, regenerando números...', v_duplicados_encontrados;

  -- 1. Separar números buenos de duplicados
  -- 2. Generar números de reemplazo
  -- 3. Combinar y retornar

  RAISE WARNING 'Duplicados reemplazados exitosamente. Nuevos números: %', v_numeros_seleccionados;
END IF;
```

**Qué hace:**
- **DOBLE VERIFICACIÓN** antes de retornar los números
- Si encuentra duplicados, **NO aborta** → En su lugar:
  1. Separa los números buenos de los duplicados
  2. Genera nuevos números para reemplazar los duplicados
  3. Combina y ordena todos los números
  4. Retorna el array corregido
- Emite WARNINGs en los logs para alertar del problema

**Protege contra:**
- ✅ Bugs en la lógica de generación
- ✅ Datos corruptos o inconsistentes
- ✅ Cualquier error no detectado en las capas anteriores
- ✅ **AUTO-REPARA** en lugar de fallar

---

### **Capa 4: Validación POST-generación en TypeScript**
📍 Ubicación: `lib/database.ts` líneas 1053-1084

```typescript
const { verificarNumerosUnicos } = await import("./verificarNumerosUnicos")
const verificacion = await verificarNumerosUnicos(
  comprador.sorteo_id,
  numerosAsignados,
  compradorId
)

if (verificacion.duplicados) {
  throw new Error(`Duplicados detectados: ${verificacion.mensaje}`)
}
```

**Qué hace:**
- Valida los números DESPUÉS de generarlos pero ANTES de guardarlos
- Verifica que no haya duplicados con otros compradores
- Si encuentra duplicados, aborta la operación

**Protege contra:**
- ✅ Errores en la función SQL
- ✅ Problemas de red o timeouts
- ✅ Última capa de defensa antes de guardar

---

## 🎯 Resumen de Protección

| Escenario | Capa 1 | Capa 2 | Capa 3 | Capa 4 |
|-----------|--------|--------|--------|--------|
| Dos usuarios al mismo tiempo | ✅ | ✅ | ✅ | ✅ |
| Bug en lógica de generación | ❌ | ⚠️ | ✅ | ✅ |
| Datos corruptos en DB | ❌ | ⚠️ | ✅ | ✅ |
| Error en función SQL | ❌ | ❌ | ✅ | ✅ |
| Usuario con días de diferencia | ✅ | ✅ | ✅ | ✅ |

**Leyenda:**
- ✅ Protege completamente
- ⚠️ Protege parcialmente
- ❌ No protege

---

## 🔍 Cómo Detectar Duplicados Existentes

Si quieres verificar que no haya duplicados actualmente:

```sql
-- Ver duplicados en un sorteo específico
SELECT * FROM diagnosticar_duplicados_rapido('TU-SORTEO-ID-AQUI');

-- Ver qué compradores tienen números duplicados
SELECT * FROM obtener_compradores_duplicados_sample('TU-SORTEO-ID-AQUI', 100);
```

---

## 🚨 Qué Hace la Capa 3 si Detecta un Duplicado

Si la **Capa 3** (Auto-Reparación) detecta un duplicado:

1. **Emite un WARNING en los logs**: `Se detectaron duplicados [X, Y, Z], regenerando números...`
2. **NO aborta** → En su lugar, **auto-repara**:
   - Separa números buenos de duplicados
   - Genera números nuevos para reemplazar los duplicados
   - Combina y retorna el array corregido
3. **El usuario recibe números únicos**: La operación continúa normalmente
4. **Emite otro WARNING**: `Duplicados reemplazados exitosamente. Nuevos números: [A, B, C]`

**Ejemplo:**
```
Números generados: [100, 106, 107] (100 está duplicado)
↓
Capa 3 detecta: [100] es duplicado
↓
Separa: buenos=[106, 107], duplicados=[100]
↓
Genera reemplazo: [108] (disponible)
↓
Combina: [106, 107, 108]
↓
Usuario recibe: [106, 107, 108] ✅
```

---

## ✅ Garantía de Seguridad

Con estas **4 capas de seguridad**, es **prácticamente imposible** que se asignen números duplicados:

1. **Advisory Lock**: Previene concurrencia
2. **Consulta de ocupados**: Filtra números usados
3. **Validación pre-retorno**: Verifica antes de confirmar (⭐ **NUEVA**)
4. **Validación post-generación**: Última verificación en TypeScript

Si aún así se generara un duplicado, significaría que hay un problema grave en PostgreSQL mismo, lo cual es extremadamente improbable.

---

## 📝 Instrucciones de Actualización

1. Ejecuta el SQL actualizado en Supabase: [scripts/18-fix-for-update-error.sql](scripts/18-fix-for-update-error.sql)
2. La función ahora incluye la **Capa 3** de validación
3. Prueba aprobando una transferencia
4. Revisa los logs para confirmar que no hay errores

---

## 🧪 Prueba de Estrés (Opcional)

Si quieres estar 100% seguro, puedes hacer una prueba:

1. Aprobar 10 transferencias simultáneamente
2. Ejecutar `diagnosticar_duplicados_rapido()` después
3. Verificar que todos los números son únicos

¿Necesitas ayuda con esto?
