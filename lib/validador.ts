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

  // Datos económicos
  importe: number;
  moneda: string;
  cantidad: number;
  por: number;
  unidadMedida: string;

  // PB00
  tienePB00: boolean;
  importePB00: number;
  importeFinal: number;

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

function numero(valor: unknown): number {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return 0;
  }

  let texto = String(valor)
    .trim()
    .replace(/\s/g, "");

  /*
   * SAP puede mostrar:
   *
   * 966,23
   * 25.037,09
   * 100
   *
   * Convertimos todo a número.
   */

  if (
    texto.includes(".") &&
    texto.includes(",")
  ) {
    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (texto.includes(",")) {
    texto = texto.replace(",", ".");
  }

  const resultado =
    Number(texto);

  return isNaN(resultado)
    ? 0
    : resultado;
}

function buscarValor(
  datos: Record<string, unknown>,
  posiblesNombres: string[]
): string {
  const entradas =
    Object.entries(datos);

  for (
    const nombre of posiblesNombres
  ) {
    const buscado =
      normalizar(nombre);

    const encontrada =
      entradas.find(
        ([clave]) =>
          normalizar(clave) === buscado
      );

    if (encontrada) {
      return normalizar(
        encontrada[1]
      );
    }
  }

  return "";
}

function buscarProducto(
  material: string
) {
  const productos =
    Array.isArray(
      baseProductos.productos
    )
      ? baseProductos.productos
      : [];

  return productos.find(
    (producto: any) =>
      normalizar(
        producto.material
      ) === material
  );
}

function buscarReglasCliente(
  cliente: string
) {
  const reglas =
    Array.isArray(
      baseReglas.reglas
    )
      ? baseReglas.reglas
      : [];

  return reglas.filter(
    (regla: any) =>
      normalizar(
        regla.cod_sap
      ) === cliente
  );
}

function esPB00(
  datos: Record<string, unknown>
): boolean {
  const valores =
    Object.values(datos)
      .map(normalizar);

  return valores.some(
    (valor) =>
      valor === "PB00" ||
      valor.includes("-> PB00") ||
      valor.includes("PB00")
  );
}

function esFilaPB00(
  datos: Record<string, unknown>
): boolean {
  return esPB00(datos);
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

  const cliente =
    buscarValor(datos, [
      "Cliente",
      "Cl.sap",
      "Cod SAP",
      "COD SAP",
      "Código SAP",
      "Codigo SAP"
    ]);

  const reglasCliente =
    buscarReglasCliente(cliente);

  const clienteEncontrado =
    reglasCliente.length > 0;

  const razonSocial =
    clienteEncontrado
      ? normalizar(
          reglasCliente[0]
            .razon_social
        )
      : "";

  if (!clienteEncontrado) {
    observaciones.push(
      `Cliente ${
        cliente || "(vacío)"
      } no existe en la base de Condición Impositiva.`
    );
  }

  /*
   * ==============================
   * CONDICIÓN
   * ==============================
   */

  const condicionExcel =
    buscarValor(datos, [
      "Cl.cond.",
      "Cl. cond.",
      "Condición",
      "Condicion",
      "Condición impositiva",
      "Condicion impositiva"
    ]);

  const condicionesEncontradas: string[] =
    [];

  for (
    const regla of reglasCliente
  ) {
    const condicion =
      normalizar(
        (regla as any)
          .condicion_impositiva
      );

    if (
      condicion &&
      condicionesEncontradas.indexOf(
        condicion
      ) === -1
    ) {
      condicionesEncontradas.push(
        condicion
      );
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

  let condicionCorrecta = false;

  if (
    clienteEncontrado &&
    condicionEsperada &&
    condicionExcel
  ) {
    condicionCorrecta =
      condicionExcel ===
      condicionEsperada;

    if (!condicionCorrecta) {
      observaciones.push(
        `Condición incorrecta: Excel = ${condicionExcel}; según la base corresponde ${condicionEsperada}.`
      );
    }
  }

  /*
   * ==============================
   * MATERIAL
   * ==============================
   */

  const material =
    buscarValor(datos, [
      "Material",
      "Material PROD",
      "Material producto",
      "Código material",
      "Codigo material"
    ]);

  const producto =
    buscarProducto(material);

  const materialEncontrado =
    Boolean(producto);

  const descripcionMaterial =
    producto
      ? normalizar(
          producto.descripcion
        )
      : "";

  if (
    !materialEncontrado &&
    material
  ) {
    observaciones.push(
      `El material ${material} no existe en el Nomenclador SAP.`
    );
  }

  /*
   * ==============================
   * DATOS ECONÓMICOS
   * ==============================
   */

  const importeTexto =
    buscarValor(datos, [
      "Importe"
    ]);

  const importe =
    numero(importeTexto);

  const moneda =
    buscarValor(datos, [
      "Un."
    ]);

  const cantidadTexto =
    buscarValor(datos, [
      "Ctd.escala",
      "Ctd. escala",
      "Cantidad"
    ]);

  const cantidad =
    numero(cantidadTexto);

  const porTexto =
    buscarValor(datos, [
      "por"
    ]);

  const por =
    numero(porTexto);

  const unidadMedida =
    buscarValor(datos, [
      "UM"
    ]);

  /*
   * ==============================
   * PB00
   * ==============================
   */

  const tienePB00 =
    esPB00(datos);

  /*
   * Una fila PB00 contiene solamente
   * el importe del ajuste.
   */

  const importePB00 =
    tienePB00
      ? importe
      : 0;

  /*
   * En una fila normal el importe
   * todavía no tiene PB00 asociado.
   *
   * validarExcel() se encarga de
   * asociarlo a la fila anterior.
   */

  const importeFinal =
    importe + importePB00;

  if (tienePB00) {
    observaciones.push(
      "Línea PB00 detectada."
    );
  }

  /*
   * ==============================
   * ESTADO
   * ==============================
   */

  let estado:
    | "OK"
    | "ALERTA"
    | "ERROR" = "OK";

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

    condicionExcel,
    condicionEsperada,
    condicionCorrecta,
    condicionesEncontradas,
    multiplesCondiciones,

    material,
    descripcionMaterial,
    materialEncontrado,

    importe,
    moneda,
    cantidad,
    por,
    unidadMedida,

    tienePB00,
    importePB00,
    importeFinal,

    observaciones,
    estado
  };
}

export function validarExcel(
  filas: Record<string, unknown>[]
): ResultadoValidacion[] {

  const resultados: ResultadoValidacion[] =
    [];

  for (
    let i = 0;
    i < filas.length;
    i++
  ) {
    const fila =
      filas[i];

    const numeroFila =
      i + 2;

    /*
     * Detectamos PB00 antes de crear
     * un resultado independiente.
     */

    if (esFilaPB00(fila)) {

      const importePB00 =
        numero(
          buscarValor(fila, [
            "Importe"
          ])
        );

      /*
       * PB00 se aplica a la fila
       * inmediatamente anterior.
       */

      const anterior =
        resultados[
          resultados.length - 1
        ];

      if (anterior) {

        anterior.tienePB00 =
          true;

        anterior.importePB00 =
          importePB00;

        anterior.importeFinal =
          anterior.importe +
          importePB00;

        anterior.observaciones.push(
          `PB00 aplicado: +${importePB00} ${anterior.moneda}. Importe final: ${anterior.importeFinal.toFixed(
            2
          )}.`
        );

        if (
          anterior.estado === "OK"
        ) {
          anterior.estado =
            "ALERTA";
        }

      } else {

        /*
         * Caso extraño:
         * PB00 sin una línea anterior.
         */

        resultados.push(
          validarFila(
            fila,
            numeroFila
          )
        );
      }

      continue;
    }

    resultados.push(
      validarFila(
        fila,
        numeroFila
      )
    );
  }

  return resultados;
}
