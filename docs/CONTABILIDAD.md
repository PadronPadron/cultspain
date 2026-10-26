# Uso contable y documentos · España

Actualizado el 26 de octubre de 2026. Esta aplicación prepara registros y documentación para la asesoría. No presenta declaraciones ni decide la deducibilidad del IVA o del gasto.

## Flujo de una compra

1. Registrar al proveedor con sus datos de contacto y fiscales.
2. Añadir los materiales al catálogo con unidad y precio orientativo sin impuestos.
3. Preparar un pedido si se necesita: varias líneas, cantidades y precios. Imprimir o guardar el pedido desde el navegador. El envío al proveedor lo realiza la propietaria.
4. Cuando exista la compra, registrar el gasto según el documento real. Introducir por separado el impuesto que figura en él. Vincular proveedor, material y pedido si procede.
5. Subir la factura original y el justificante de pago como documentos distintos. Una captura complementa el expediente; no implica por sí sola que el gasto cumpla los requisitos fiscales.
6. Marcar el pago manualmente y conservar su fecha.
7. Seleccionar el periodo y descargar el paquete para la asesoría.

Las facturas completas incluyen, entre otros datos, número/serie, fechas, identificación de emisor y destinatario, datos fiscales y dirección según corresponda, descripción, base e impuesto. El formulario recoge esos datos donde son relevantes; deben comprobarse con la factura original. [AEAT: contenido de las facturas](https://www3.agenciatributaria.gob.es/Sede/iva/facturacion-registro/facturacion-iva/contenido-facturas.html).

## Facturas emitidas

El archivo admite facturas emitidas por el sistema de facturación que use el salón. Esta versión no crea una factura fiscal propia, no asigna números fiscales, no incorpora un QR VERI*FACTU y no envía registros a la AEAT. El documento de pedido no es una factura. El desarrollo de la emisión requiere confirmar la situación fiscal y conectar o validar un sistema de facturación adecuado. Los requisitos SIF pueden afectar también a facturas simplificadas. [AEAT: sistemas informáticos de facturación](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes.html).

## Conservación

Se conservan los bytes originales, el nombre, tamaño, fecha, relación con la operación y SHA-256. Las nuevas versiones se cargan como documentos nuevos; los cambios de metadatos quedan en el historial. El archivo recuperable no elimina físicamente el documento.

La AEAT exige autenticidad, integridad, legibilidad y acceso a la documentación. Guardar archivos en R2 y su huella facilita el control técnico, pero no acredita por sí solo todo el cumplimiento. Antes del uso fiscal real, la asesoría debe revisar el lugar y plazo de conservación y los requisitos aplicables al almacenamiento fuera de España; elegir UE no elimina esa revisión. [AEAT: conservación](https://www3.agenciatributaria.gob.es/Sede/iva/facturacion-registro/facturacion-iva/obligacion-conservar-facturas.html), [manual IVA 2026](https://sede.agenciatributaria.gob.es/Sede/eu_es/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2026/capitulo-10-obligac-formales-suj-registro/obligaciones-materia-facturacion/obligacion-conservar-facturas.html).

El paquete ZIP contiene gastos por fecha de documento, incluidos archivados para comprobar la historia, y documentos del periodo o vinculados a esos gastos. Los totales de la interfaz excluyen gastos archivados. Los importes se guardan en céntimos; el IVA se introduce expresamente y no se asigna una tasa por defecto. Una diferencia de cobros y pagos no se denomina beneficio fiscal.
