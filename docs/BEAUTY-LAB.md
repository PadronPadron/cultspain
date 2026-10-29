# Beauty LAB

Página privada por enlace: `/beauty-lab/`. Sin enlaces desde CULT SPAIN; meta robots y cabecera X-Robots-Tag noindex/nofollow/noarchive. Noindex no es control de acceso: cualquiera que reciba el enlace puede abrir el formulario.

Administración: `/beauty-lab/admin.html`. Agenda, clientes, ingresos realmente recibidos y gastos realmente pagados. No incluye proveedores, materiales, pedidos ni documentos. CSV de movimientos; archivo recuperable, motivos de corrección y auditoría en la propia base Beauty LAB. No automatiza declaraciones fiscales ni mensajes al cliente.

Base independiente D1 `beauty-lab-db`, ID `902423cc-fc5e-4438-88e9-07bd78827239`, jurisdicción UE. Binding `BEAUTY_DB`. El código de Beauty LAB nunca consulta `DB` ni envía avisos al Telegram de CULT SPAIN. Avisos propios pendientes de facilitar el Telegram de la profesional.

Acceso independiente: `BEAUTY_ACCESS_AUD` y `BEAUTY_ADMIN_EMAIL`, además del emisor `CF_ACCESS_TEAM_DOMAIN`. Sin estas variables, el backend rechaza cualquier acceso administrativo. No reutiliza el email ni la audiencia de CULT SPAIN. Solo el modo de desarrollo con hostname loopback permite acceso local sin login. El acceso de producción verifica firma RSA, emisor, audiencia, caducidad y email del JWT.

Horario inicial autorizado: lunes–sábado 10:00–19:00, pausa 14:00–15:00, domingo cerrado. Se puede editar por semana o fecha; protege citas pendientes y confirmadas frente a cambios incompatibles. Horizonte 90 días y antelación mínima una hora. Cada minuto ocupado se guarda con clave única en una transacción, incluidas solicitudes pendientes. Cancelar libera el intervalo. Cambiar duración o precio del catálogo no altera reservas existentes.

Catálogo facilitado el 29/10/2026: extensión 120 min / 40 EUR; manicura rusa corta 70 min / 27 EUR; mediana 90 min / precio pendiente; natural larga 90 min / 30 EUR; pedicura 70 min / 35 EUR; higiénica sin esmaltado 40 min / 18 EUR; retirada 15 min / 8 EUR. Diseño opcional: +15 min para reservar el extremo superior de los 10–15 min indicados, +4 EUR. Los precios son referencias de reserva, no pagos. La administración permite editar catálogo, horas y pausas.

Migraciones propias en `migrations-beauty/`, aplicar solo a BEAUTY_DB. 0001 y 0002 aplicadas a la base remota por su consola; registro d1_migrations conservado. 0002 mantiene el campo service original como agrupación manicure/pedicure y añade service_key para el tratamiento detallado, diseño y precio de referencia. Ninguna migración modifica la base de CULT SPAIN.

Pruebas: `npm test`, `npm run typecheck`, `npm run build:cloudflare`. Integración local: `node tests/beauty.integration.mjs`; comprueba concurrencia, duplicados, precios calculados por servidor, CRM, correcciones, cancelación, cambios de horario e igualdad del estado CULT antes/después. No ejecutar integración contra producción. Sus registros locales quedan archivados y sus citas canceladas.

Pendiente para comunicación directa: teléfono y Telegram de la profesional. No se han inventado ni publicado contactos.
