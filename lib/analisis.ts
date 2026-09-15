import { ResultadoValidacion } from "./validador";

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
    texto: string;
  }>;
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
  const condiciones = new Set(seleccion.condiciones);
  const q = seleccion.busqueda.trim();

  return resultados.filter((r) => {
    const textoFila = [r.cliente, r.razonSocial, r.material, r.descripcionMaterial, r.familia, r.textoLargoMaterial, r.clasificacionMaterial, r.condicionExcel].join(" ");
    return (!clientes.size || clientes.has(r.razonSocial))
      && (!materiales.size || materiales.has(r.material))
      && (!familias.size || familias.has(r.familia))
      && (!condiciones.size || condiciones.has(r.condicionAnalisis || r.condicionExcel))
      && incluye(textoFila, q);
  });
}

function promedio(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }

export function realizarAnalisis(resultados: ResultadoValidacion[]): ResultadoComercial {
  const universo = resultados.filter((r) => r.incluidoEnAnalisis && r.importeFinal !== undefined);
  const importeTotal = universo.reduce((s, r) => s + r.importeFinal, 0);

  const familiasMap = new Map<string, ResultadoValidacion[]>();
  const materialesMap = new Map<string, ResultadoValidacion[]>();
  for (const r of universo) {
    if (!familiasMap.has(r.familia)) familiasMap.set(r.familia, []);
    familiasMap.get(r.familia)!.push(r);
    const key = `${r.familia}|||${r.material}`;
    if (!materialesMap.has(key)) materialesMap.set(key, []);
    materialesMap.get(key)!.push(r);
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
      diferenciaVsPromedioOtros: 0,
      porcentajeVsPromedioOtros: 0,
      posicion: 0,
    }));
    raw.sort((a, b) => b.importePromedio - a.importePromedio);
    const clientes = raw.map((c, index) => {
      const otros = raw.filter((x) => x.cliente !== c.cliente).map((x) => x.importePromedio);
      const ref = promedio(otros);
      const diferencia = c.importePromedio - ref;
      return { ...c, diferenciaVsPromedioOtros: otros.length ? diferencia : c.importePromedio - promedioGrupo, porcentajeVsPromedioOtros: (otros.length ? ref : promedioGrupo) ? diferencia / (otros.length ? ref : promedioGrupo) * 100 : 0, posicion: index + 1 };
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
      const pct = diff / ref * 100;
      if (pct >= 15) oportunidades.push({ tipo: "PRECIO_ALTO", cliente: c.cliente, razonSocial: c.razonSocial, familia: grupo.familia, material: grupo.material, importe: c.importePromedio, referencia: ref, diferencia: diff, porcentaje: pct, texto: `${c.razonSocial} paga ${pct.toFixed(1)}% por encima del promedio del resto de clientes para ${grupo.material}. Posible oportunidad comercial.` });
      if (pct <= -15) oportunidades.push({ tipo: "PRECIO_BAJO", cliente: c.cliente, razonSocial: c.razonSocial, familia: grupo.familia, material: grupo.material, importe: c.importePromedio, referencia: ref, diferencia: diff, porcentaje: pct, texto: `${c.razonSocial} paga ${Math.abs(pct).toFixed(1)}% por debajo del promedio del resto de clientes para ${grupo.material}. Posible oportunidad de revisión de precio.` });
    }
  }

  return {
    universo,
    totalRegistros: universo.length,
    clientes: new Set(universo.map((r) => r.razonSocial)).size,
    familias: new Set(universo.map((r) => r.familia)).size,
    materiales: new Set(universo.map((r) => r.material)).size,
    importeTotal,
    importePromedio: promedio(universo.map((r) => r.importeFinal)),
    gruposFamilia,
    gruposMaterial,
    oportunidades: oportunidades.sort((a, b) => Math.abs(b.porcentaje) - Math.abs(a.porcentaje)),
  };
}
