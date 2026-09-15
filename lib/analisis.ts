import { ResultadoValidacion } from "./validador";

// Este valor NO es el porcentaje de diferencia. Es solamente el umbral
// que usamos para marcar una diferencia como señal comercial.
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
  referenciaOtros: number;
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
  referenciaOtros: number;
  diferenciaVsOtros: number;
  porcentajeVsOtros: number;
  vecesVsOtros: number;
  posicion: number;
  materialesComparables: number;
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

/** Porcentaje REAL de diferencia contra una referencia. Ej.: 10 vs 5 = +100%. */
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
      `${o.razonSocial} presenta un importe de ${formatearImporte(o.importe)} para el material ${o.material}, un ${o.porcentaje.toFixed(1)}% por encima de la referencia de los otros clientes analizados. Esto constituye una señal para revisar la posición comercial y la posibilidad de una adecuación de precio.`,
    );
  }

  if (bajas.length) {
    const o = bajas[0];
    conclusiones.push(
      `${o.razonSocial} presenta un importe de ${formatearImporte(o.importe)} para el material ${o.material}, un ${Math.abs(o.porcentaje).toFixed(1)}% por debajo de la referencia. Puede ser conveniente revisar si existe margen para una actualización comercial.`,
    );
  }

  if (familiaMayor) {
    conclusiones.push(
      `La familia ${familiaMayor.familia} concentra el mayor importe dentro del universo analizado, con ${formatearImporte(familiaMayor.importeTotal)}.`,
    );
  }

  if (!oportunidades.length) {
    conclusiones.push(`No se detectaron diferencias que superen el umbral del ±${UMBRAL_OPORTUNIDAD}% entre clientes para materiales compartidos dentro del universo seleccionado.`);
  }

  const ejecutiva = oportunidades.length
    ? `El universo seleccionado presenta ${oportunidades.length} señal(es) comercial(es) que superan el umbral del ±${UMBRAL_OPORTUNIDAD}%. El porcentaje mostrado es la diferencia real entre el importe del cliente y la referencia de los otros clientes, calculada únicamente dentro del universo seleccionado.`
    : `El universo seleccionado no presenta señales de precio que superen el umbral del ±${UMBRAL_OPORTUNIDAD}% entre clientes para materiales compartidos. Los porcentajes se calculan únicamente con los registros incluidos en el universo seleccionado.`;

  return { ejecutiva, conclusiones };
}

function formatearImporte(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function realizarAnalisis(resultados: ResultadoValidacion[]): ResultadoComercial {
  // IMPORTANTE: el análisis jamás mira el Excel completo acá.
  // Recibe solamente el universo que ya fue filtrado por el usuario.
  const universo = resultados.filter((r) => r.incluidoEnAnalisis && Number.isFinite(r.importeFinal));
  const importeTotal = universo.reduce((s, r) => s + r.importeFinal, 0);

  const familiasMap = new Map<string, ResultadoValidacion[]>();
  const materialesMap = new Map<string, ResultadoValidacion[]>();

  for (const r of universo) {
    const familia = r.familia || "SIN FAMILIA";
    if (!familiasMap.has(familia)) familiasMap.set(familia, []);
    familiasMap.get(familia)!.push(r);

    const materialKey = `${familia}|||${r.material}`;
    if (!materialesMap.has(materialKey)) materialesMap.set(materialKey, []);
    materialesMap.get(materialKey)!.push(r);
  }

  const gruposFamilia = Array.from(familiasMap.entries()).map(([familia, rows]) => ({
    familia,
    registros: rows.length,
    promedio: promedio(rows.map((r) => r.importeFinal)),
    minimo: Math.min(...rows.map((r) => r.importeFinal)),
    maximo: Math.max(...rows.map((r) => r.importeFinal)),
    importeTotal: rows.reduce((s, r) => s + r.importeFinal, 0),
  })).sort((a, b) => b.importeTotal - a.importeTotal);

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
      referenciaOtros: 0,
      diferenciaVsPromedioOtros: 0,
      porcentajeVsPromedioOtros: 0,
      vecesVsPromedioOtros: 0,
      posicion: 0,
    }));

    raw.sort((a, b) => b.importePromedio - a.importePromedio);
    const clientes = raw.map((c, index) => {
      const otros = raw.filter((x) => x.cliente !== c.cliente).map((x) => x.importePromedio);
      const ref = otros.length ? promedio(otros) : 0;
      const diferencia = ref ? c.importePromedio - ref : 0;
      const porcentaje = ref ? porcentajeVs(c.importePromedio, ref) : 0;
      return {
        ...c,
        referenciaOtros: ref,
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

  // Comparación de familia por cliente.
  // Para que sea justa, el porcentaje de familia usa únicamente materiales
  // que tienen al menos dos clientes dentro del universo seleccionado.
  const gruposFamiliaCliente: ComparacionFamiliaCliente[] = [];
  for (const familia of gruposFamilia) {
    const materialesFamilia = gruposMaterial.filter((g) => g.familia === familia.familia && g.clientes.length >= 2);
    const clientesFamilia = new Set<string>();
    materialesFamilia.forEach((g) => g.clientes.forEach((c) => clientesFamilia.add(c.cliente)));

    const baseRows = universo.filter((r) => r.familia === familia.familia);
    for (const cliente of clientesFamilia) {
      const rowsCliente = baseRows.filter((r) => r.razonSocial === cliente);
      const comparables = materialesFamilia
        .map((g) => {
          const propio = g.clientes.find((c) => c.cliente === cliente);
          if (!propio) return null;
          const otros = g.clientes.filter((c) => c.cliente !== cliente);
          if (!otros.length) return null;
          return { propio: propio.importePromedio, referencia: promedio(otros.map((c) => c.importePromedio)) };
        })
        .filter(Boolean) as Array<{ propio: number; referencia: number }>;

      const importePromedio = promedio(rowsCliente.map((r) => r.importeFinal));
      const ref = promedio(comparables.map((x) => x.referencia));
      const propioComparable = promedio(comparables.map((x) => x.propio));
      const diferencia = ref ? propioComparable - ref : 0;
      const porcentaje = ref ? porcentajeVs(propioComparable, ref) : 0;

      gruposFamiliaCliente.push({
        familia: familia.familia,
        cliente,
        registros: rowsCliente.length,
        materiales: new Set(rowsCliente.map((r) => r.material)).size,
        importeTotal: rowsCliente.reduce((s, r) => s + r.importeFinal, 0),
        importePromedio,
        referenciaOtros: ref,
        diferenciaVsOtros: diferencia,
        porcentajeVsOtros: porcentaje,
        vecesVsOtros: ref ? propioComparable / ref : 0,
        posicion: 0,
        materialesComparables: comparables.length,
      });
    }
  }

  const porFamilia = new Map<string, ComparacionFamiliaCliente[]>();
  for (const x of gruposFamiliaCliente) {
    if (!porFamilia.has(x.familia)) porFamilia.set(x.familia, []);
    porFamilia.get(x.familia)!.push(x);
  }
  for (const [, rows] of porFamilia) {
    rows.sort((a, b) => b.importePromedio - a.importePromedio);
    rows.forEach((x, i) => { x.posicion = i + 1; });
  }
  gruposFamiliaCliente.sort((a, b) => a.familia.localeCompare(b.familia) || b.importePromedio - a.importePromedio);

  const oportunidades: ResultadoComercial["oportunidades"] = [];
  for (const grupo of gruposMaterial) {
    // Sin al menos dos clientes no existe comparación real.
    if (grupo.clientes.length < 2) continue;
    for (const c of grupo.clientes) {
      const ref = c.referenciaOtros;
      if (!ref) continue;
      const diff = c.importePromedio - ref;
      const pct = porcentajeVs(c.importePromedio, ref);
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
          texto: `${c.razonSocial} tiene un importe ${pct.toFixed(1)}% superior a la referencia de los otros clientes para el mismo material.`,
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
          texto: `${c.razonSocial} tiene un importe ${Math.abs(pct).toFixed(1)}% inferior a la referencia de los otros clientes para el mismo material.`,
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
