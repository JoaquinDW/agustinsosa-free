# Instrucciones para Reducir el Cached Egress de Supabase

## 📊 Problema Identificado

Tu aplicación está generando mucho "Cached Egress" porque trae **todos los compradores** desde Supabase al cliente para calcular estadísticas simples como:
- Total de compradores
- Chances vendidas
- Total recaudado

Por ejemplo, si tienes 1000 compradores, cada vez que alguien visita la página principal, se descargan ~500KB de datos solo para calcular 3 números.

## ✅ Solución Implementada

Hemos creado **funciones SQL optimizadas** que calculan todo en el servidor de Supabase y solo envían el resultado final (menos de 100 bytes).

**Reducción estimada de egress: ~90%**

## 🚀 Pasos para Aplicar la Optimización

### Paso 1: Ejecutar el SQL en Supabase

1. Ve a tu dashboard de Supabase
2. Abre el **SQL Editor**: https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new
3. Copia todo el contenido del archivo: `scripts/17-add-optimized-functions.sql`
4. Pégalo en el SQL Editor
5. Haz click en **"Run"** o presiona `Ctrl/Cmd + Enter`

### Paso 2: Verificar que Funciona

Después de ejecutar el SQL, prueba que las funciones funcionan correctamente:

```sql
-- Probar estadísticas (reemplaza el UUID con el ID de tu sorteo activo)
SELECT * FROM obtener_estadisticas_sorteo('tu-sorteo-id-aqui');

-- Ver resumen completo del sorteo activo
SELECT * FROM obtener_resumen_sorteo_activo();

-- Contar ganadores express visibles
SELECT * FROM obtener_ganadores_express_visibles();
```

Si ves resultados, ¡las funciones están funcionando! ✅

### Paso 3: Ya Está!

El código de TypeScript en `lib/database.ts` ya fue actualizado para usar estas nuevas funciones automáticamente. No necesitas hacer nada más.

## 📈 Beneficios

### Antes de la optimización:
```typescript
// Traía TODOS los compradores al cliente (~500KB)
const compradores = await obtenerTodosLosCompradores()
const total = compradores.length // Calcula en el cliente
```

### Después de la optimización:
```typescript
// Solo trae 3 números desde el servidor (~50 bytes)
const { totalCompradores, chancesVendidas, totalRecaudado } =
  await obtenerEstadisticasSorteo(sorteoId)
```

## 🔍 Funciones Creadas

1. **`obtener_estadisticas_sorteo(sorteo_id)`**
   - Calcula compradores totales, chances vendidas y total recaudado
   - Reducción: de ~500KB a ~50 bytes

2. **`contar_compradores_sorteo(sorteo_id, solo_pagados)`**
   - Solo cuenta compradores sin traer datos
   - Reducción: de ~200KB a ~8 bytes

3. **`contar_chances_vendidas(sorteo_id)`**
   - Cuenta chances únicas vendidas
   - Reducción: de ~300KB a ~8 bytes

4. **`verificar_sorteo_completo(sorteo_id)`**
   - Verifica si el sorteo está completo con porcentaje
   - Reducción: de ~500KB a ~100 bytes

5. **`obtener_ganadores_express_visibles(sorteo_id)`**
   - Trae solo campos necesarios de ganadores express
   - Reducción: ~30% menos datos

6. **`obtener_resumen_sorteo_activo()`**
   - Trae TODO lo necesario para la página principal en una sola llamada
   - Reducción: de múltiples consultas a una sola

## 📊 Monitorear Mejoras

Después de aplicar estos cambios, monitorea tu uso de egress en:
- Dashboard de Supabase → Settings → Usage
- Deberías ver una reducción significativa en "Egress" después de unos días

## 🆘 Solución de Problemas

### Error: "function does not exist"
- Asegúrate de haber ejecutado el SQL completo en el SQL Editor
- Verifica que no hubo errores al ejecutar el script

### Error: "permission denied for function"
- El script incluye comandos `GRANT EXECUTE` para dar permisos
- Asegúrate de que se ejecutaron correctamente

### Los números no coinciden
- Las funciones SQL usan la misma lógica que el código anterior
- Si ves diferencias, puede ser porque las funciones son más precisas (cuentan números únicos correctamente)

## 📝 Notas Adicionales

- Las funciones SQL están marcadas como `STABLE` para que Supabase pueda cachearlas
- Se agregaron índices adicionales para mejorar la velocidad de las consultas
- El código sigue funcionando con el sorteo "default" (localStorage) sin cambios

## 🎯 Próximos Pasos (Opcional)

Si quieres optimizar aún más:

1. **Implementar caché en el cliente** con React Query o SWR
2. **Usar Server Components de Next.js** para reducir aún más el egress
3. **Implementar paginación** en la vista de compradores del backoffice

¿Necesitas ayuda con alguno de estos pasos adicionales?
