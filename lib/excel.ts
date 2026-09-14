"use client";

import XLSX from "xlsx";

export type ExcelRow = Record<string, unknown>;

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
      "No se pudo leer la primera hoja del Excel."
    );
  }

  const datos =
    XLSX.utils.sheet_to_json<ExcelRow>(
      worksheet,
      {
        defval: "",
      }
    );

  return datos;
}
