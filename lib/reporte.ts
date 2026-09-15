import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Paragraph,
  Packer,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { ResultadoComercial, SeleccionAnalisis, UMBRAL_OPORTUNIDAD } from "./analisis";

const ARS = (n: number) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PCT = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const fecha = () => new Date().toLocaleDateString("es-AR");

function escSvg(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function graficoFamiliasSvg(analisis: ResultadoComercial): string {
  const familias = analisis.gruposFamilia.slice(0, 10);
  const width = 900;
  const rowH = 42;
  const height = Math.max(180, familias.length * rowH + 70);
  const max = Math.max(...familias.map((f) => f.importeTotal), 1);
  const left = 250;
  const barWidth = 570;
  const bars = familias.map((f, i) => {
    const y = 45 + i * rowH;
    const w = Math.max(3, (f.importeTotal / max) * barWidth);
    const label = f.familia.length > 34 ? `${f.familia.slice(0, 31)}...` : f.familia;
    return `<text x="10" y="${y + 17}" font-family="Arial" font-size="14" fill="#17232f">${escSvg(label)}</text><rect x="${left}" y="${y}" width="${barWidth}" height="20" rx="8" fill="#edf0f3"/><rect x="${left}" y="${y}" width="${w}" height="20" rx="8" fill="#79d000"/><text x="${left + Math.min(w + 8, barWidth - 90)}" y="${y + 15}" font-family="Arial" font-size="12" fill="#536171">${escSvg(ARS(f.importeTotal))}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><text x="10" y="22" font-family="Arial" font-size="15" font-weight="700" fill="#17232f">Importe por familia</text>${bars}</svg>`;
}

function svgData(svg: string): Uint8Array {
  return new TextEncoder().encode(svg);
}

function cell(text: string, bold = false, width = 1800): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [new Paragraph({ children: [new TextRun({ text: String(text ?? ""), bold, size: 18 })] })],
  });
}

function headerCell(text: string, width = 1800): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: "17232F" },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 17 })] })],
  });
}


export async function generarInformeWord(analisis: ResultadoComercial, seleccion: SeleccionAnalisis, archivo: string): Promise<Blob> {
  const clientesTexto = seleccion.clientes.length ? seleccion.clientes.join(", ") : "Todos los clientes";
  const familiasTexto = seleccion.familias.length ? seleccion.familias.join(", ") : "Todas las familias";
  const materialesTexto = seleccion.materiales.length ? seleccion.materiales.join(", ") : "Todos los materiales";
  const condicionesTexto = seleccion.condiciones.length ? seleccion.condiciones.join(", ") : "Todas las condiciones válidas";

  const children: any[] = [];

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "ADDOC", bold: true, size: 34, color: "79D000" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "INFORME DE ANÁLISIS COMERCIAL DE PRECIOS SAP", bold: true, size: 27, color: "17232F" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text: `Fecha: ${fecha()} · Archivo: ${archivo || "Sin nombre"}`, size: 18, color: "667585" })],
  }));

  children.push(new Paragraph({ text: "1. Resumen ejecutivo", heading: HeadingLevel.HEADING_1 }));
  children.push(new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: "F4F8EE" },
    spacing: { after: 140 },
    children: [new TextRun({ text: analisis.conclusionEjecutiva, bold: true, size: 20, color: "365000" })],
  }));
  for (const c of analisis.conclusiones) {
    children.push(new Paragraph({ text: c, bullet: { level: 0 }, spacing: { after: 70 } }));
  }

  children.push(new Paragraph({ text: "2. Alcance del análisis", heading: HeadingLevel.HEADING_1 }));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("Criterio", 2200), headerCell("Selección", 7000)] }),
      new TableRow({ children: [cell("Clientes", true), cell(clientesTexto)] }),
      new TableRow({ children: [cell("Familias", true), cell(familiasTexto)] }),
      new TableRow({ children: [cell("Materiales", true), cell(materialesTexto)] }),
      new TableRow({ children: [cell("ZPR", true), cell(condicionesTexto)] }),
      new TableRow({ children: [cell("Búsqueda libre", true), cell(seleccion.busqueda || "Sin filtro de texto")] }),
    ],
  }));

  children.push(new Paragraph({ text: "3. Indicadores principales", heading: HeadingLevel.HEADING_1 }));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("Indicador", 3000), headerCell("Resultado", 6200)] }),
      new TableRow({ children: [cell("Registros válidos", true), cell(analisis.totalRegistros.toLocaleString("es-AR"))] }),
      new TableRow({ children: [cell("Clientes", true), cell(String(analisis.clientes))] }),
      new TableRow({ children: [cell("Familias", true), cell(String(analisis.familias))] }),
      new TableRow({ children: [cell("Materiales", true), cell(String(analisis.materiales))] }),
      new TableRow({ children: [cell("Importe válido analizado", true), cell(ARS(analisis.importeTotal), true)] }),
      new TableRow({ children: [cell("Importe promedio", true), cell(ARS(analisis.importePromedio))] }),
      new TableRow({ children: [cell("Umbral de oportunidad", true), cell(`±${UMBRAL_OPORTUNIDAD}% vs. otros clientes del mismo material`)] }),
    ],
  }));

  children.push(new Paragraph({ text: "4. Distribución económica por familia", heading: HeadingLevel.HEADING_1 }));
  children.push(new Paragraph({ text: "La siguiente visualización muestra cómo se distribuye el importe válido dentro del universo seleccionado.", spacing: { after: 120 } }));
  children.push(new Paragraph({ children: [new ImageRun({ data: svgData(graficoFamiliasSvg(analisis)), type: "svg", fallback: { type: "png", data: new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,120,156,99,248,207,192,240,31,0,5,0,1,255,137,153,61,0,0,0,0,73,69,78,68,174,66,96,130]) }, transformation: { width: 620, height: Math.min(430, Math.max(150, analisis.gruposFamilia.slice(0, 10).length * 29 + 50)) } })], alignment: AlignmentType.CENTER }));

  children.push(new Paragraph({ text: "5. Detalle por familia", heading: HeadingLevel.HEADING_1 }));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("Familia", 3500), headerCell("Registros", 1200), headerCell("Promedio", 1800), headerCell("Mínimo", 1600), headerCell("Máximo", 1600), headerCell("Importe total", 1900)] }),
      ...analisis.gruposFamilia.slice(0, 30).map((f) => new TableRow({ children: [cell(f.familia), cell(String(f.registros)), cell(ARS(f.promedio)), cell(ARS(f.minimo)), cell(ARS(f.maximo)), cell(ARS(f.importeTotal), true)] })),
    ],
  }));

  children.push(new Paragraph({ text: "6. Oportunidades comerciales", heading: HeadingLevel.HEADING_1 }));
  if (!analisis.oportunidades.length) {
    children.push(new Paragraph({ text: `No se detectaron diferencias superiores al ±${UMBRAL_OPORTUNIDAD}% entre clientes para materiales compartidos.` }));
  } else {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell("Tipo", 1300), headerCell("Cliente", 1900), headerCell("Familia", 2400), headerCell("Material", 1300), headerCell("Importe", 1500), headerCell("Referencia", 1500), headerCell("Diferencia", 1500), headerCell("Vs. otros", 1400)] }),
        ...analisis.oportunidades.slice(0, 40).map((o) => new TableRow({ children: [cell(o.tipo === "PRECIO_ALTO" ? "PRECIO ALTO" : "PRECIO BAJO", true), cell(o.razonSocial), cell(o.familia), cell(o.material), cell(ARS(o.importe)), cell(ARS(o.referencia)), cell(ARS(o.diferencia)), cell(`${PCT(o.porcentaje)} · ${o.veces.toFixed(1)}x`)] })),
      ],
    }));
    children.push(new Paragraph({ text: "Interpretación: las señales de PRECIO ALTO identifican clientes cuyo importe se encuentra por encima de la referencia de los otros clientes para el mismo material. Las señales de PRECIO BAJO pueden justificar una revisión comercial del posicionamiento del precio.", spacing: { before: 120 } }));
  }

  children.push(new Paragraph({ text: "7. Comparación por material y cliente", heading: HeadingLevel.HEADING_1 }));
  children.push(new Paragraph({ text: "Esta comparación es la base principal para detectar diferencias entre clientes. El porcentaje se calcula contra el promedio de los otros clientes que tienen ese mismo material dentro del universo seleccionado.", spacing: { after: 120 } }));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("Familia", 2400), headerCell("Material", 1500), headerCell("Cliente", 2100), headerCell("Promedio", 1500), headerCell("Diferencia", 1600), headerCell("Vs. otros", 1500), headerCell("Posición", 1000)] }),
      ...analisis.gruposMaterial.slice(0, 80).flatMap((g) => g.clientes.map((c) => new TableRow({ children: [cell(g.familia), cell(`${g.material} · ${g.descripcion}`), cell(c.razonSocial), cell(ARS(c.importePromedio)), cell(ARS(c.diferenciaVsPromedioOtros)), cell(`${PCT(c.porcentajeVsPromedioOtros)} · ${c.vecesVsPromedioOtros.toFixed(1)}x`), cell(`#${c.posicion}`)] }))),
    ],
  }));

  children.push(new Paragraph({ text: "8. Calidad de datos y validaciones", heading: HeadingLevel.HEADING_1 }));
  const validos = analisis.universo.length;
  children.push(new Paragraph({ text: `El análisis comercial utiliza ${validos.toLocaleString("es-AR")} registro(s) habilitados por las reglas maestras. Los registros con ZPR incorrecta, cliente sin referencia o material sin nomenclador quedan fuera del cálculo comercial.` }));
  children.push(new Paragraph({ text: "Regla ZPR aplicada: la condición definida en la base de Condición Impositiva es la fuente de verdad. Si el Excel presenta más de una ZPR para un cliente, se conserva para el análisis únicamente la condición que coincide con la base." }));
  children.push(new Paragraph({ text: "Regla de material: la familia se obtiene del primer bloque de TEXTO LARGO del Nomenclador SAP. Los materiales que no tienen correspondencia en el nomenclador no participan del análisis agrupado por familia/material." }));
  children.push(new Paragraph({ text: "Nota económica: el campo Importe/Importe final se trata como valor económico de la condición SAP. Este informe no lo denomina facturación total porque el archivo analizado no contiene, por sí solo, el volumen facturado necesario para calcular facturación real." }));

  const doc = new Document({
    creator: "ADDOC - Sistema de Precios SAP",
    title: "Informe de análisis comercial de precios SAP",
    description: "Informe generado a partir del universo seleccionado y validado contra las bases maestras.",
    sections: [{
      properties: { page: { margin: { top: 700, right: 700, bottom: 700, left: 700 } } },
      children,
    }],
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
