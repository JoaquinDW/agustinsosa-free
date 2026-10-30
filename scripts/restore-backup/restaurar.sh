#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "$script_dir/../.." && pwd)"

historial_csv="$project_dir/.context/attachments/i3fMQy/contenido_historial_rows.csv"
ganadores_csv="$project_dir/.context/attachments/gBJ9XF/ganadores_pasados_rows.csv"
configuracion_csv="$project_dir/.context/attachments/3YnUEW/configuracion_rows.csv"
compradores_csv="$project_dir/.context/attachments/oPHfcc/compradores_rows (2).csv"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Falta SUPABASE_DB_URL. Copia la conexion Session pooler desde Supabase > Connect." >&2
  echo "Ejemplo: SUPABASE_DB_URL='postgresql://...' pnpm restore:supabase" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "No se encontro psql en PATH." >&2
  exit 1
fi

for csv_path in \
  "$historial_csv" \
  "$ganadores_csv" \
  "$configuracion_csv" \
  "$compradores_csv"
do
  if [[ ! -f "$csv_path" ]]; then
    echo "No se encontro el backup: $csv_path" >&2
    exit 1
  fi
  if [[ "$csv_path" == *"'"* ]]; then
    echo "La ruta contiene una comilla simple y no puede usarse con psql: $csv_path" >&2
    exit 1
  fi
done

psql_args=(--dbname "$SUPABASE_DB_URL" --set ON_ERROR_STOP=1 --no-psqlrc)

echo "1/8 Creando el esquema..."
psql "${psql_args[@]}" --file "$script_dir/01-schema.sql"

echo "2/8 Preparando tablas temporales de carga..."
psql "${psql_args[@]}" --file "$script_dir/02-prepare-staging.sql"

echo "3/8 Cargando configuracion..."
psql "${psql_args[@]}" --command="\copy public._restore_configuracion FROM '$configuracion_csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"

echo "4/8 Cargando historial de contenido..."
psql "${psql_args[@]}" --command="\copy public._restore_contenido_historial FROM '$historial_csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"

echo "5/8 Cargando ganadores pasados..."
psql "${psql_args[@]}" --command="\copy public._restore_ganadores_pasados FROM '$ganadores_csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"

echo "6/8 Cargando compradores..."
psql "${psql_args[@]}" --command="\copy public._restore_compradores FROM '$compradores_csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"

echo "7/8 Convirtiendo tipos, mezclando y verificando..."
psql "${psql_args[@]}" --file "$script_dir/03-merge-and-verify.sql"

echo "8/8 Configurando Supabase Storage..."
psql "${psql_args[@]}" --file "$script_dir/04-storage.sql"

echo "Restauracion terminada y verificada."
