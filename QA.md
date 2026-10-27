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
