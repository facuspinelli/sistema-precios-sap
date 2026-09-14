import baseProductos from "../data/base_productos.json";
import baseReglas from "../data/base_reglas.json";

export type ResultadoValidacion = {
  fila: number;
  datos: Record<string, unknown>;
  productoEncontrado: boolean;
  reglaEncontrada: boolean;
  tienePB00: boolean;
  observaciones: string[];
};

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).trim().toUpperCase();
}

export function validarFila(
  datos: Record<string, unknown>,
  numeroFila: number
): ResultadoValidacion {
  const observaciones: string[] = [];

  const valores = Object.values(datos).map(texto);

  const tienePB00 = valores.some((valor) =>
    valor.includes("PB00")
  );

  if (tienePB00) {
    observaciones.push(
      "La fila contiene el código PB00."
    );
  }

  const productoEncontrado =
    Array.isArray(baseProductos.productos) &&
    baseProductos.productos.length > 0;

  const reglaEncontrada =
    Array.isArray(baseReglas.reglas) &&
    baseReglas.reglas.length > 0;

  if (!productoEncontrado) {
    observaciones.push(
      "La base de productos todavía no contiene registros."
    );
  }

  if (!reglaEncontrada) {
    observaciones.push(
      "La base de reglas todavía no contiene registros."
    );
  }

  return {
    fila: numeroFila,
    datos,
    productoEncontrado,
    reglaEncontrada,
    tienePB00,
    observaciones,
  };
}

export function validarExcel(
  filas: Record<string, unknown>[]
): ResultadoValidacion[] {
  return filas.map((fila, index) =>
    validarFila(fila, index + 2)
  );
}
