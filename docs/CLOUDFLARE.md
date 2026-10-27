# Despliegue en Cloudflare · cultspain.com

## Recursos confirmados

- Cuenta: `88e1f01fc832269f5db483d3499cc7e9`.
- Worker: `cultspain`, vinculado al dominio `cultspain.com`.
- Repositorio: `PadronPadron/cultspain`, rama de producción prevista `main`.
- D1 `cultspain-db`, ID `483999f1-7667-4b24-b70d-6b48dc8f952f`, jurisdicción UE.
- D1 contiene las 12 tablas de la aplicación y `d1_migrations`, con las migraciones `0000_useful_warhawk.sql`, `0001_jittery_post.sql` y `0002_steady_infant_terrible.sql` registradas. Esquema aplicado una vez por la consola del panel; no se han copiado los datos locales de prueba.
- R2 activado por el propietario el 27/10/2026. Bucket `cultspain-documents` creado durante el despliegue, jurisdicción UE y acceso público desactivado, verificados en el panel. Binding `BUCKET` confirmado en el registro de despliegue.

El 26/10/2026 el panel indicó una conexión Git desconectada y una última compilación fallida. No se consideran pruebas de publicación ni la compra del dominio ni la vinculación del repositorio.

El 27/10/2026 se completó el despliegue automático desde `main`. Sitio comprobado en `https://cultspain.com` con el perfil de Olga, catálogo sin precios y calendario cargado desde D1. Archivo administrativo publicado con cambio de fecha/hora. API administrativa sin autenticación: 403; disponibilidad pública: sin contactos ni reservas locales de prueba. El sitio sigue indicando reservas de prueba. El inicio de sesión administrativo requiere terminar el alta de Zero Trust y configurar su aplicación. `keep_vars` conserva la configuración de acceso del panel en futuras publicaciones.

## Preparación antes del primer despliegue

1. R2 activado personalmente por el propietario; el agente no pulsó el botón de suscripción.
2. Bucket `cultspain-documents` creado en jurisdicción UE. Mantener desactivados el acceso público y los dominios públicos para documentos contables.
3. El binding `DB` → `cultspain-db` ya está conectado y verificado. Binding `BUCKET` → `cultspain-documents` también conectado. `cloudflare.production.json` guarda sus nombres e ID.
4. Integración Git reconectada el 27/10/2026: acceso de la aplicación Cloudflare al repositorio `PadronPadron/cultspain` autorizado por el propietario y guardado. El panel muestra el repositorio conectado y la rama `main`.
5. Comandos ya guardados en el panel. Build command: `npm run build:cloudflare`. Deploy command: `npm run deploy:cloudflare`. Root directory: `/`. Worker: `cultspain`.
6. Configurar Cloudflare Access para `/admin.html` y `/api/admin/*` como rutas de una aplicación de acceso restringida a la propietaria. Las rutas públicas `/api/availability` y `/api/bookings` permanecen disponibles para reservas.
7. Configurar en las variables de ejecución `CF_ACCESS_TEAM_DOMAIN` (sin https), `CF_ACCESS_AUD` y `ADMIN_EMAIL`. Nunca poner secretos o sesiones en el repositorio.
8. Antes de activar uso real, confirmar servicios, duraciones, horario, datos de contacto, avisos y política de privacidad; revisar protección antiabuso de la reserva pública, copias de seguridad y sistema fiscal con la asesoría.

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

## Catálogo sin precios · 27/10/2026

La migración `0002_steady_infant_terrible.sql` diferencia las nuevas reservas sin importe de las operaciones históricas. Aplicada localmente y en D1 remoto el 27/10/2026; verificados la columna `price_confirmed` y el registro de las tres migraciones. No modifica importes ni borra registros anteriores. El catálogo público no tiene precios. Los cobros se registran manualmente en el salón.
