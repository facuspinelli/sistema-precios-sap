import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { ResultadoComercial, SeleccionAnalisis } from "./analisis";

const ARS = (n: number) =>
  `$ ${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const PCT = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const fecha = () => new Date().toLocaleDateString("es-AR");

function cell(
  text: string,
  bold = false,
  width = 1800,
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text ?? ""),
            bold,
            size: 17,
          }),
        ],
      }),
    ],
  });
}

function headerCell(
  text: string,
  width = 1800,
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: {
      type: ShadingType.CLEAR,
      fill: "17232F",
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            color: "FFFFFF",
            size: 17,
          }),
        ],
      }),
    ],
  });
}

function differenceText(value: number): string {
  if (Math.abs(value) < 0.0001) return "En promedio";
  return value > 0 ? "Por encima" : "Por debajo";
}

export async function generarInformeWord(
  analisis: ResultadoComercial,
  seleccion: SeleccionAnalisis,
  archivo: string,
): Promise<Blob> {
  const clientesTexto = seleccion.clientes.length
    ? seleccion.clientes.join(", ")
    : "Todos los clientes";
  const familiasTexto = seleccion.familias.length
    ? seleccion.familias.join(", ")
    : "Todas las familias";
  const materialesTexto = seleccion.materiales.length
    ? seleccion.materiales.join(", ")
    : "Todos los materiales";
  const condicionesTexto = seleccion.condiciones.length
    ? seleccion.condiciones.join(", ")
    : "Todas las condiciones válidas";

  const children: any[] = [];

  // ---------------------------------
  // PORTADA
  // ---------------------------------
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "ADDOC",
          bold: true,
          size: 34,
          color: "79D000",
        }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "INFORME DE ANÁLISIS COMERCIAL DE PRECIOS SAP",
          bold: true,
          size: 27,
          color: "17232F",
        }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Fecha: ${fecha()} · Archivo: ${
            archivo || "Sin nombre"
          }`,
          size: 18,
          color: "667585",
        }),
      ],
    }),
  );

  // ---------------------------------
  // 1. RESUMEN EJECUTIVO
  // ---------------------------------
  children.push(
    new Paragraph({
      text: "1. Resumen ejecutivo",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  children.push(
    new Paragraph({
      shading: {
        type: ShadingType.CLEAR,
        fill: "F4F8EE",
      },
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: analisis.conclusionEjecutiva,
          bold: true,
          size: 19,
          color: "365000",
        }),
      ],
    }),
  );

  for (const c of analisis.conclusiones) {
    children.push(
      new Paragraph({
        text: c,
        bullet: { level: 0 },
        spacing: { after: 70 },
      }),
    );
  }

  // ---------------------------------
  // 2. ALCANCE
  // ---------------------------------
  children.push(
    new Paragraph({
      text: "2. Alcance del análisis",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Criterio", 2200),
            headerCell("Selección", 7000),
          ],
        }),
        new TableRow({
          children: [
            cell("Clientes", true),
            cell(clientesTexto),
          ],
        }),
        new TableRow({
          children: [
            cell("Familias", true),
            cell(familiasTexto),
          ],
        }),
        new TableRow({
          children: [
            cell("Materiales", true),
            cell(materialesTexto),
          ],
        }),
        new TableRow({
          children: [
            cell("ZPR", true),
            cell(condicionesTexto),
          ],
        }),
        new TableRow({
          children: [
            cell("Búsqueda libre", true),
            cell(
              seleccion.busqueda ||
                "Sin filtro de texto",
            ),
          ],
        }),
      ],
    }),
  );

  // ---------------------------------
  // 3. INDICADORES
  // ---------------------------------
  children.push(
    new Paragraph({
      text: "3. Indicadores principales",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Indicador", 3200),
            headerCell("Resultado", 6000),
          ],
        }),
        new TableRow({
          children: [
            cell("Registros válidos", true),
            cell(
              analisis.totalRegistros.toLocaleString(
                "es-AR",
              ),
            ),
          ],
        }),
        new TableRow({
          children: [
            cell("Clientes", true),
            cell(String(analisis.clientes)),
          ],
        }),
        new TableRow({
          children: [
            cell("Familias", true),
            cell(String(analisis.familias)),
          ],
        }),
        new TableRow({
          children: [
            cell("Materiales", true),
            cell(String(analisis.materiales)),
          ],
        }),
        new TableRow({
          children: [
            cell("Importe válido analizado", true),
            cell(ARS(analisis.importeTotal), true),
          ],
        }),
        new TableRow({
          children: [
            cell("Promedio general por cliente", true),
            cell(
              ARS(analisis.promedioSeleccionado),
              true,
            ),
          ],
        }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      text: "El promedio general se calcula sobre el total acumulado de cada cliente dentro del universo seleccionado. No se calcula promediando filas individuales.",
      spacing: { before: 120, after: 120 },
    }),
  );

  // ---------------------------------
  // 4. IMPORTE POR FAMILIA
  // ---------------------------------
  children.push(
    new Paragraph({
      text: "4. Importe por familia",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  children.push(
    new Paragraph({
      text: "La familia es el nivel principal del análisis. Cada cliente se consolida primero sumando todos sus materiales dentro de la familia. Luego se calcula el promedio entre los clientes de esa familia.",
      spacing: { after: 120 },
    }),
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Familia", 3300),
            headerCell("Registros", 1100),
            headerCell("Clientes", 1100),
            headerCell("Promedio cliente", 1800),
            headerCell("Importe total", 1900),
          ],
        }),
        ...analisis.gruposFamilia
          .slice(0, 50)
          .map(
            (f) =>
              new TableRow({
                children: [
                  cell(f.familia),
                  cell(String(f.registros)),
                  cell(
                    String(
                      analisis.gruposFamiliaCliente.filter(
                        (x) =>
                          x.familia === f.familia,
                      ).length,
                    ),
                  ),
                  cell(ARS(f.promedio)),
                  cell(
                    ARS(f.importeTotal),
                    true,
                  ),
                ],
              }),
          ),
      ],
    }),
  );

  // ---------------------------------
  // 5. COMPARACIÓN FAMILIA x CLIENTE
  // ---------------------------------
  children.push(
    new Paragraph({
      text: "5. Comparación por familia y cliente",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  children.push(
    new Paragraph({
      text: "Esta es la comparación principal del informe. Para cada familia se suman todos los materiales de cada cliente. Ese total se compara contra el promedio de los clientes que participan de esa familia.",
      spacing: { after: 120 },
    }),
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Familia", 2500),
            headerCell("Cliente", 1900),
            headerCell("Materiales", 1000),
            headerCell("Total familia", 1500),
            headerCell("Promedio", 1500),
            headerCell("Diferencia", 1500),
            headerCell("Vs promedio", 1200),
          ],
        }),
        ...analisis.gruposFamiliaCliente
          .slice(0, 150)
          .map(
            (x) =>
              new TableRow({
                children: [
                  cell(x.familia),
                  cell(x.cliente),
                  cell(String(x.materiales)),
                  cell(ARS(x.importeTotal)),
                  cell(ARS(x.promedioFamilia)),
                  cell(
                    `${x.diferenciaVsPromedio >= 0 ? "+" : "-"}${ARS(
                      Math.abs(
                        x.diferenciaVsPromedio,
                      ),
                    )}`,
                  ),
                  cell(
                    `${PCT(
                      x.porcentajeVsPromedio,
                    )} · ${differenceText(
                      x.porcentajeVsPromedio,
                    )}`,
                    true,
                  ),
                ],
              }),
          ),
      ],
    }),
  );

  // ---------------------------------
  // 6. PRINCIPALES DIFERENCIAS
  // ---------------------------------
  children.push(
    new Paragraph({
      text: "6. Principales diferencias por familia",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  const familySignals = [
    ...analisis.gruposFamiliaCliente,
  ]
    .filter(
      (x) =>
        x.promedioFamilia > 0 &&
        Math.abs(x.porcentajeVsPromedio) >
          0.0001,
    )
    .sort(
      (a, b) =>
        Math.abs(b.porcentajeVsPromedio) -
        Math.abs(a.porcentajeVsPromedio),
    )
    .slice(0, 30);

  if (!familySignals.length) {
    children.push(
      new Paragraph({
        text: "No se detectaron diferencias entre clientes dentro de las familias comparables.",
      }),
    );
  } else {
    children.push(
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          new TableRow({
            children: [
              headerCell("Familia", 3000),
              headerCell("Cliente", 1900),
              headerCell("Importe", 1500),
              headerCell("Promedio", 1500),
              headerCell("Diferencia", 1500),
              headerCell("Vs promedio", 1300),
            ],
          }),
          ...familySignals.map(
            (x) =>
              new TableRow({
                children: [
                  cell(x.familia),
                  cell(x.cliente),
                  cell(ARS(x.importeTotal)),
                  cell(ARS(x.promedioFamilia)),
                  cell(
                    `${x.diferenciaVsPromedio >= 0 ? "+" : "-"}${ARS(
                      Math.abs(
                        x.diferenciaVsPromedio,
                      ),
                    )}`,
                  ),
                  cell(
                    PCT(
                      x.porcentajeVsPromedio,
                    ),
                    true,
                  ),
                ],
              }),
          ),
        ],
      }),
    );
  }

  // ---------------------------------
  // 7. DISTRIBUCIÓN POR CLIENTE
  // ---------------------------------
  children.push(
    new Paragraph({
      text: "7. Distribución de cada cliente por familia",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  children.push(
    new Paragraph({
      text: "Esta sección permite identificar en qué familias concentra cada cliente mayor y menor importe dentro del universo seleccionado.",
      spacing: { after: 120 },
    }),
  );

  for (const cliente of analisis.comparacionClientesSeleccionados.slice(
    0,
    20,
  )) {
    const familiasCliente =
      analisis.gruposFamiliaCliente
        .filter(
          (x) => x.cliente === cliente.clave,
        )
        .sort(
          (a, b) =>
            b.importeTotal - a.importeTotal,
        );

    if (!familiasCliente.length) continue;

    const mayor = familiasCliente[0];
    const menor =
      familiasCliente[familiasCliente.length - 1];

    children.push(
      new Paragraph({
        spacing: { before: 80, after: 60 },
        children: [
          new TextRun({
            text: cliente.clave,
            bold: true,
            size: 19,
          }),
          new TextRun({
            text: ` · Total: ${ARS(
              cliente.importeTotal,
            )}`,
            size: 18,
          }),
        ],
      }),
    );

    children.push(
      new Paragraph({
        text: `Mayor concentración: ${mayor.familia} — ${ARS(
          mayor.importeTotal,
        )}. Menor concentración: ${menor.familia} — ${ARS(
          menor.importeTotal,
        )}.`,
        spacing: { after: 70 },
      }),
    );
  }

  // ---------------------------------
  // 8. DETALLE MATERIAL x CLIENTE
  // ---------------------------------
  children.push(
    new Paragraph({
      text: "8. Detalle por material y cliente",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  children.push(
    new Paragraph({
      text: "El material es el segundo nivel del análisis y permite explicar cómo se compone cada familia. Cuando un material está presente en varios clientes, cada cliente se compara contra el promedio de ese material.",
      spacing: { after: 120 },
    }),
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Familia", 2300),
            headerCell("Material", 1500),
            headerCell("Cliente", 1900),
            headerCell("Importe", 1500),
            headerCell("Promedio", 1500),
            headerCell("Diferencia", 1500),
            headerCell("Vs promedio", 1300),
          ],
        }),
        ...analisis.gruposMaterial
          .slice(0, 100)
          .flatMap((g) =>
            g.clientes.map(
              (c) =>
                new TableRow({
                  children: [
                    cell(g.familia),
                    cell(
                      `${g.material} · ${g.descripcion}`,
                    ),
                    cell(c.razonSocial),
                    cell(ARS(c.importeTotal)),
                    cell(
                      ARS(
                        c.referenciaPromedioSeleccionado,
                      ),
                    ),
                    cell(
                      `${c.diferenciaVsPromedio >= 0 ? "+" : "-"}${ARS(
                        Math.abs(
                          c.diferenciaVsPromedio,
                        ),
                      )}`,
                    ),
                    cell(
                      PCT(
                        c.porcentajeVsPromedio,
                      ),
                      true,
                    ),
                  ],
                }),
            ),
          ),
      ],
    }),
  );

  // ---------------------------------
  // 9. CALIDAD DE DATOS
  // ---------------------------------
  children.push(
    new Paragraph({
      text: "9. Calidad de datos y validaciones",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  children.push(
    new Paragraph({
      text: `El análisis comercial utiliza ${analisis.universo.length.toLocaleString(
        "es-AR",
      )} registro(s) habilitados por las reglas maestras.`,
    }),
  );

  children.push(
    new Paragraph({
      text: "Los registros con ZPR incorrecta, cliente sin referencia o material sin nomenclador quedan fuera del cálculo comercial. Se mantienen disponibles en la pantalla para su revisión.",
    }),
  );

  children.push(
    new Paragraph({
      text: "Regla ZPR: la condición definida en la base de Condición Impositiva es la fuente de verdad. Si el Excel presenta más de una condición para un cliente, solo la condición válida según la base participa del análisis.",
    }),
  );

  children.push(
    new Paragraph({
      text: "Regla PB00: el importe PB00 se incorpora al registro inmediatamente anterior correspondiente, según la estructura del archivo SAP.",
    }),
  );

  children.push(
    new Paragraph({
      text: "Regla de material: la familia proviene de la clasificación del Nomenclador SAP. Los materiales sin correspondencia en el nomenclador no participan del análisis agrupado.",
    }),
  );

  children.push(
    new Paragraph({
      text: "Nota económica: el campo Importe/Importe final se trata como valor económico de la condición SAP. Este informe no lo denomina facturación total porque el archivo analizado no contiene, por sí solo, el volumen facturado necesario para calcular facturación real.",
    }),
  );

  const doc = new Document({
    creator: "ADDOC - Sistema de Precios SAP",
    title: "Informe de análisis comercial de precios SAP",
    description:
      "Informe generado a partir del universo seleccionado y validado contra las bases maestras.",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 700,
              right: 700,
              bottom: 700,
              left: 700,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function descargarBlob(
  blob: Blob,
  nombre: string,
) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(
    () => URL.revokeObjectURL(url),
    1000,
  );
}
