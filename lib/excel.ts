"use client";

import XLSX from "xlsx";

export type ExcelRow = Record<string, unknown>;

function limpiar(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .replace(/\u0000/g, "")
    .trim();
}

function dividirFila(fila: unknown[]): string[] {
  const resultado: string[] = [];

  for (const celda of fila) {
    const texto = limpiar(celda);

    if (texto.includes("\t")) {
      const partes = texto.split("\t");

      for (const parte of partes) {
        resultado.push(limpiar(parte));
      }
    } else {
      resultado.push(texto);
    }
  }

  return resultado;
}

function nombreColumna(
  nombre: string,
  usados: Record<string, number>
): string {
  const base = limpiar(nombre) || "Columna";

  if (!usados[base]) {
    usados[base] = 1;
    return base;
  }

  usados[base]++;

  return `${base}_${usados[base]}`;
}

export function leerExcel(
  buffer: ArrayBuffer
): ExcelRow[] {

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const primeraHoja =
    workbook.SheetNames[0];

  if (!primeraHoja) {
    throw new Error(
      "El archivo Excel no contiene hojas."
    );
  }

  const worksheet =
    workbook.Sheets[primeraHoja];

  if (!worksheet) {
    throw new Error(
      "No se pudo leer la hoja del Excel."
    );
  }

  /*
   * Leemos como matriz para poder detectar
   * la cabecera real del reporte SAP.
   */
  const matriz =
    XLSX.utils.sheet_to_json(
      worksheet,
      {
        header: 1,
        defval: "",
        raw: false,
      }
    ) as unknown[][];

  if (!matriz.length) {
    throw new Error(
      "El Excel no contiene datos."
    );
  }

  /*
   * Buscamos la fila que contiene las
   * columnas principales del reporte SAP.
   */
  let indiceCabecera = -1;
  let cabecera: string[] = [];

  for (
    let i = 0;
    i < matriz.length;
    i++
  ) {
    const fila =
      dividirFila(matriz[i]);

    const textoFila =
      fila.join(" | ").toUpperCase();

    if (
      textoFila.includes("CL.COND.") &&
      textoFila.includes("CLIENTE") &&
      textoFila.includes("MATERIAL")
    ) {
      indiceCabecera = i;
      cabecera = fila;
      break;
    }
  }

  /*
   * Si no encontramos la cabecera SAP,
   * usamos la primera fila.
   */
  if (indiceCabecera === -1) {
    indiceCabecera = 0;
    cabecera =
      dividirFila(matriz[0]);
  }

  /*
   * Evitamos nombres de columnas duplicados.
   *
   * Ejemplo:
   * Cliente
   * Cliente_2
   * Material
   * Material_2
   */
  const usados: Record<
    string,
    number
  > = {};

  const columnas =
    cabecera.map((nombre) =>
      nombreColumna(
        nombre,
        usados
      )
    );

  const resultados: ExcelRow[] = [];

  /*
   * Procesamos las filas posteriores
   * a la cabecera.
   */
  for (
    let i = indiceCabecera + 1;
    i < matriz.length;
    i++
  ) {
    const fila =
      dividirFila(matriz[i]);

    /*
     * Ignoramos filas completamente vacías.
     */
    const tieneDatos =
      fila.some(
        (valor) =>
          limpiar(valor) !== ""
      );

    if (!tieneDatos) {
      continue;
    }

    const registro: ExcelRow = {};

    for (
      let j = 0;
      j < columnas.length;
      j++
    ) {
      registro[columnas[j]] =
        fila[j] ?? "";
    }

    /*
     * Solo agregamos registros que tengan
     * algún dato útil.
     */
    const valores =
      Object.values(registro);

    if (
      valores.some(
        (valor) =>
          limpiar(valor) !== ""
      )
    ) {
      resultados.push(registro);
    }
  }

  return resultados;
}
