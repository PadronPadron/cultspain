# CULT SPAIN · Cut & Style

Sitio en español con agenda, CRM y gestión de compras y documentos. Diseño monocromo con fotografías en su color original.

## Desarrollo local

Requisitos: Node.js 22.13 o superior. Las dependencias y las migraciones ya están instaladas en este equipo. En un clon nuevo: `npm ci`, `npm run build`, `npm run db:migrate:local`.

```sh
npm run dev -- --port 4173 --hostname 127.0.0.1
```

- Sitio: http://127.0.0.1:4173/
- Administración: http://127.0.0.1:4173/admin.html
- También puedes abrir `Iniciar CULT local.command` en macOS.

Los registros se guardan en D1 local y los archivos en R2 local, dentro de `.wrangler/state/`. Son independientes del almacenamiento del navegador. La versión anterior de localStorage permanece intacta y no se importa automáticamente. Los datos del ordenador y los del alojamiento son bases distintas.

## Funciones

- Clientes: nombre, apellidos, teléfono, email, datos opcionales de facturación, notas, historial y archivo.
- Materiales: nombre, marca, referencia/tono, unidad, precio orientativo, proveedor y edición. Puede crearse un material desde el formulario de gasto.
- Proveedores: contacto, teléfono, email, NIF/CIF, dirección y notas.
- Gastos: material opcional, proveedor, pedido, cantidad, precio real, base, impuesto explícito, total, factura, estado y fecha de pago. Las correcciones requieren motivo y conservan historial. Cambiar el catálogo no altera los gastos anteriores.
- Pedidos: varias líneas, precios conservados, estados, impresión y guardado en PDF mediante el navegador. No envía pedidos ni genera gastos automáticamente.
- Documentos: originales PDF/JPEG/PNG/WebP de hasta 10 MB, relación con cliente/proveedor/pedido/gasto, datos editables, descarga, archivo recuperable y SHA-256. No hay borrado físico desde la interfaz.
- Exportación para asesoría: gastos CSV, clientes CSV, catálogos, pedidos, metadatos, historial y originales en ZIP. El periodo filtra por fecha del gasto o documento; el archivo de gastos incluye archivados para revisar la historia.
- Reservas: servicio, calendario, hora, nombre, apellidos, teléfono y email opcional. La base impide citas solapadas incluso con peticiones simultáneas. Los cambios de horario comprueban conflictos.
- Cobros: se introduce manualmente el importe realmente recibido en el salón, sin tarifas automáticas en las nuevas reservas. Las operaciones históricas conservan sus importes. Sin pasarela de pago ni anticipos online.

El catálogo público no contiene precios. Los cortes de mujer y hombre y el servicio Corte + barba reservan 60 minutos; otros tiempos son orientativos. Queratina, alisado químico y corrección de color reservan una consulta previa de 30 minutos. El perfil de Olga Shyshko indica experiencia desde 2017 y formación oficial en Galicia, según los datos facilitados por la propietaria. Los horarios siguen pendientes de aprobación. La gestión fiscal y el envío a la AEAT no están automatizados. Ver [CONTABILIDAD](docs/CONTABILIDAD.md).

## Cloudflare

Repositorio: https://github.com/PadronPadron/cultspain
Dominio: https://cultspain.com
Worker existente: `cultspain`.

- D1 `cultspain-db` creada en jurisdicción UE. Esquema inicial y dos migraciones verificadas en la consola del panel el 26/10/2026. No contiene datos locales de prueba.
- Binding `DB` del Worker conectado a `cultspain-db` y verificado en el panel.
- R2 `cultspain-documents` prevista en UE; pendiente de activación de R2 en la cuenta. El panel solicita una suscripción con posibles cargos por uso.
- La integración Git del Worker figura como desconectada en el panel. Debe reconectarse para desplegar desde GitHub.
- La administración en producción se cierra por defecto. Debe configurarse Cloudflare Access y las variables de la propietaria antes del uso real.

Configuración y pasos: [CLOUDFLARE](docs/CLOUDFLARE.md).

## Verificación

```sh
npm test
npm run typecheck
npm run build:cloudflare
```

Integración local (crea registros identificados como pruebas y los archiva): `node tests/api.integration.mjs` con el servidor iniciado. No ejecutarla contra producción.

Las migraciones aplicadas se conservan sin modificarlas. El esquema está en `db/schema.ts`; `npm run db:generate` añade nuevas migraciones.

## Copia de seguridad

La exportación para asesoría es un paquete de trabajo, no un respaldo completo del sistema. Para un respaldo local completo, detén el servidor y copia `.wrangler/state/` con los datos D1 y R2, además del código. Conserva la copia fuera de esta carpeta. En producción, D1 Time Travel y una copia separada de objetos R2 deben configurarse antes de usar documentos reales. No se han programado copias remotas automáticas en esta versión.
