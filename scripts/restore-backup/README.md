# Restauración de los backups CSV

Este procedimiento reconstruye las tablas necesarias de la aplicación e importa
los cuatro CSV guardados antes de eliminar el proyecto. La carga es repetible:
usa `UPSERT`, conserva UUID y timestamps, y valida los resultados antes de
confirmar la transacción final.

## Qué recupera

- 9 filas de `configuracion`.
- 31 filas de `contenido_historial`.
- 16 filas de `ganadores_pasados`.
- 1.110 filas de `compradores`.
- 9.999 números pagados, todos únicos.
- Los buckets `sorteo-images`, `comprobantes`, `tshirt-previews` y
  `contenido-packs` con sus límites y políticas.

El backup no contiene la tabla `sorteos`. Todos los compradores apuntan al mismo
UUID, por lo que el script crea esa fila con los datos que sí se pudieron inferir:
premio `IPHONE 17 PRO MAX`, fecha `2026-07-10` y 9.999 participaciones. Una
captura posterior permitió recuperar también el estado final y el resultado:
**Acosta Alcides Ariel**, número **8326**, publicado el 11/07/2026. Los precios,
descripciones e imágenes exactos del sorteo no se pueden reconstruir a partir de
estos cuatro archivos.

## Ejecutar

1. Crear un proyecto nuevo en Supabase.
2. Abrir **Connect** y copiar la conexión **Session pooler** (puerto 5432).
3. Desde la raíz de este repositorio ejecutar:

   ```bash
   SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres' \
     pnpm restore:supabase
   ```

También se puede ejecutar directamente:

```bash
SUPABASE_DB_URL='postgresql://...' bash scripts/restore-backup/restaurar.sh
```

La contraseña solamente se pasa al proceso; no se guarda en el repositorio. Si
contiene caracteres especiales y la URL copiada por Supabase no los codificó,
hay que codificarlos para una URL.

El resultado correcto termina mostrando:

```text
 configuraciones | versiones_contenido | ganadores_pasados | compradores | numeros_pagados_unicos
               9 |                  31 |                 16 |        1110 |                    9999
```

Luego hay que reemplazar en `.env.local` y en Vercel las credenciales del proyecto
eliminado:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o la publishable key compatible)
- `SUPABASE_SECRET_KEY` (o la clave legacy `SUPABASE_SERVICE_ROLE_KEY`)

## Límites importantes

- Supabase Storage no forma parte de estos CSV. Hay 1.096 referencias a imágenes
  y comprobantes del proyecto eliminado; esas URLs no volverán a funcionar sin
  una copia separada de los archivos. El script no inventa ni modifica esas URLs.
- No hay backup de `ganadores_express` ni de otros posibles sorteos.
- El esquema conserva las políticas amplias que necesita la aplicación actual,
  cuyo backoffice usa la anon key desde el navegador. Eso también permite acceso
  excesivo a datos personales de `compradores` a través del Data API. Antes de
  volver a publicar el proyecto se debería mover el backoffice a Supabase Auth o
  a rutas de servidor con `service_role` y restringir RLS.

La importación manual desde Table Editor también es posible por tamaño, pero no
es la mejor opción en este caso: `compradores.sorteo_id` necesita una fila padre y
`numeros_asignados` viene en JSON (`[1,2]`) mientras PostgreSQL espera un array
(`{1,2}`). El importador resuelve ambas diferencias y hace rollback ante errores.
