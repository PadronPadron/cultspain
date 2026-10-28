# WhatsApp del salón — preparación y activación

Estado inicial: Telegram sigue activo. Añadir el código de WhatsApp no vincula el teléfono, no abre sesiones, no crea cuentas del proveedor y no envía mensajes reales por sí solo.

## Consentimiento y acceso

Se ha elegido usar el número de Olga. Antes de vincularlo hay que explicar y obtener aprobación explícita para que GREEN-API se convierta en un dispositivo de esa cuenta: el proveedor puede acceder también a mensajes personales. No se debe presentar como un permiso limitado a una sola conversación. Puede haber desconexiones o restricciones del número. La titular puede revocar el dispositivo desde WhatsApp. No aceptar acuerdos ni escanear códigos sin la intervención/autorización de la titular.

El servidor de CULT SPAIN descarta los chats personales y los grupos no seleccionados; solo guarda referencias de avisos, vínculo temporal del grupo y cambios auditados. No se envían nombre, email ni teléfono de clientes en los avisos. La comparación de miembros se hace con el grupo actual; no exige ser administrador. El actor de WhatsApp en la auditoría es una huella, sin el teléfono completo.

## Conexión

1. La titular crea una cuenta en https://console.green-api.com/ y una instancia exclusiva para CULT SPAIN. Aceptación de condiciones y cualquier pago los realiza la titular. Se puede evaluar el plan Developer con su límite de tres chats; comprobar el plan vigente antes de contratar.
2. La titular vincula su cuenta desde WhatsApp → Dispositivos vinculados. No guardar QR, sesiones ni tokens en Git ni pegarlos en el chat.
3. En el Worker de Cloudflare: `WHATSAPP_API_URL` = `apiUrl`; `WHATSAPP_INSTANCE_ID` = `idInstance`; `WHATSAPP_API_TOKEN` = `apiTokenInstance`, como Secret. `keep_vars: true` preserva valores existentes.
4. En Administración → Avisos: revisar la información de acceso, marcar la autorización y generar el comando. El servidor verifica la sesión y no sobrescribe otro webhook. El comando `VINCULAR …` caduca en diez minutos; se envía en el grupo del salón desde el teléfono.
5. Pulsar Comprobar grupo. Se comprueba pertenencia actual y se manda un mensaje de prueba sin datos de clientes. Responder a ESE mensaje con `VERIFICAR` dentro de una hora. Actualizar estado en la administración.
6. Activar WhatsApp para nuevas solicitudes. La activación se bloquea si no están verificados recepción y respuesta. Los avisos anteriores mantienen su canal; Telegram no se desinstala. Se puede volver a Telegram desde Avisos.

## Gestión de citas

Responder citando el aviso con `Confirmar` o `Rechazar`. También se reconocen los equivalentes rusos exactos. No se ejecutan órdenes ambiguas ni respuestas sin la referencia del mensaje. Se aceptan tanto mensajes entrantes de otros miembros como mensajes enviados por Olga desde su teléfono; los ecos de envíos del API se ignoran.

El webhook público requiere el secreto Bearer configurado automáticamente en GREEN-API. Se verifican instancia, grupo actual, miembro actual, ID del aviso original, estado pendiente y fecha/hora actuales. Las respuestas duplicadas o a avisos antiguos no vuelven a modificar la cita. Cambio, auditoría y nuevo aviso se guardan juntos en D1; se intenta entregar el estado actualizado de inmediato y cron reintenta si falla.

## Pruebas

- `npm test`
- `npm run typecheck`
- `node --experimental-vm-modules tests/whatsapp.integration.mjs` (SQLite aislado y transporte simulado; no usa una cuenta real ni red externa).
- `node tests/approval.integration.mjs` y `node tests/reschedule.integration.mjs` (solo servidor local).

Prueba real de teléfono y grupo pendiente hasta que la titular autorice y vincule la cuenta.

## Referencias

- https://green-api.com/en/docs/before-start/
- https://green-api.com/en/docs/api/account/SetSettings/
- https://green-api.com/en/docs/api/receiving/technology-webhook-endpoint/
- https://green-api.com/en/docs/api/receiving/notifications-format/outgoing-message/QuotedMessage/
- https://green-api.com/en/docs/api/groups/GetGroupData/
