import {
  ResultadoValidacion,
} from "./validador";

export type ResumenAnalisis = {
  totalFilas: number;
  filasConPB00: number;
  filasSinPB00: number;
  filasConObservaciones: number;
  porcentajePB00: number;
  resultados: ResultadoValidacion[];
};

export function analizarResultados(
  resultados: ResultadoValidacion[]
): ResumenAnalisis {
  const totalFilas = resultados.length;

  const filasConPB00 = resultados.filter(
    (resultado) => resultado.tienePB00
  ).length;

  const filasSinPB00 =
    totalFilas - filasConPB00;

  const filasConObservaciones =
    resultados.filter(
      (resultado) =>
        resultado.observaciones.length > 0
    ).length;

  const porcentajePB00 =
    totalFilas > 0
      ? (filasConPB00 / totalFilas) * 100
      : 0;

  return {
    totalFilas,
    filasConPB00,
    filasSinPB00,
    filasConObservaciones,
    porcentajePB00,
    resultados,
  };
}
