import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  PageBreak,
  Paragraph,
  Packer,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { ComparacionSeleccion, ResultadoComercial, SeleccionAnalisis, UMBRAL_OPORTUNIDAD } from "./analisis";

const ARS = (n: number) =>
  `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PCT = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const fecha = () => new Date().toLocaleDateString("es-AR");

function escSvg(text: string) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgData(svg: string): Uint8Array {
  return new TextEncoder().encode(svg);
}

function graficoFamiliasSvg(analisis: ResultadoComercial): string {
  const familias = analisis.gruposFamilia.slice(0, 10);
  const width = 900;
  const rowH = 42;
  const height = Math.max(190, familias.length * rowH + 75);
  const max = Math.max(...familias.map((f) => f.importeTotal), 1);
  const left = 300;
  const barWidth = 500;

  const bars = familias
    .map((f, i) => {
      const y = 48 + i * rowH;
      const w = Math.max(3, (f.importeTotal / max) * barWidth);
      const label = f.familia.length > 42 ? `${f.familia.slice(0, 39)}...` : f.familia;
      return `<text x="10" y="${y + 16}" font-family="Arial" font-size="13" fill="#17232f">${escSvg(label)}</text><rect x="${left}" y="${y}" width="${barWidth}" height="20" rx="8" fill="#edf0f3"/><rect x="${left}" y="${y}" width="${w}" height="20" rx="8" fill="#79d000"/><text x="${Math.min(left + w + 8, width - 115)}" y="${y + 15}" font-family="Arial" font-size="12" fill="#536171">${escSvg(ARS(f.importeTotal))}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><text x="10" y="24" font-family="Arial" font-size="16" font-weight="700" fill="#17232f">Importe válido por familia</text>${bars}</svg>`;
}

function graficoComparacionSvg(analisis: ResultadoComercial): string {
  const datos = analisis.gruposFamiliaCliente
    .filter((x) => x.referenciaPromedioSeleccionado > 0)
    .sort((a, b) => Math.abs(b.porcentajeVsPromedioSeleccionado) - Math.abs(a.porcentajeVsPromedioSeleccionado))
    .slice(0, 12);

  const width = 900;
  const rowH = 38;
  const height = Math.max(190, datos.length * rowH + 80);
  const left = 330;
  const chartWidth = 440;
  const maxPct = Math.max(...datos.map((x) => Math.abs(x.porcentajeVsPromedioSeleccionado)), 1);
  const center = left + chartWidth / 2;

  const rows = datos
    .map((x, i) => {
      const y = 54 + i * rowH;
      const pct = x.porcentajeVsPromedioSeleccionado;
      const bar = Math.max(3, (Math.abs(pct) / maxPct) * (chartWidth / 2 - 12));
      const xBar = pct >= 0 ? center : center - bar;
      const labelBase = `${x.cliente} · ${x.familia}`;
      const label = labelBase.length > 47 ? `${labelBase.slice(0, 44)}...` : labelBase;
      const valueX = pct >= 0 ? Math.min(center + bar + 8, width - 72) : Math.max(center - bar - 58, left);
      return `<text x="10" y="${y + 15}" font-family="Arial" font-size="12" fill="#17232f">${escSvg(label)}</text><rect x="${left}" y="${y}" width="${chartWidth}" height="18" rx="7" fill="#edf0f3"/><rect x="${xBar}" y="${y}" width="${bar}" height="18" rx="7" fill="#79d000"/><text x="${valueX}" y="${y + 14}" font-family="Arial" font-size="12" font-weight="700" fill="#536171">${escSvg(PCT(pct))}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><text x="10" y="25" font-family="Arial" font-size="16" font-weight="700" fill="#17232f">Desvío frente al promedio — principales diferencias</text><line x1="${center}" y1="42" x2="${center}" y2="${height - 15}" stroke="#aeb7c1" stroke-width="2"/>${rows}</svg>`;
}

function cell(text: string, bold = false, width = 1800, size = 17): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: String(text ?? ""), bold, size })],
      }),
    ],
  });
}

function headerCell(text: string, width = 1800): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: "17232F" },
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 16 })],
      }),
    ],
  });
}

function tituloSeccion(texto: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 260, after: 130 },
    children: [new TextRun({ text: texto, bold: true, color: "2D6B9F", size: 25 })],
  });
}

function parrafoSuave(texto: string) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: texto, size: 17, color: "536171" })],
  });
}

function tarjeta(texto: string, destacado = false) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: destacado ? "EEF7E5" : "F3F5F7" },
    spacing: { before: 50, after: 100 },
    indent: { left: 100, right: 100 },
    children: [
      new TextRun({
        text: texto,
        bold: destacado,
        size: destacado ? 20 : 17,
        color: destacado ? "365000" : "17232F",
      }),
    ],
  });
}

function tablaComparacionSeleccion(datos: ComparacionSeleccion[], etiqueta: string): Table {
  const limite = datos.slice(0, 100);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell(etiqueta, 2500),
          headerCell("Importe prom.", 1450),
          headerCell("Promedio", 1450),
          headerCell("Dif.", 1350),
          headerCell("Vs. prom.", 1250),
          headerCell("Estado", 1500),
        ],
      }),
      ...limite.map((x) =>
        new TableRow({
          children: [
            cell(x.tipo === "MATERIAL" && x.descripcion ? `${x.clave} · ${x.descripcion}` : x.clave, false, 2500, 15),
            cell(ARS(x.importePromedio), false, 1450, 15),
            cell(ARS(x.referenciaPromedio), false, 1450, 15),
            cell(ARS(x.diferencia), false, 1350, 15),
            cell(PCT(x.porcentaje), false, 1250, 15),
            cell(x.clasificacion === "POR_ENCIMA" ? "POR ENCIMA" : x.clasificacion === "POR_DEBAJO" ? "POR DEBAJO" : "EN PROMEDIO", true, 1500, 15),
          ],
        }),
      ),
    ],
  });
}

export async function generarInformeWord(
  analisis: ResultadoComercial,
  seleccion: SeleccionAnalisis,
  archivo: string,
): Promise<Blob> {
  const clientesTexto = seleccion.clientes.length ? seleccion.clientes.join(", ") : "Todos los clientes";
  const familiasTexto = seleccion.familias.length ? seleccion.familias.join(", ") : "Todas las familias";
  const materialesTexto = seleccion.materiales.length ? seleccion.materiales.join(", ") : "Todos los materiales";
  const condicionesTexto = seleccion.condiciones.length ? seleccion.condiciones.join(", ") : "Todas las condiciones válidas";

  const altas = analisis.gruposFamiliaCliente.filter(
    (x) => x.clasificacion === "POR_ENCIMA" && x.referenciaPromedioSeleccionado > 0,
  );
  const bajas = analisis.gruposFamiliaCliente.filter(
    (x) => x.clasificacion === "POR_DEBAJO" && x.referenciaPromedioSeleccionado > 0,
  );

  const children: any[] = [];

  // PORTADA / CABECERA
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 70 },
      children: [new TextRun({ text: "ADDOC", bold: true, size: 38, color: "79D000" })],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "INFORME DE ANÁLISIS COMERCIAL DE PRECIOS SAP", bold: true, size: 28, color: "17232F" })],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 260 },
      children: [new TextRun({ text: `${fecha()} · ${archivo || "Sin nombre"}`, size: 17, color: "667585" })],
    }),
  );

  // 1. Resumen
  children.push(tituloSeccion("1. Resumen ejecutivo"));
  children.push(tarjeta(analisis.conclusionEjecutiva, true));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell("Indicador", 3300), headerCell("Resultado", 5900)] }),
        new TableRow({ children: [cell("Registros válidos", true, 3300), cell(analisis.totalRegistros.toLocaleString("es-AR"), false, 5900)] }),
        new TableRow({ children: [cell("Clientes", true, 3300), cell(String(analisis.clientes), false, 5900)] }),
        new TableRow({ children: [cell("Familias", true, 3300), cell(String(analisis.familias), false, 5900)] }),
        new TableRow({ children: [cell("Materiales", true, 3300), cell(String(analisis.materiales), false, 5900)] }),
        new TableRow({ children: [cell("Importe válido analizado", true, 3300), cell(ARS(analisis.importeTotal), true, 5900)] }),
        new TableRow({ children: [cell("Promedio del universo", true, 3300), cell(ARS(analisis.promedioSeleccionado), true, 5900)] }),
        new TableRow({ children: [cell("Por encima del promedio", true, 3300), cell(String(analisis.clientesSobrePromedio), false, 5900)] }),
        new TableRow({ children: [cell("Por debajo del promedio", true, 3300), cell(String(analisis.clientesBajoPromedio), false, 5900)] }),
      ],
    }),
  );

  for (const c of analisis.conclusiones) {
    children.push(new Paragraph({ text: c, bullet: { level: 0 }, spacing: { before: 70, after: 60 } }));
  }

  // 2. Alcance
  children.push(tituloSeccion("2. Alcance del análisis"));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell("Criterio", 2600), headerCell("Selección", 6600)] }),
        new TableRow({ children: [cell("Clientes", true, 2600), cell(clientesTexto, false, 6600)] }),
        new TableRow({ children: [cell("Familias", true, 2600), cell(familiasTexto, false, 6600)] }),
        new TableRow({ children: [cell("Materiales", true, 2600), cell(materialesTexto, false, 6600)] }),
        new TableRow({ children: [cell("ZPR", true, 2600), cell(condicionesTexto, false, 6600)] }),
        new TableRow({ children: [cell("Búsqueda libre", true, 2600), cell(seleccion.busqueda || "Sin filtro de texto", false, 6600)] }),
      ],
    }),
  );

  children.push(tituloSeccion("3. Cómo se calcula la referencia"));
  children.push(
    tarjeta(
      "El sistema ya no toma el precio mínimo ni el máximo como referencia. Para cada comparación calcula el promedio de los elementos válidos que forman parte del universo seleccionado.",
    ),
  );
  children.push(
    parrafoSuave(
      "En materiales: cada cliente pesa una vez y, si tiene más de un registro para el mismo material, primero se obtiene su promedio. Luego se calcula el promedio entre los clientes seleccionados para ese material.",
    ),
  );
  children.push(
    parrafoSuave(
      "En familias: cada cliente pesa una vez y se compara su importe promedio por registro dentro de la familia contra el promedio de los clientes seleccionados en esa familia. El importe total se mantiene como dato informativo.",
    ),
  );
  children.push(
    parrafoSuave(
      `Toda diferencia se muestra aunque sea menor al ${UMBRAL_OPORTUNIDAD}%. Ese porcentaje se utiliza únicamente para destacar señales comerciales fuertes; no modifica ni oculta la diferencia real.`,
    ),
  );

  // 4. Comparativas directas del universo seleccionado
  children.push(tituloSeccion("4. Comparativas del universo seleccionado"));
  children.push(parrafoSuave("Estas comparativas toman exactamente los elementos que quedaron dentro de la selección actual. Si hay 3 clientes, se calcula el promedio de esos 3 clientes; si hay 3 materiales, se calcula el promedio de esos 3 materiales."));

  children.push(new Paragraph({ text: "Comparación entre clientes", heading: HeadingLevel.HEADING_2 }));
  if (analisis.comparacionClientesSeleccionados.length >= 2) {
    children.push(tablaComparacionSeleccion(analisis.comparacionClientesSeleccionados, "Cliente"));
  } else {
    children.push(parrafoSuave("Se necesitan al menos dos clientes para una comparación entre clientes."));
  }

  children.push(new Paragraph({ text: "Comparación entre materiales", heading: HeadingLevel.HEADING_2 }));
  if (analisis.comparacionMaterialesSeleccionados.length >= 2) {
    children.push(tablaComparacionSeleccion(analisis.comparacionMaterialesSeleccionados, "Material"));
  } else {
    children.push(parrafoSuave("Se necesitan al menos dos materiales para una comparación entre materiales."));
  }

  children.push(new Paragraph({ text: "Lectura de oportunidad", heading: HeadingLevel.HEADING_2 }));
  children.push(tarjeta(`Las diferencias positivas indican importes por encima del promedio de su universo de comparación. Las diferencias negativas indican importes por debajo del promedio. Una diferencia igual a 0% está alineada con el promedio. El umbral de ±${UMBRAL_OPORTUNIDAD}% solo se utiliza para destacar desvíos prioritarios.`, true));

  // 5. Gráficos
  children.push(tituloSeccion("5. Lectura económica del universo"));
  children.push(parrafoSuave("Distribución del importe válido por familia dentro de la selección."));
  children.push(
    new Paragraph({
      children: [
        new ImageRun({
          data: svgData(graficoFamiliasSvg(analisis)),
          type: "svg",
          fallback: {
            type: "png",
            data: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 207, 192, 240, 31, 0, 5, 0, 1, 255, 137, 153, 61, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]),
          },
          transformation: { width: 620, height: Math.min(440, Math.max(170, analisis.gruposFamilia.slice(0, 10).length * 29 + 55)) },
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  );

  children.push(tituloSeccion("5. Comparación de clientes por familia"));
  children.push(parrafoSuave("Los clientes se clasifican respecto del promedio de su familia dentro del universo seleccionado."));
  children.push(
    new Paragraph({
      children: [
        new ImageRun({
          data: svgData(graficoComparacionSvg(analisis)),
          type: "svg",
          fallback: {
            type: "png",
            data: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 207, 192, 240, 31, 0, 5, 0, 1, 255, 137, 153, 61, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]),
          },
          transformation: { width: 620, height: Math.min(470, Math.max(180, Math.min(12, analisis.gruposFamiliaCliente.length) * 28 + 60)) },
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  );

  // 6. Familia x cliente
  children.push(new PageBreak());
  children.push(tituloSeccion("6. Detalle por familia y cliente"));
  children.push(parrafoSuave("Referencia = promedio de los clientes seleccionados dentro de la familia. La diferencia y el porcentaje se calculan contra esa referencia."));

  if (!analisis.gruposFamiliaCliente.length) {
    children.push(parrafoSuave("No hay comparaciones de familia por cliente disponibles."));
  } else {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell("Familia", 2400), headerCell("Cliente", 1800), headerCell("Importe prom.", 1300), headerCell("Promedio", 1300), headerCell("Dif.", 1300), headerCell("Vs. prom.", 1200), headerCell("Estado", 1200)] }),
          ...analisis.gruposFamiliaCliente.slice(0, 120).map((x) =>
            new TableRow({
              children: [
                cell(x.familia, false, 2400, 15),
                cell(x.cliente, false, 1800, 15),
                cell(ARS(x.importePromedio), false, 1300, 15),
                cell(ARS(x.referenciaPromedioSeleccionado), false, 1300, 15),
                cell(ARS(x.diferenciaVsPromedioSeleccionado), false, 1300, 15),
                cell(PCT(x.porcentajeVsPromedioSeleccionado), false, 1200, 15),
                cell(x.clasificacion === "POR_ENCIMA" ? "POR ENCIMA" : x.clasificacion === "POR_DEBAJO" ? "POR DEBAJO" : "EN PROMEDIO", true, 1200, 15),
              ],
            }),
          ),
        ],
      }),
    );
  }

  // 7. Material x cliente
  children.push(tituloSeccion("7. Detalle por material y cliente"));
  children.push(parrafoSuave("Para cada material, el promedio se calcula únicamente entre los clientes seleccionados que poseen ese material."));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell("Familia", 2100), headerCell("Material", 1700), headerCell("Cliente", 1800), headerCell("Importe", 1250), headerCell("Promedio", 1250), headerCell("Dif.", 1200), headerCell("Vs. prom.", 1150)] }),
        ...analisis.gruposMaterial
          .slice(0, 80)
          .flatMap((g) =>
            g.clientes.map((c) =>
              new TableRow({
                children: [
                  cell(g.familia, false, 2100, 14),
                  cell(`${g.material} · ${g.descripcion}`, false, 1700, 14),
                  cell(c.razonSocial, false, 1800, 14),
                  cell(ARS(c.importePromedio), false, 1250, 14),
                  cell(ARS(c.referenciaPromedioSeleccionado), false, 1250, 14),
                  cell(ARS(c.diferenciaVsPromedioSeleccionado), false, 1200, 14),
                  cell(PCT(c.porcentajeVsPromedioSeleccionado), false, 1150, 14),
                ],
              }),
            ),
          ),
      ],
    }),
  );

  // 8. Oportunidades
  children.push(tituloSeccion("8. Oportunidades comerciales"));
  children.push(
    tarjeta(
      `Por encima del promedio: ${altas.length} caso(s). Por debajo del promedio: ${bajas.length} caso(s). El sistema permite revisar todos los desvíos; las diferencias de ±${UMBRAL_OPORTUNIDAD}% o más se destacan como señales comerciales prioritarias.`,
      true,
    ),
  );

  if (altas.length) {
    children.push(new Paragraph({ text: "Importes por encima del promedio", heading: HeadingLevel.HEADING_2 }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell("Cliente", 2000), headerCell("Familia", 2300), headerCell("Importe", 1300), headerCell("Promedio", 1300), headerCell("Dif.", 1300), headerCell("Vs. prom.", 1200)] }),
          ...altas.slice(0, 80).map((x) =>
            new TableRow({
              children: [
                cell(x.cliente, false, 2000),
                cell(x.familia, false, 2300),
                cell(ARS(x.importePromedio), false, 1300),
                cell(ARS(x.referenciaPromedioSeleccionado), false, 1300),
                cell(ARS(x.diferenciaVsPromedioSeleccionado), false, 1300),
                cell(PCT(x.porcentajeVsPromedioSeleccionado), true, 1200),
              ],
            }),
          ),
        ],
      }),
    );
  }

  if (bajas.length) {
    children.push(new Paragraph({ text: "Importes por debajo del promedio", heading: HeadingLevel.HEADING_2 }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell("Cliente", 2000), headerCell("Familia", 2300), headerCell("Importe", 1300), headerCell("Promedio", 1300), headerCell("Dif.", 1300), headerCell("Vs. prom.", 1200)] }),
          ...bajas.slice(0, 80).map((x) =>
            new TableRow({
              children: [
                cell(x.cliente, false, 2000),
                cell(x.familia, false, 2300),
                cell(ARS(x.importePromedio), false, 1300),
                cell(ARS(x.referenciaPromedioSeleccionado), false, 1300),
                cell(ARS(x.diferenciaVsPromedioSeleccionado), false, 1300),
                cell(PCT(x.porcentajeVsPromedioSeleccionado), true, 1200),
              ],
            }),
          ),
        ],
      }),
    );
  }

  if (!altas.length && !bajas.length) {
    children.push(parrafoSuave("No hay clientes por encima o por debajo del promedio en las comparaciones de familia disponibles."));
  }

  // 9. Calidad
  children.push(tituloSeccion("10. Calidad de datos y reglas de análisis"));
  children.push(parrafoSuave(`El análisis comercial utiliza ${analisis.universo.length.toLocaleString("es-AR")} registro(s) habilitados por las reglas maestras.`));
  children.push(parrafoSuave("Los registros con ZPR incorrecta, cliente sin referencia o material sin nomenclador quedan fuera del cálculo comercial, pero continúan disponibles como alertas en la validación."));
  children.push(parrafoSuave("La condición correcta se toma de la base de Condición Impositiva. Si el Excel presenta una condición distinta, se informa la inconsistencia y la línea incorrecta no se suma al análisis económico."));
  children.push(parrafoSuave("La familia se obtiene de la información del Nomenclador SAP disponible para el material. El material mantiene su código y descripción para permitir búsquedas y comparaciones por material y familia."));
  children.push(parrafoSuave("El campo Importe/Importe final se trata como valor económico de la condición SAP. Este informe no lo denomina facturación real porque el archivo no contiene por sí solo el volumen facturado necesario para calcular facturación real."));

  const doc = new Document({
    creator: "ADDOC - Sistema de Precios SAP",
    title: "Informe de análisis comercial de precios SAP",
    description: "Informe generado a partir del universo seleccionado y validado contra las bases maestras.",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 650, right: 650, bottom: 650, left: 650 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
