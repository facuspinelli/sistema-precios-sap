import { enriquecerMaterial, normalizar, numero, reglasCliente, texto, valorCampo } from "./maestros";

export type Estado = "OK" | "ALERTA" | "ERROR";

export type ResultadoValidacion = {
  fila: number;
  datos: Record<string, unknown>;
  cliente: string;
  razonSocial: string;
  clienteEncontrado: boolean;
  condicionExcel: string;
  condicionEsperada: string;
  condicionCorrecta: boolean;
  condicionesEncontradas: string[];
  condicionesExcelCliente: string[];
  multiplesCondiciones: boolean;
  condicionAnalisis: string;
  incluidoEnAnalisis: boolean;
  material: string;
  descripcionMaterial: string;
  materialEncontrado: boolean;
  textoLargoMaterial: string;
  familia: string;
  clasificacionMaterial: string;
  importe: number;
  moneda: string;
  cantidad: number;
  por: number;
  unidadMedida: string;
  tienePB00: boolean;
  importePB00: number;
  importeFinal: number;
  observaciones: string[];
  estado: Estado;
};

function esPB00(datos: Record<string, unknown>): boolean {
  return Object.values(datos).some((v) => normalizar(v) === "PB00");
}

function filaBase(datos: Record<string, unknown>, numeroFila: number): ResultadoValidacion {
  const observaciones: string[] = [];
  const cliente = valorCampo(datos, ["Cliente", "Cl.sap", "Cod SAP", "COD SAP", "Código SAP", "Codigo SAP"]);
  const reglas = reglasCliente(cliente);
  const clienteEncontrado = reglas.length > 0;
  const razonSocial = clienteEncontrado ? texto(reglas[0].razon_social) : "";

  if (!clienteEncontrado) observaciones.push(`Cliente ${cliente || "(vacío)"} no existe en la base de referencia ZPR.`);

  const condicionExcel = valorCampo(datos, ["Cl.cond.", "Cl. cond.", "Condición", "Condicion", "Condición impositiva", "Condicion impositiva"]);
  const condicionesEncontradas = Array.from(new Set(reglas.map((r: any) => normalizar(r.condicion_impositiva)).filter(Boolean)));
  const condicionEsperada = condicionesEncontradas.length === 1 ? condicionesEncontradas[0] : "";
  const multiplesCondiciones = condicionesEncontradas.length > 1;
  if (multiplesCondiciones) observaciones.push(`El cliente ${cliente} tiene múltiples condiciones en la base: ${condicionesEncontradas.join(", ")}.`);

  const material = valorCampo(datos, ["Material", "Material PROD", "Material producto", "Código material", "Codigo material"]);
  const mat = enriquecerMaterial(material);
  if (!mat.encontrado && material) observaciones.push(`El material ${material} no existe en el Nomenclador SAP.`);

  const importe = numero(valorCampo(datos, ["Importe"]));
  const moneda = valorCampo(datos, ["Un."]);
  const cantidad = numero(valorCampo(datos, ["Ctd.escala", "Ctd. escala", "Cantidad"]));
  const por = numero(valorCampo(datos, ["por"]));
  const unidadMedida = valorCampo(datos, ["UM_2", "UM"]);

  const condicionCorrecta = Boolean(
    clienteEncontrado &&
    condicionEsperada &&
    condicionExcel &&
    normalizar(condicionExcel) === normalizar(condicionEsperada)
  );
  if (clienteEncontrado && condicionEsperada && condicionExcel && !condicionCorrecta) {
    observaciones.push(`Condición incorrecta: Excel = ${condicionExcel}; según la base corresponde ${condicionEsperada}.`);
  }

  const incluidoEnAnalisis = Boolean(clienteEncontrado && mat.encontrado && condicionCorrecta);
  const condicionAnalisis = incluidoEnAnalisis ? condicionEsperada : "";

  let estado: Estado = "OK";
  if (!clienteEncontrado || !mat.encontrado) estado = "ERROR";
  else if (!condicionCorrecta || observaciones.length) estado = "ALERTA";

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
    condicionesExcelCliente: condicionExcel ? [normalizar(condicionExcel)] : [],
    multiplesCondiciones,
    condicionAnalisis,
    incluidoEnAnalisis,
    material,
    descripcionMaterial: mat.descripcion,
    materialEncontrado: mat.encontrado,
    textoLargoMaterial: mat.textoLargo,
    familia: mat.familia,
    clasificacionMaterial: mat.clasificacion,
    importe,
    moneda,
    cantidad,
    por,
    unidadMedida,
    tienePB00: false,
    importePB00: 0,
    importeFinal: importe,
    observaciones,
    estado,
  };
}

export function validarExcel(filas: Record<string, unknown>[]): ResultadoValidacion[] {
  const resultados: ResultadoValidacion[] = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const origen = numero(fila.__filaOrigen);
    const numeroFila = origen || i + 2;

    if (esPB00(fila)) {
      const importePB00 = numero(valorCampo(fila, ["Importe"]));
      const anterior = resultados[resultados.length - 1];
      if (anterior) {
        anterior.tienePB00 = true;
        anterior.importePB00 = importePB00;
        anterior.importeFinal = anterior.importe + importePB00;
        anterior.observaciones.push(`PB00 aplicado: +${importePB00} ${anterior.moneda}.`);
        if (anterior.estado === "OK") anterior.estado = "ALERTA";
      }
      continue;
    }

    resultados.push(filaBase(fila, numeroFila));
  }

  const porCliente = new Map<string, ResultadoValidacion[]>();
  for (const r of resultados) {
    if (!porCliente.has(r.cliente)) porCliente.set(r.cliente, []);
    porCliente.get(r.cliente)!.push(r);
  }

  for (const [cliente, filasCliente] of Array.from(porCliente.entries())) {
    const condicionesExcel = Array.from(new Set(filasCliente.map((r) => normalizar(r.condicionExcel)).filter(Boolean)));
    const reglas = reglasCliente(cliente);
    const esperadas = Array.from(new Set(reglas.map((r: any) => normalizar(r.condicion_impositiva)).filter(Boolean)));
    const esperada = esperadas.length === 1 ? esperadas[0] : "";
    const multiples = condicionesExcel.length > 1;

    for (const r of filasCliente) {
      r.condicionesExcelCliente = condicionesExcel;
      r.multiplesCondiciones = multiples;
      if (multiples) {
        const mensaje = `El cliente ${r.razonSocial || cliente} presenta en el Excel las condiciones ${condicionesExcel.join(" y ")}. Según la base corresponde ${esperada || "revisar"}.`;
        if (!r.observaciones.includes(mensaje)) r.observaciones.push(mensaje);
        if (r.estado === "OK") r.estado = "ALERTA";
      }
      r.condicionEsperada = esperada || r.condicionEsperada;
      r.incluidoEnAnalisis = Boolean(r.clienteEncontrado && r.materialEncontrado && esperada && normalizar(r.condicionExcel) === esperada);
      r.condicionAnalisis = r.incluidoEnAnalisis ? esperada : "";
    }
  }

  return resultados;
}
