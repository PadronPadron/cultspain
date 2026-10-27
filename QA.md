# Verificación · 26/10/2026

- Diez pruebas unitarias superadas: agenda, huecos y margen, conflictos, importes, fechas, tipos de archivo y validación JWT de Access.
- TypeScript y compilación de Worker superados.
- Integración D1/R2 local: altas, edición y rechazo de revisión obsoleta; precio histórico de gasto conservado; correcciones con motivo y auditoría; pedido con total; subida y descarga con bytes idénticos; rechazo de archivo con extensión falsa; API pública sin contactos; dos peticiones simultáneas al mismo hueco producen una reserva; archivo recuperable.
- En Chrome: creados y editados proveedor y material de ejemplo; gasto de 2 tubos a 12,50 € = 25 €; pedido de 4 tubos = 50 €; formularios y mensajes en español. Datos de ejemplo identificados como tales.
- Exportación ZIP completada desde la interfaz. Archivos descargados comprobables en Downloads. Formato ZIP y CRC verificados también con Python. La extensión no notificó el evento download aunque Chrome sí guardó los archivos.
- La subida por selector automatizado está limitada por el permiso file URLs de la extensión. No se cambió ese permiso. La API de subida, el contenido original y la descarga se verificaron de forma independiente; se adjuntó una captura de ejemplo a un gasto local.
- Cloudflare: D1 creada en UE, SQL aplicado y listado de tablas verificado en el panel. R2 bloqueado por la activación de la suscripción. No se aceptaron condiciones ni cargos.
- Los datos de pruebas están archivados, se conserva el historial y los originales; no se introdujeron en la base de producción. Los ejemplos visibles son ficticios y editables.

Pendientes antes del uso real: R2 remoto, integración Git, bindings y Access, comprobación final del despliegue, servicios/horario reales, notificaciones, reglas fiscales y respaldo remoto.

## Catálogo y presentación · 27/10/2026

- 12 pruebas unitarias y comprobación TypeScript superadas.
- Prueba API específica: Corte + barba reserva 60 min y queratina reserva una consulta de 30 min, sin importe; se ignoran importes y duraciones enviados por el cliente. Citas de prueba canceladas y sus clientes archivados.
- Verificados en navegador los grupos de servicios, la selección de Corte + barba y la consulta de queratina. Sin símbolos monetarios en el sitio público y sin desbordamiento horizontal en escritorio ni a 390 px. Perfil de Olga comprobado visualmente.
- Migración 0002 aplicada localmente y en D1 remoto sin alterar importes históricos; columna y registro de migraciones verificados en la consola de Cloudflare.
- Acceso de Cloudflare al repositorio autorizado y guardado; integración Git conectada en el panel del Worker. Pendientes R2, Access y publicación comprobada.

## Cambios de cita y CRM · 27/10/2026

- Integración local: creación automática de cliente con cada reserva, reutilización de la ficha con nombre/apellidos/teléfono coincidentes e historial con dos citas.
- Cambio de hora y de fecha conserva cliente, servicio, duración e importe sin registrar. Rechaza hueco ocupado, día cerrado y cambio desde una versión obsoleta. Fallo conserva la cita original; traslado y cancelación liberan el horario y quedan auditados.
- Interfaz Chrome: modal Cambiar fecha y hora, selección de horas libres y guardado de 10:00 a 11:00 comprobados. Datos propios de prueba cancelados y clientes archivados.
- R2 remoto: bucket UE `cultspain-documents`, Public Access Disabled, binding confirmado. Primera compilación y despliegue de Worker completados; comprobación del dominio y autenticación administrativa pendientes.
- Dominio comprobado después: `cultspain.com` muestra el sitio y el calendario; `/api/availability` devuelve el horario sin contactos ni citas locales; `/api/admin/state` sin sesión devuelve 403. `admin.js` publicado contiene la función y el botón de cambio de fecha/hora. Pendiente la activación verificable de Zero Trust y prueba de entrada del propietario; no se presenta como autenticación terminada.

## Aprobación, acceso y Telegram · 27/10/2026

- Inicio del propietario completado; administración cargada desde D1 y otra pestaña abierta sin pedir otro código. Aplicación y política de Access: un mes. One-time PIN, HTTP Only y Binding Cookie activados. Rutas `/admin*` y `/api/admin/*` protegidas.
- Prueba en producción: una reserva ficticia creó ficha CRM con nombre, apellidos, teléfono y email. Cambio de fecha y hora desde su ficha comprobado; no se copiaron registros locales a producción.
- 15 pruebas unitarias superadas, integración de aprobación y traslado superada, TypeScript y compilación superados antes de añadir el evento programado.
- Solicitud nueva en estado pendiente: bloquea el horario, no permite completar sin aprobación, la propietaria confirma y queda auditoría; aprobación duplicada rechazada. Cancelación libera horario.
- Cola de avisos guardada junto a cada cambio. Sin bot configurado conserva los avisos. Pruebas del API Telegram con transporte simulado: errores no contienen el token y la vinculación solo acepta un comando exacto y reciente dentro de un grupo. Envío real pendiente de vincular el grupo.

- Telegram: comprobación real de token con getMe, bot cultspainBot, sin webhook externo. Token cifrado como Secret en el panel. Las respuestas no imprimen credenciales.
- Botones: 16 pruebas unitarias, TypeScript, pruebas de aprobación/traslado y compilación superadas. Validación de mensaje/chat y pertenencia al grupo; rechazo de una acción basada en estado obsoleto. Prueba real de pulsación en Telegram todavía pendiente.

## Comprobación real de Telegram · 27/10/2026

- Webhook activado y verificado en el grupo CultSpainCitas. Solicitud sin secreto al webhook: 403.
- Solicitud ficticia de la web creó ficha CRM y aviso enviado (ID de mensaje registrado). El propietario pulsó Confirmar cita en el grupo; CRM pasó a Confirmada y D1 registró el actor Telegram member.
- La cita de prueba fue cancelada desde el formulario de la administración; D1 confirmó estado cancelled y la auditoría de confirmación anterior conservada. Clientes de las dos pruebas propias archivados de forma recuperable y auditada, sin borrar citas ni modificar clientes reales.
- La lista de citas se actualiza automáticamente cada 15 segundos cuando está visible y no hay formulario activo, con botón Actualizar. El mensaje del bot se actualiza al estado final tras pulsar una acción.
- 16 pruebas unitarias, integración D1 de aprobación y traslado, TypeScript y compilación superados. Las migraciones 0000–0004 están aplicadas en local y D1 remoto.

- La cola descarta avisos cuyo estado, fecha u hora ya fueron sustituidos, para no enviar una confirmación antigua después de cancelar. 17 pruebas unitarias incluidas estas transiciones.

## Revisión móvil · 27/10/2026

- Chrome con viewport 320×667, 375×667, 390×844, 430×932, 768×1024 y 844×390; comparación escritorio 1280×800. Sin desbordamiento ni recorte lateral de los descendientes del contenido público. Administración sin desbordamiento del documento; las tablas conservan desplazamiento horizontal intencionado.
- Menú móvil, catálogo por categorías, consulta de queratina, servicio Corte + barba, navegación de meses, días cerrados, selección de hora y pasos Servicio / Día y hora / Datos comprobados. Botón principal visible en el primer pantallazo de teléfono vertical. Campos de 16 px y controles táctiles ampliados; no se probó Safari en un iPhone físico.
- Validación de nombre y teléfono, aceptación de teléfono con prefijo/paréntesis/guiones, envío de una solicitud local y creación CRM comprobados. Desde móvil: confirmación, traslado a otro día/hora, cancelación, horario liberado y ficha editable. Solo el cliente propio de prueba fue archivado; historial conservado.
- Selector móvil de las diez secciones, acción Gestionar junto a la fecha, formularios de gastos/materiales/proveedores/pedidos/documentos a 320 px, sin campos fuera del diálogo. Se conserva la navegación de escritorio.
- Servidor QA aislado simuló HTTP 503 para disponibilidad: menú y catálogo funcionaron, calendario y envío permanecieron desactivados. Reintentar calendario recuperó los huecos reales al restaurar el API.
- TypeScript, 17 pruebas unitarias, integración D1 de CRM/traslado/conflictos/cancelación y compilación Cloudflare superados. Pruebas de reserva realizadas en local, sin mensajes Telegram de producción.
