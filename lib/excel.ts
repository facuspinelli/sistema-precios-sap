"use client";

import { read, utils } from "xlsx";

export type ExcelRow = Record<string, unknown>;

function limpiar(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/\u0000/g, "").replace(/^\uFEFF/, "").trim();
}

function dividirFila(fila: unknown[]): string[] {
  const resultado: string[] = [];
  for (const celda of fila) {
    const texto = limpiar(celda);
    if (texto.includes("\t")) {
      for (const parte of texto.split("\t")) resultado.push(limpiar(parte));
    } else {
      resultado.push(texto);
    }
  }
  return resultado;
}

function nombreColumna(nombre: string, usados: Record<string, number>): string {
  const base = limpiar(nombre) || "Columna";
  if (!usados[base]) {
    usados[base] = 1;
    return base;
  }
  usados[base]++;
  return `${base}_${usados[base]}`;
}

function parsearTextoSAP(buffer: ArrayBuffer): ExcelRow[] | null {
  const bytes = new Uint8Array(buffer);
  const esUtf16LE = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe;
  const esUtf16BE = bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff;
  if (!esUtf16LE && !esUtf16BE) return null;

  const decoder = new TextDecoder(esUtf16LE ? "utf-16le" : "utf-16be");
  const textoArchivo = decoder.decode(buffer).replace(/^\uFEFF/, "");
  const matriz = textoArchivo.split(/\r?\n/).map((linea) => linea.split("\t").map(limpiar));
  if (!matriz.length) return null;

  let indiceCabecera = -1;
  let cabecera: string[] = [];
  for (let i = 0; i < matriz.length; i++) {
    const fila = matriz[i];
    const textoFila = fila.join(" | ").toUpperCase();
    if (textoFila.includes("CL.COND.") && textoFila.includes("CLIENTE") && textoFila.includes("MATERIAL")) {
      indiceCabecera = i;
      cabecera = fila;
      break;
    }
  }
  if (indiceCabecera < 0) return null;

  const usados: Record<string, number> = {};
  const columnas = cabecera.map((c) => nombreColumna(c, usados));
  const resultados: ExcelRow[] = [];
  for (let i = indiceCabecera + 1; i < matriz.length; i++) {
    const fila = matriz[i];
    if (!fila.some((v) => limpiar(v) !== "")) continue;
    const registro: ExcelRow = {};
    for (let j = 0; j < columnas.length; j++) registro[columnas[j]] = fila[j] ?? "";
    registro.__filaOrigen = i + 1;
    resultados.push(registro);
  }
  return resultados;
}

export function leerExcel(buffer: ArrayBuffer): ExcelRow[] {
  // SAP puede exportar un archivo con extensión .xls que en realidad es TSV UTF-16.
  // Lo detectamos antes de pasar por XLSX para conservar exactamente importes como 2.383,37.
  const sapText = parsearTextoSAP(buffer);
  if (sapText && sapText.length) return sapText;

  const workbook = read(buffer, { type: "array", cellDates: true, cellNF: true });
  const primeraHoja = workbook.SheetNames[0];
  if (!primeraHoja) throw new Error("El archivo Excel no contiene hojas.");
  const worksheet = workbook.Sheets[primeraHoja];
  if (!worksheet) throw new Error("No se pudo leer la hoja del Excel.");

  const matriz = utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false }) as unknown[][];
  if (!matriz.length) throw new Error("El Excel no contiene datos.");

  let indiceCabecera = -1;
  let cabecera: string[] = [];
  for (let i = 0; i < matriz.length; i++) {
    const fila = dividirFila(matriz[i]);
    const textoFila = fila.join(" | ").toUpperCase();
    if (textoFila.includes("CL.COND.") && textoFila.includes("CLIENTE") && textoFila.includes("MATERIAL")) {
      indiceCabecera = i;
      cabecera = fila;
      break;
    }
  }
  if (indiceCabecera === -1) {
    indiceCabecera = 0;
    cabecera = dividirFila(matriz[0]);
  }

  const usados: Record<string, number> = {};
  const columnas = cabecera.map((nombre) => nombreColumna(nombre, usados));
  const resultados: ExcelRow[] = [];
  for (let i = indiceCabecera + 1; i < matriz.length; i++) {
    const fila = dividirFila(matriz[i]);
    if (!fila.some((valor) => limpiar(valor) !== "")) continue;
    const registro: ExcelRow = {};
    for (let j = 0; j < columnas.length; j++) registro[columnas[j]] = fila[j] ?? "";
    registro.__filaOrigen = i + 1;
    resultados.push(registro);
  }
  return resultados;
}
