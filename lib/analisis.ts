import { ResultadoValidacion } from "./validador";

export const UMBRAL_OPORTUNIDAD = 15;

export type SeleccionAnalisis = {
  clientes: string[];
  materiales: string[];
  familias: string[];
  condiciones: string[];
  busqueda: string;
};

export type ResumenAnalisis = {
  totalFilas: number;
  filasConPB00: number;
  filasSinPB00: number;
  filasConObservaciones: number;
  porcentajePB00: number;
  resultados: ResultadoValidacion[];
};

export type ComparacionCliente = {
  cliente: string;
  razonSocial: string;
  importeTotal: number;
  importePromedio: number;
  registros: number;
  materiales: number;
  diferenciaVsPromedioOtros: number;
  porcentajeVsPromedioOtros: number;
  vecesVsPromedioOtros: number;
  posicion: number;
};

export type ComparacionGrupo = {
  familia: string;
  material: string;
  descripcion: string;
  registros: number;
  promedio: number;
  minimo: number;
  maximo: number;
  clientes: ComparacionCliente[];
};

export type ComparacionFamiliaCliente = {
  familia: string;
  cliente: string;
  registros: number;
  materiales: number;
  importeTotal: number;
  importePromedio: number;
};

export type ResultadoComercial = {
  universo: ResultadoValidacion[];
  totalRegistros: number;
  clientes: number;
  familias: number;
  materiales: number;
  importeTotal: number;
  importePromedio: number;
  gruposFamilia: Array<{
    familia: string;
    registros: number;
    promedio: number;
    minimo: number;
    maximo: number;
    importeTotal: number;
  }>;
  gruposFamiliaCliente: ComparacionFamiliaCliente[];
  gruposMaterial: ComparacionGrupo[];
  oportunidades: Array<{
    tipo: "PRECIO_ALTO" | "PRECIO_BAJO";
    cliente: string;
    razonSocial: string;
    familia: string;
    material: string;
    importe: number;
    referencia: number;
    diferencia: number;
    porcentaje: number;
    veces: number;
    texto: string;
  }>;
  conclusionEjecutiva: string;
  conclusiones: string[];
};

export function analizarResultados(resultados: ResultadoValidacion[]): ResumenAnalisis {
  const totalFilas = resultados.length;
  const filasConPB00 = resultados.filter((r) => r.tienePB00).length;
  return {
    totalFilas,
    filasConPB00,
    filasSinPB00: totalFilas - filasConPB00,
    filasConObservaciones: resultados.filter((r) => r.observaciones.length > 0).length,
    porcentajePB00: totalFilas ? (filasConPB00 / totalFilas) * 100 : 0,
    resultados,
  };
}

function incluye(texto: string, busqueda: string) {
  return !busqueda || texto.toUpperCase().includes(busqueda.toUpperCase());
}

export function filtrarResultados(resultados: ResultadoValidacion[], seleccion: SeleccionAnalisis): ResultadoValidacion[] {
  const clientes = new Set(seleccion.clientes);
  const materiales = new Set(seleccion.materiales);
  const familias = new Set(seleccion.familias);
  const condiciones = new Set(seleccion.condiciones.map((x) => x.toUpperCase()));
  const q = seleccion.busqueda.trim();

  return resultados.filter((r) => {
    const textoFila = [
      r.cliente,
      r.razonSocial,
      r.material,
      r.descripcionMaterial,
      r.familia,
      r.textoLargoMaterial,
      r.clasificacionMaterial,
      r.condicionExcel,
      r.condicionEsperada,
    ].join(" ");
    const condicion = (r.condicionAnalisis || r.condicionExcel || "").toUpperCase();
    return (!clientes.size || clientes.has(r.razonSocial))
      && (!materiales.size || materiales.has(r.material))
      && (!familias.size || familias.has(r.familia))
      && (!condiciones.size || condiciones.has(condicion))
      && incluye(textoFila, q);
  });
}

function promedio(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function porcentajeVs(valor: number, referencia: number) {
  return referencia ? ((valor - referencia) / referencia) * 100 : 0;
}

function construirConclusion(
  gruposFamilia: ResultadoComercial["gruposFamilia"],
  oportunidades: ResultadoComercial["oportunidades"],
  universo: ResultadoValidacion[],
): { ejecutiva: string; conclusiones: string[] } {
  if (!universo.length) {
    return {
      ejecutiva: "No hay registros válidos para realizar una conclusión comercial con el universo seleccionado.",
      conclusiones: ["El sistema no encontró registros habilitados para comparación de precios."],
    };
  }

  const altas = oportunidades.filter((o) => o.tipo === "PRECIO_ALTO");
  const bajas = oportunidades.filter((o) => o.tipo === "PRECIO_BAJO");
  const familiaMayor = gruposFamilia[0];
  const conclusiones: string[] = [];

  if (altas.length) {
    const o = altas[0];
    conclusiones.push(
      `${o.razonSocial} presenta un importe de $ ${o.importe.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para el material ${o.material}, un ${o.porcentaje.toFixed(1)}% por encima de la referencia de los otros clientes analizados. Esto constituye una señal para revisar la posición comercial y la posibilidad de una adecuación de precio.`,
    );
  }

  if (bajas.length) {
    const o = bajas[0];
    conclusiones.push(
      `${o.razonSocial} presenta un importe de $ ${o.importe.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para el material ${o.material}, un ${Math.abs(o.porcentaje).toFixed(1)}% por debajo de la referencia. Puede ser conveniente revisar si existe margen para una actualización comercial.`,
    );
  }

  if (familiaMayor) {
    conclusiones.push(
      `La familia ${familiaMayor.familia} concentra el mayor importe dentro del universo analizado, con $ ${familiaMayor.importeTotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    );
  }

  if (!oportunidades.length) {
    conclusiones.push(`No se detectaron diferencias superiores al ±${UMBRAL_OPORTUNIDAD}% entre clientes para materiales compartidos dentro del universo seleccionado.`);
  }

  const ejecutiva = oportunidades.length
    ? `El universo seleccionado presenta ${oportunidades.length} señal(es) comercial(es) que superan el umbral del ±${UMBRAL_OPORTUNIDAD}%. La comparación se realizó por material y únicamente con registros validados según las bases maestras.`
    : `El universo seleccionado no presenta señales de precio que superen el umbral del ±${UMBRAL_OPORTUNIDAD}% entre clientes para materiales compartidos. La comparación se realizó únicamente sobre registros validados.`;

  return { ejecutiva, conclusiones };
}

export function realizarAnalisis(resultados: ResultadoValidacion[]): ResultadoComercial {
  const universo = resultados.filter((r) => r.incluidoEnAnalisis && Number.isFinite(r.importeFinal));
  const importeTotal = universo.reduce((s, r) => s + r.importeFinal, 0);

  const familiasMap = new Map<string, ResultadoValidacion[]>();
  const materialesMap = new Map<string, ResultadoValidacion[]>();
  const familiaClienteMap = new Map<string, ResultadoValidacion[]>();

  for (const r of universo) {
    const familia = r.familia || "SIN FAMILIA";
    if (!familiasMap.has(familia)) familiasMap.set(familia, []);
    familiasMap.get(familia)!.push(r);

    const materialKey = `${familia}|||${r.material}`;
    if (!materialesMap.has(materialKey)) materialesMap.set(materialKey, []);
    materialesMap.get(materialKey)!.push(r);

    const familiaClienteKey = `${familia}|||${r.razonSocial}`;
    if (!familiaClienteMap.has(familiaClienteKey)) familiaClienteMap.set(familiaClienteKey, []);
    familiaClienteMap.get(familiaClienteKey)!.push(r);
  }

  const gruposFamilia = Array.from(familiasMap.entries()).map(([familia, rows]) => ({
    familia,
    registros: rows.length,
    promedio: promedio(rows.map((r) => r.importeFinal)),
    minimo: Math.min(...rows.map((r) => r.importeFinal)),
    maximo: Math.max(...rows.map((r) => r.importeFinal)),
    importeTotal: rows.reduce((s, r) => s + r.importeFinal, 0),
  })).sort((a, b) => b.importeTotal - a.importeTotal);

  const gruposFamiliaCliente: ComparacionFamiliaCliente[] = Array.from(familiaClienteMap.entries()).map(([key, rows]) => {
    const [familia, cliente] = key.split("|||");
    return {
      familia,
      cliente,
      registros: rows.length,
      materiales: new Set(rows.map((r) => r.material)).size,
      importeTotal: rows.reduce((s, r) => s + r.importeFinal, 0),
      importePromedio: promedio(rows.map((r) => r.importeFinal)),
    };
  }).sort((a, b) => a.familia.localeCompare(b.familia) || b.importePromedio - a.importePromedio);

  const gruposMaterial: ComparacionGrupo[] = Array.from(materialesMap.entries()).map(([key, rows]) => {
    const [familia, material] = key.split("|||");
    const promedioGrupo = promedio(rows.map((r) => r.importeFinal));
    const clientesMap = new Map<string, ResultadoValidacion[]>();
    for (const r of rows) {
      if (!clientesMap.has(r.razonSocial)) clientesMap.set(r.razonSocial, []);
      clientesMap.get(r.razonSocial)!.push(r);
    }

    const raw = Array.from(clientesMap.entries()).map(([cliente, cr]) => ({
      cliente,
      razonSocial: cliente,
      importeTotal: cr.reduce((s, r) => s + r.importeFinal, 0),
      importePromedio: promedio(cr.map((r) => r.importeFinal)),
      registros: cr.length,
      materiales: new Set(cr.map((r) => r.material)).size,
      diferenciaVsPromedioOtros: 0,
      porcentajeVsPromedioOtros: 0,
      vecesVsPromedioOtros: 0,
      posicion: 0,
    }));

    raw.sort((a, b) => b.importePromedio - a.importePromedio);
    const clientes = raw.map((c, index) => {
      const otros = raw.filter((x) => x.cliente !== c.cliente).map((x) => x.importePromedio);
      const ref = otros.length ? promedio(otros) : promedioGrupo;
      const diferencia = c.importePromedio - ref;
      const porcentaje = porcentajeVs(c.importePromedio, ref);
      return {
        ...c,
        diferenciaVsPromedioOtros: diferencia,
        porcentajeVsPromedioOtros: porcentaje,
        vecesVsPromedioOtros: ref ? c.importePromedio / ref : 0,
        posicion: index + 1,
      };
    });

    return {
      familia,
      material,
      descripcion: rows[0]?.descripcionMaterial || "",
      registros: rows.length,
      promedio: promedioGrupo,
      minimo: Math.min(...rows.map((r) => r.importeFinal)),
      maximo: Math.max(...rows.map((r) => r.importeFinal)),
      clientes,
    };
  }).sort((a, b) => b.promedio - a.promedio);

  const oportunidades: ResultadoComercial["oportunidades"] = [];
  for (const grupo of gruposMaterial) {
    if (grupo.clientes.length < 2) continue;
    for (const c of grupo.clientes) {
      const otros = grupo.clientes.filter((x) => x.cliente !== c.cliente);
      const ref = promedio(otros.map((x) => x.importePromedio));
      if (!ref) continue;
      const diff = c.importePromedio - ref;
      const pct = (diff / ref) * 100;
      const veces = c.importePromedio / ref;
      if (pct >= UMBRAL_OPORTUNIDAD) {
        oportunidades.push({
          tipo: "PRECIO_ALTO",
          cliente: c.cliente,
          razonSocial: c.razonSocial,
          familia: grupo.familia,
          material: grupo.material,
          importe: c.importePromedio,
          referencia: ref,
          diferencia: diff,
          porcentaje: pct,
          veces,
          texto: `${c.razonSocial} presenta un importe ${pct.toFixed(1)}% por encima del promedio de los otros clientes para el material ${grupo.material}.`,
        });
      } else if (pct <= -UMBRAL_OPORTUNIDAD) {
        oportunidades.push({
          tipo: "PRECIO_BAJO",
          cliente: c.cliente,
          razonSocial: c.razonSocial,
          familia: grupo.familia,
          material: grupo.material,
          importe: c.importePromedio,
          referencia: ref,
          diferencia: diff,
          porcentaje: pct,
          veces,
          texto: `${c.razonSocial} presenta un importe ${Math.abs(pct).toFixed(1)}% por debajo del promedio de los otros clientes para el material ${grupo.material}.`,
        });
      }
    }
  }

  oportunidades.sort((a, b) => Math.abs(b.porcentaje) - Math.abs(a.porcentaje));
  const conclusion = construirConclusion(gruposFamilia, oportunidades, universo);

  return {
    universo,
    totalRegistros: universo.length,
    clientes: new Set(universo.map((r) => r.razonSocial)).size,
    familias: new Set(universo.map((r) => r.familia)).size,
    materiales: new Set(universo.map((r) => r.material)).size,
    importeTotal,
    importePromedio: promedio(universo.map((r) => r.importeFinal)),
    gruposFamilia,
    gruposFamiliaCliente,
    gruposMaterial,
    oportunidades,
    conclusionEjecutiva: conclusion.ejecutiva,
    conclusiones: conclusion.conclusiones,
  };
}
