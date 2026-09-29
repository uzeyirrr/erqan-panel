#!/bin/sh
set -e

PB="/pb/pocketbase"
ARGS="--dir=/pb/pb_data --hooksDir=/pb/pb_hooks --migrationsDir=/pb/pb_migrations"

# Migration'ları uygula, ardından (verildiyse) superuser hesabını oluştur/güncelle.
$PB migrate up $ARGS
if [ -n "$PB_SUPERUSER_EMAIL" ] && [ -n "$PB_SUPERUSER_PASSWORD" ]; then
  $PB superuser upsert "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" $ARGS
fi

exec $PB serve --http=0.0.0.0:8090 $ARGS
