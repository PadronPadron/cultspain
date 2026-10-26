# Despliegue en Cloudflare · cultspain.com

## Recursos confirmados

- Cuenta: `88e1f01fc832269f5db483d3499cc7e9`.
- Worker: `cultspain`, vinculado al dominio `cultspain.com`.
- Repositorio: `PadronPadron/cultspain`, rama de producción prevista `main`.
- D1 `cultspain-db`, ID `483999f1-7667-4b24-b70d-6b48dc8f952f`, jurisdicción UE.
- D1 contiene las 12 tablas de la aplicación y `d1_migrations`, con las migraciones `0000_useful_warhawk.sql` y `0001_jittery_post.sql` registradas. Esquema aplicado una vez por la consola del panel; no se han copiado los datos locales de prueba.
- R2 todavía no está activado en la cuenta. El nombre previsto es `cultspain-documents`, jurisdicción UE, acceso público desactivado.

El 26/10/2026 el panel indicó una conexión Git desconectada y una última compilación fallida. No se consideran pruebas de publicación ni la compra del dominio ni la vinculación del repositorio.

## Preparación antes del primer despliegue

1. La propietaria activa R2 desde su cuenta. El botón del panel acepta condiciones y una suscripción con cobro por uso; el agente no ha pulsado ese botón.
2. Crear el bucket `cultspain-documents` en jurisdicción UE. No habilitar URL pública ni dominio público para documentos contables.
3. El binding `DB` → `cultspain-db` ya está conectado y verificado. Conectar `BUCKET` → `cultspain-documents` en el Worker. `cloudflare.production.json` guarda sus nombres e ID.
4. Reconectar la integración Git del Worker con `PadronPadron/cultspain` si el panel sigue mostrando la desconexión.
5. Comandos ya guardados en el panel. Build command: `npm run build:cloudflare`. Deploy command: `npm run deploy:cloudflare`. Root directory: `/`. Worker: `cultspain`.
6. Configurar Cloudflare Access para `/admin.html` y `/api/admin/*` como rutas de una aplicación de acceso restringida a la propietaria. Las rutas públicas `/api/availability` y `/api/bookings` permanecen disponibles para reservas.
7. Configurar en las variables de ejecución `CF_ACCESS_TEAM_DOMAIN` (sin https), `CF_ACCESS_AUD` y `ADMIN_EMAIL`. Nunca poner secretos o sesiones en el repositorio.
8. Antes de activar uso real, confirmar servicios, precios, horario, datos de contacto, avisos y política de privacidad; revisar protección antiabuso de la reserva pública, copias de seguridad y sistema fiscal con la asesoría.

El backend comprueba criptográficamente firma, emisor, audiencia, expiración y email de los JWT de Access. Sin configuración válida rechaza el acceso administrativo. El acceso local sin login solo existe en desarrollo sobre loopback. Una cabecera con un nombre o email por sí sola no concede permisos.

## Compilación

```sh
npm ci
npm test
npm run typecheck
npm run build:cloudflare
```

Vinext genera el Worker y los assets. `scripts/prepare-cloudflare.mjs` adapta el archivo generado `dist/server/wrangler.json` a los recursos de esta cuenta. Conserva la configuración fuente y no modifica ni despliega los recursos por sí mismo.

El despliegue a la cuenta requiere autorización Cloudflare válida. El CLI local no tiene sesión vigente. El panel web sí permitió crear D1; no se han extraído credenciales del navegador.

## Migraciones posteriores

Añadir cambios en `db/schema.ts` y ejecutar `npm run db:generate`. Revisar el SQL nuevo; las migraciones aplicadas son inmutables. Tras compilar, ejecutar `npm run db:migrate:cloudflare` con permisos D1 antes del despliegue. Este comando modifica la base remota. El token de compilación debe tener los permisos correspondientes. No ejecutar de nuevo manualmente el SQL inicial: ya está aplicado y registrado en la base remota.

## Referencias

[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [configuración Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/), [validación del token Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/).
