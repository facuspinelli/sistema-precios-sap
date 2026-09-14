import baseProductos from "../data/base_productos.json";
import baseReglas from "../data/base_reglas.json";

export type ResultadoValidacion = {
  fila: number;
  datos: Record<string, unknown>;

  // Cliente
  cliente: string;
  razonSocial: string;
  clienteEncontrado: boolean;

  // Condición
  condicionExcel: string;
  condicionEsperada: string;
  condicionCorrecta: boolean;
  condicionesEncontradas: string[];
  multiplesCondiciones: boolean;

  // Material
  material: string;
  descripcionMaterial: string;
  materialEncontrado: boolean;

  // PB00
  tienePB00: boolean;

  // Resultado
  observaciones: string[];
  estado: "OK" | "ALERTA" | "ERROR";
};

function normalizar(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .trim()
    .toUpperCase();
}

function buscarValor(
  datos: Record<string, unknown>,
  posiblesNombres: string[]
): string {
  const entradas = Object.entries(datos);

  for (const nombre of posiblesNombres) {
    const buscado = normalizar(nombre);

    const encontrada = entradas.find(
      ([clave]) => normalizar(clave) === buscado
    );

    if (encontrada) {
      return normalizar(encontrada[1]);
    }
  }

  return "";
}

function buscarProducto(material: string) {
  const productos = Array.isArray(baseProductos.productos)
    ? baseProductos.productos
    : [];

  return productos.find(
    (producto: any) =>
      normalizar(producto.material) === material
  );
}

function buscarReglasCliente(cliente: string) {
  const reglas = Array.isArray(baseReglas.reglas)
    ? baseReglas.reglas
    : [];

  return reglas.filter(
    (regla: any) =>
      normalizar(regla.cod_sap) === cliente
  );
}

export function validarFila(
  datos: Record<string, unknown>,
  numeroFila: number
): ResultadoValidacion {

  const observaciones: string[] = [];

  /*
   * ==============================
   * CLIENTE
   * ==============================
   */

  const cliente = buscarValor(datos, [
    "Cliente",
    "Cl.sap",
    "Cod SAP",
    "COD SAP",
    "Código SAP",
    "Codigo SAP"
  ]);

  const reglasCliente = buscarReglasCliente(cliente);

  const clienteEncontrado =
    reglasCliente.length > 0;

  const razonSocial =
    clienteEncontrado
      ? normalizar(
          reglasCliente[0].razon_social
        )
      : "";

  if (!clienteEncontrado) {
    observaciones.push(
      `Cliente ${cliente || "(vacío)"} no existe en la base de Condición Impositiva.`
    );
  }

  /*
   * ==============================
   * CONDICIÓN DEL EXCEL
   * ==============================
   */

  const condicionExcel = buscarValor(datos, [
    "Cl.cond.",
    "Cl. cond.",
    "Condición",
    "Condicion",
    "Condición impositiva",
    "Condicion impositiva"
  ]);

  /*
   * Normalizamos variantes como:
   * zpr0 → ZPR0
   * zpr2 → ZPR2
   */

  const condicionNormalizada =
    condicionExcel;

  /*
   * ==============================
   * CONDICIONES DE LA BASE
   * ==============================
   */

  const condicionesEncontradas: string[] = [];

for (const regla of reglasCliente) {
  const condicion = normalizar(
    (regla as any).condicion_impositiva
  );

  if (
    condicion &&
    condicionesEncontradas.indexOf(condicion) === -1
  ) {
    condicionesEncontradas.push(condicion);
  }
}

  const condicionEsperada =
    condicionesEncontradas.length === 1
      ? condicionesEncontradas[0]
      : "";

  const multiplesCondiciones =
    condicionesEncontradas.length > 1;

  if (multiplesCondiciones) {
    observaciones.push(
      `El cliente ${cliente} tiene múltiples condiciones en la base: ${condicionesEncontradas.join(
        ", "
      )}.`
    );
  }

  /*
   * ==============================
   * COMPARACIÓN ZPR0 / ZPR2
   * ==============================
   */

  let condicionCorrecta = false;

  if (
    clienteEncontrado &&
    condicionEsperada &&
    condicionNormalizada
  ) {
    condicionCorrecta =
      condicionNormalizada ===
      condicionEsperada;

    if (!condicionCorrecta) {
      observaciones.push(
        `Condición incorrecta: Excel = ${condicionNormalizada}; según la base corresponde ${condicionEsperada}.`
      );
    }
  }

  /*
   * ==============================
   * MATERIAL
   * ==============================
   */

  const material = buscarValor(datos, [
    "Material",
    "Material PROD",
    "Material producto",
    "Código material",
    "Codigo material"
  ]);

  const producto = buscarProducto(material);

  const materialEncontrado =
    Boolean(producto);

  const descripcionMaterial =
    producto
      ? normalizar(producto.descripcion)
      : "";

  if (!materialEncontrado && material) {
    observaciones.push(
      `El material ${material} no existe en el Nomenclador SAP.`
    );
  }

  /*
   * ==============================
   * PB00
   * ==============================
   */

  const valores = Object.values(datos)
    .map(normalizar);

  const tienePB00 =
    valores.some(
      (valor) => valor === "PB00"
    );

  if (tienePB00) {
    observaciones.push(
      "La fila contiene PB00."
    );
  }

  /*
   * ==============================
   * ESTADO FINAL
   * ==============================
   */

  let estado: "OK" | "ALERTA" | "ERROR" = "OK";

  if (
    observaciones.some(
      (observacion) =>
        observacion.includes(
          "no existe"
        )
    )
  ) {
    estado = "ERROR";
  } else if (
    observaciones.length > 0
  ) {
    estado = "ALERTA";
  }

  return {
    fila: numeroFila,
    datos,

    cliente,
    razonSocial,
    clienteEncontrado,

    condicionExcel: condicionNormalizada,
    condicionEsperada,
    condicionCorrecta,
    condicionesEncontradas,
    multiplesCondiciones,

    material,
    descripcionMaterial,
    materialEncontrado,

    tienePB00,

    observaciones,
    estado
  };
}

export function validarExcel(
  filas: Record<string, unknown>[]
): ResultadoValidacion[] {

  return filas.map(
    (fila, index) =>
      validarFila(
        fila,
        index + 2
      )
  );
}
