[README.md](https://github.com/user-attachments/files/32741560/README.md)
# Sistema de Precios SAP V2

Sistema web para cargar archivos mensuales de SAP, validar materiales y condiciones ZPR0/ZPR2, analizar precios por cliente/familia/material y generar informes.

## V2 - Conocimiento Maestro

Los maestros de materiales SAP y condiciones ZPR0/ZPR2 parten de los JSON incluidos en `data/` como base inicial, pero desde la interfaz se pueden administrar sin modificar código.

### Materiales SAP
- Importar un Excel maestro completo.
- La importación actualiza materiales existentes y agrega materiales nuevos.
- Los materiales que no aparecen en una nueva importación no se eliminan automáticamente.
- Agregar y editar materiales manualmente.
- Buscar por código, descripción o familia.

### ZPR0 / ZPR2
- Importar el Excel maestro de condiciones.
- Actualizar registros existentes y agregar nuevos.
- Conservar más de una condición para un mismo código cuando la fuente las contiene, para no ocultar ambigüedades.
- Agregar y editar registros manualmente.

### Persistencia V2
Los cambios de maestros se guardan en `localStorage` del navegador. Esto evita una base de datos externa en esta versión. El navegador mantiene la versión actual de los maestros para las siguientes cargas y análisis.

### Impacto en el análisis
Cada vez que se carga un Excel mensual, el validador utiliza los maestros vigentes. Si se actualiza un maestro mientras un Excel mensual está cargado, el sistema vuelve a validar los registros cargados con la nueva versión de los maestros.

## Archivos principales
- `app/page.tsx`: interfaz y flujo principal.
- `lib/maestros.ts`: maestros iniciales, persistencia local, importación y administración.
- `lib/validador.ts`: validación del Excel contra los maestros vigentes.
- `lib/excel.ts`: lectura de archivos SAP/Excel.
- `lib/analisis.ts`: análisis comercial.
- `lib/reporte.ts`: informe Word.
- `data/base_productos.json`: maestro inicial de materiales.
- `data/base_reglas.json`: maestro inicial de condiciones.
