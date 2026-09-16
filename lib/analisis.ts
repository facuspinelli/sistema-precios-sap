import { ResultadoValidacion } from "./validador";

// Umbral para destacar una diferencia como señal comercial.
// El análisis siempre calcula la diferencia real contra el promedio,
// aunque sea menor al umbral.
export const UMBRAL_OPORTUNIDAD = 0;

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

export type ClasificacionPromedio = "POR_ENCIMA" | "POR_DEBAJO" | "EN_PROMEDIO";

export type ComparacionSeleccion = {
  tipo: "CLIENTE" | "MATERIAL" | "FAMILIA";
  clave: string;
  descripcion: string;
  registros: number;
  importeTotal: number;
  importePromedio: number;
  referenciaPromedio: number;
  diferencia: number;
  porcentaje: number;
  veces: number;
  clasificacion: ClasificacionPromedio;
  posicion: number;
};

export type ComparacionCliente = {
  cliente: string;
  razonSocial: string;
  importeTotal: number;
  importePromedio: number;
  registros: number;
  materiales: number;

  // Se conservan los nombres anteriores para no romper integraciones.
  // Desde esta versión representan el PROMEDIO DEL GRUPO SELECCIONADO.
  promedioUniverso: number;
  diferenciaVsPromedio: number;
  porcentajeVsPromedio: number;
  vecesVsPromedio: number;

  // Nuevos nombres explícitos para la lógica por promedio.
  referenciaPromedioSeleccionado: number;
  diferenciaVsPromedioSeleccionado: number;
  porcentajeVsPromedioSeleccionado: number;
  vecesVsPromedioSeleccionado: number;
  clasificacion: ClasificacionPromedio;
  posicion: number;
};

export type ComparacionGrupo = {
  familia: string;
  material: string;
  descripcion: string;
  registros: number;
  promedio: number;
  promedioSeleccionado: number;
  minimo: number;
  maximo: number;
  clientes: ComparacionCliente[];
  clientesSobrePromedio: number;
  clientesBajoPromedio: number;
  clientesEnPromedio: number;
};

export type ComparacionFamiliaCliente = {
  familia: string;
  cliente: string;
  registros: number;
  materiales: number;
  importeTotal: number;
  importePromedio: number;
  promedioUniverso: number;

  // Se conservan para compatibilidad y ahora representan el promedio de la familia.
  promedioFamilia: number;
  diferenciaVsPromedio: number;
  porcentajeVsPromedio: number;
  vecesVsPromedio: number;

  referenciaPromedioSeleccionado: number;
  diferenciaVsPromedioSeleccionado: number;
  porcentajeVsPromedioSeleccionado: number;
  vecesVsPromedioSeleccionado: number;
  clasificacion: ClasificacionPromedio;
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

  // Promedio general del universo seleccionado.
  promedioSeleccionado: number;

  clientesSobrePromedio: number;
  clientesBajoPromedio: number;
  clientesEnPromedio: number;

  // Comparaciones directas del universo seleccionado.
  // Permiten analizar, por ejemplo, 3 clientes entre sí o 3 materiales entre sí.
  comparacionClientesSeleccionados: ComparacionSeleccion[];
  comparacionMaterialesSeleccionados: ComparacionSeleccion[];
  comparacionFamiliasSeleccionadas: ComparacionSeleccion[];

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

export function filtrarResultados(
  resultados: ResultadoValidacion[],
  seleccion: SeleccionAnalisis
): ResultadoValidacion[] {
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

/** Diferencia real contra una referencia. Ej.: 15 vs 10 = +50%. */
function porcentajeVs(valor: number, referencia: number) {
  return referencia ? ((valor - referencia) / referencia) * 100 : 0;
}

function clasificar(valor: number, referencia: number): ClasificacionPromedio {
  if (!referencia) return "EN_PROMEDIO";
  const pct = porcentajeVs(valor, referencia);
  // Tolerancia mínima para evitar que diferencias por redondeo aparezcan como "arriba/abajo".
  if (Math.abs(pct) < 0.0001) return "EN_PROMEDIO";
  return pct > 0 ? "POR_ENCIMA" : "POR_DEBAJO";
}

function formatearImporte(n: number) {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function construirComparacionesSeleccion(
  universo: ResultadoValidacion[],
  tipo: "CLIENTE" | "MATERIAL" | "FAMILIA",
): ComparacionSeleccion[] {
  const mapa = new Map<string, ResultadoValidacion[]>();

  for (const r of universo) {
    let clave = "";
    if (tipo === "CLIENTE") clave = r.razonSocial || r.cliente || "SIN CLIENTE";
    else if (tipo === "MATERIAL") clave = r.material || "SIN MATERIAL";
    else clave = r.familia || "SIN FAMILIA";

    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave)!.push(r);
  }

  const base = Array.from(mapa.entries()).map(([clave, rows]) => ({
    clave,
    descripcion:
      tipo === "MATERIAL"
        ? (rows[0]?.descripcionMaterial || "")
        : clave,
    registros: rows.length,
    importeTotal: rows.reduce((s, r) => s + r.importeFinal, 0),
    importePromedio: promedio(rows.map((r) => r.importeFinal)),
  }));

  // Cada entidad pesa una vez en el promedio de comparación.
  const referenciaPromedio = promedio(base.map((x) => x.importePromedio));

  base.sort((a, b) => b.importePromedio - a.importePromedio);

  return base.map((x, index) => {
    const diferencia = referenciaPromedio ? x.importePromedio - referenciaPromedio : 0;
    const porcentaje = referenciaPromedio ? porcentajeVs(x.importePromedio, referenciaPromedio) : 0;
    const veces = referenciaPromedio ? x.importePromedio / referenciaPromedio : 0;

    return {
      tipo,
      clave: x.clave,
      descripcion: x.descripcion,
      registros: x.registros,
      importeTotal: x.importeTotal,
      importePromedio: x.importePromedio,
      referenciaPromedio,
      diferencia,
      porcentaje,
      veces,
      clasificacion: clasificar(x.importePromedio, referenciaPromedio),
      posicion: index + 1,
    };
  });
}

function construirConclusion(
  gruposFamilia: ResultadoComercial["gruposFamilia"],
  oportunidades: ResultadoComercial["oportunidades"],
  universo: ResultadoValidacion[],
  promedioSeleccionado: number,
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

  conclusiones.push(
    `El promedio del universo seleccionado es ${formatearImporte(promedioSeleccionado)}. Las diferencias de cada cliente o material se calculan contra el promedio correspondiente al grupo analizado, no contra el mínimo ni contra el máximo.`,
  );

  if (altas.length) {
    const o = altas[0];
    conclusiones.push(
      `${o.razonSocial} presenta un importe de ${formatearImporte(o.importe)}, un ${o.porcentaje.toFixed(1)}% por encima del promedio de los elementos seleccionados para la comparación. Es una señal para revisar la posición comercial.`,
    );
  }

  if (bajas.length) {
    const o = bajas[0];
    conclusiones.push(
      `${o.razonSocial} presenta un importe de ${formatearImporte(o.importe)}, un ${Math.abs(o.porcentaje).toFixed(1)}% por debajo del promedio de los elementos seleccionados. Es una señal para revisar si existe margen de adecuación comercial.`,
    );
  }

  if (familiaMayor) {
    conclusiones.push(
      `La familia ${familiaMayor.familia} concentra el mayor importe dentro del universo analizado, con ${formatearImporte(familiaMayor.importeTotal)}.`,
    );
  }

  if (!oportunidades.length) {
    conclusiones.push(
      `No se detectaron diferencias que superen el umbral del ±${UMBRAL_OPORTUNIDAD}% en las comparaciones disponibles. El promedio igualmente se calculó y las diferencias reales quedan disponibles en el detalle.`,
    );
  }

  const ejecutiva =
    `El universo seleccionado contiene ${universo.length.toLocaleString("es-AR")} registro(s) válidos y tiene un promedio de ${formatearImporte(promedioSeleccionado)}. Se detectaron ${altas.length} señal(es) por encima y ${bajas.length} señal(es) por debajo del umbral del ±${UMBRAL_OPORTUNIDAD}%. El promedio funciona como referencia del universo/grupo seleccionado y no modifica los datos originales.`;

  return { ejecutiva, conclusiones };
}

export function realizarAnalisis(resultados: ResultadoValidacion[]): ResultadoComercial {
  // El análisis utiliza únicamente el universo que la pantalla ya habilitó para analizar.
  // Las líneas con ZPR incorrecta, material inexistente u otra regla de exclusión no deben contaminarlo.
  const universo = resultados.filter(
    (r) => r.incluidoEnAnalisis && Number.isFinite(r.importeFinal),
  );

  const importeTotal = universo.reduce((s, r) => s + r.importeFinal, 0);
  const promedioSeleccionado = promedio(universo.map((r) => r.importeFinal));

  // Comparaciones directas del universo seleccionado.
  // Si quedaron 3 clientes filtrados, se calcula el promedio de esos 3 clientes.
  // Si quedaron 3 materiales filtrados, se calcula el promedio de esos 3 materiales.
  const comparacionClientesSeleccionados = construirComparacionesSeleccion(universo, "CLIENTE");
  const comparacionMaterialesSeleccionados = construirComparacionesSeleccion(universo, "MATERIAL");
  const comparacionFamiliasSeleccionadas = construirComparacionesSeleccion(universo, "FAMILIA");

  // -----------------------------
  // 1) Agrupación por familia
  // -----------------------------
  const familiasMap = new Map<string, ResultadoValidacion[]>();
  for (const r of universo) {
    const familia = r.familia || "SIN FAMILIA";
    if (!familiasMap.has(familia)) familiasMap.set(familia, []);
    familiasMap.get(familia)!.push(r);
  }

  const gruposFamilia = Array.from(familiasMap.entries())
    .map(([familia, rows]) => ({
      familia,
      registros: rows.length,
      promedio: promedio(rows.map((r) => r.importeFinal)),
      minimo: Math.min(...rows.map((r) => r.importeFinal)),
      maximo: Math.max(...rows.map((r) => r.importeFinal)),
      importeTotal: rows.reduce((s, r) => s + r.importeFinal, 0),
    }))
    .sort((a, b) => b.importeTotal - a.importeTotal);

  // -----------------------------
  // 2) Agrupación por material
  // -----------------------------
  const materialesMap = new Map<string, ResultadoValidacion[]>();
  for (const r of universo) {
    const familia = r.familia || "SIN FAMILIA";
    const materialKey = `${familia}|||${r.material}`;
    if (!materialesMap.has(materialKey)) materialesMap.set(materialKey, []);
    materialesMap.get(materialKey)!.push(r);
  }

  const gruposMaterial: ComparacionGrupo[] = Array.from(materialesMap.entries())
    .map(([key, rows]) => {
      const [familia, material] = key.split("|||");

      // Un cliente pesa una sola vez en el promedio del material.
      // Si tiene más de un registro para el mismo material, primero promediamos sus registros.
      const clientesMap = new Map<string, ResultadoValidacion[]>();
      for (const r of rows) {
        const cliente = r.razonSocial || r.cliente || "SIN CLIENTE";
        if (!clientesMap.has(cliente)) clientesMap.set(cliente, []);
        clientesMap.get(cliente)!.push(r);
      }

      const raw = Array.from(clientesMap.entries()).map(([cliente, cr]) => ({
        cliente,
        razonSocial: cliente,
        importeTotal: cr.reduce((s, r) => s + r.importeFinal, 0),
        importePromedio: promedio(cr.map((r) => r.importeFinal)),
        registros: cr.length,
        materiales: new Set(cr.map((r) => r.material)).size,
      }));

      const promedioGrupo = promedio(raw.map((c) => c.importePromedio));

      raw.sort((a, b) => b.importePromedio - a.importePromedio);
      const clientes: ComparacionCliente[] = raw.map((c, index) => {
        const diferencia = promedioGrupo ? c.importePromedio - promedioGrupo : 0;
        const porcentaje = promedioGrupo ? porcentajeVs(c.importePromedio, promedioGrupo) : 0;
        const veces = promedioGrupo ? c.importePromedio / promedioGrupo : 0;
        const clasificacion = clasificar(c.importePromedio, promedioGrupo);

        return {
          ...c,
          promedioUniverso: promedioGrupo,
          diferenciaVsPromedio: diferencia,
          porcentajeVsPromedio: porcentaje,
          vecesVsPromedio: veces,
          referenciaPromedioSeleccionado: promedioGrupo,
          diferenciaVsPromedioSeleccionado: diferencia,
          porcentajeVsPromedioSeleccionado: porcentaje,
          vecesVsPromedioSeleccionado: veces,
          clasificacion,
          posicion: index + 1,
        };
      });

      return {
        familia,
        material,
        descripcion: rows[0]?.descripcionMaterial || "",
        registros: rows.length,
        promedio: promedioGrupo,
        promedioSeleccionado: promedioGrupo,
        minimo: Math.min(...rows.map((r) => r.importeFinal)),
        maximo: Math.max(...rows.map((r) => r.importeFinal)),
        clientes,
        clientesSobrePromedio: clientes.filter((c) => c.clasificacion === "POR_ENCIMA").length,
        clientesBajoPromedio: clientes.filter((c) => c.clasificacion === "POR_DEBAJO").length,
        clientesEnPromedio: clientes.filter((c) => c.clasificacion === "EN_PROMEDIO").length,
      };
    })
    .sort((a, b) => b.promedio - a.promedio);

  // -----------------------------
  // 3) Comparación familia x cliente
  // -----------------------------
  // En una familia, cada cliente pesa una vez. El promedio de familia es el promedio
  // de los promedios de sus clientes, evitando que un cliente con muchas líneas domine la referencia.
  const gruposFamiliaCliente: ComparacionFamiliaCliente[] = [];

  for (const familia of gruposFamilia) {
    const baseRows = universo.filter((r) => (r.familia || "SIN FAMILIA") === familia.familia);
    const clientesMap = new Map<string, ResultadoValidacion[]>();

    for (const r of baseRows) {
      const cliente = r.razonSocial || r.cliente || "SIN CLIENTE";
      if (!clientesMap.has(cliente)) clientesMap.set(cliente, []);
      clientesMap.get(cliente)!.push(r);
    }

    const clientesBase = Array.from(clientesMap.entries()).map(([cliente, rows]) => ({
      cliente,
      importeTotal: rows.reduce((s, r) => s + r.importeFinal, 0),
      importePromedio: promedio(rows.map((r) => r.importeFinal)),
      registros: rows.length,
      materiales: new Set(rows.map((r) => r.material)).size,
    }));

    const promedioFamilia = promedio(clientesBase.map((c) => c.importePromedio));

    clientesBase.sort((a, b) => b.importePromedio - a.importePromedio);

    clientesBase.forEach((c, index) => {
      const diferencia = promedioFamilia ? c.importePromedio - promedioFamilia : 0;
      const porcentaje = promedioFamilia ? porcentajeVs(c.importePromedio, promedioFamilia) : 0;

      gruposFamiliaCliente.push({
  familia: familia.familia,
  cliente: c.cliente,
  registros: c.registros,
  materiales: c.materiales,
  importeTotal: c.importeTotal,
  importePromedio: c.importePromedio,
  promedioUniverso: promedioFamilia,
  promedioFamilia: promedioFamilia,
  diferenciaVsPromedio: diferencia,
  porcentajeVsPromedio: porcentaje,
  vecesVsPromedio: promedioFamilia ? c.importePromedio / promedioFamilia : 0,
  referenciaPromedioSeleccionado: promedioFamilia,
  diferenciaVsPromedioSeleccionado: diferencia,
  porcentajeVsPromedioSeleccionado: porcentaje,
  vecesVsPromedioSeleccionado: promedioFamilia ? c.importePromedio / promedioFamilia : 0,
  clasificacion: clasificar(c.importePromedio, promedioFamilia),
  posicion: index + 1,
  // Se conserva el campo por compatibilidad. La referencia de familia no depende de
  // materiales compartidos en esta nueva lógica.
  materialesComparables: c.materiales,
});
    });
  }

  gruposFamiliaCliente.sort(
    (a, b) => a.familia.localeCompare(b.familia) || b.importePromedio - a.importePromedio,
  );

  // -----------------------------
  // 4) Oportunidades
  // -----------------------------
  // Las oportunidades se generan contra el promedio del grupo de comparación.
  // No se usa mínimo/máximo como referencia.
  const oportunidades: ResultadoComercial["oportunidades"] = [];

  for (const grupo of gruposMaterial) {
    // Con un solo cliente no existe comparación comercial.
    if (grupo.clientes.length < 2) continue;

    for (const c of grupo.clientes) {
      const ref = c.referenciaPromedioSeleccionado;
      if (!ref) continue;

      const pct = c.porcentajeVsPromedioSeleccionado;
      const diff = c.diferenciaVsPromedioSeleccionado;
      const veces = c.vecesVsPromedioSeleccionado;

      if (pct > 0) {
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
          texto: `${c.razonSocial} presenta un importe ${pct.toFixed(1)}% superior al promedio de los clientes seleccionados para el mismo material.`,
        });
      } else if (pct < 0) {
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
          texto: `${c.razonSocial} presenta un importe ${Math.abs(pct).toFixed(1)}% inferior al promedio de los clientes seleccionados para el mismo material.`,
        });
      }
    }
  }

  oportunidades.sort((a, b) => Math.abs(b.porcentaje) - Math.abs(a.porcentaje));

  // Conteo general por cliente contra el promedio general del universo.
  // Se usa el promedio de cada cliente para evitar que un cliente con muchas líneas pese más.
  const clientesGlobalMap = new Map<string, number[]>();
  for (const r of universo) {
    const cliente = r.razonSocial || r.cliente || "SIN CLIENTE";
    if (!clientesGlobalMap.has(cliente)) clientesGlobalMap.set(cliente, []);
    clientesGlobalMap.get(cliente)!.push(r.importeFinal);
  }
  const promediosClientes = Array.from(clientesGlobalMap.values()).map((values) => promedio(values));
  const promedioGeneralClientes = promedio(promediosClientes);
  const clientesSobrePromedio = promediosClientes.filter((v) => v > promedioGeneralClientes).length;
  const clientesBajoPromedio = promediosClientes.filter((v) => v < promedioGeneralClientes).length;
  const clientesEnPromedio = promediosClientes.filter((v) => v === promedioGeneralClientes).length;

  const conclusion = construirConclusion(
    gruposFamilia,
    oportunidades,
    universo,
    promedioSeleccionado,
  );

  return {
    universo,
    totalRegistros: universo.length,
    clientes: new Set(universo.map((r) => r.razonSocial)).size,
    familias: new Set(universo.map((r) => r.familia)).size,
    materiales: new Set(universo.map((r) => r.material)).size,
    importeTotal,
    importePromedio: promedioSeleccionado,
    promedioSeleccionado,
    clientesSobrePromedio,
    clientesBajoPromedio,
    clientesEnPromedio,
    comparacionClientesSeleccionados,
    comparacionMaterialesSeleccionados,
    comparacionFamiliasSeleccionadas,
    gruposFamilia,
    gruposFamiliaCliente,
    gruposMaterial,
    oportunidades,
    conclusionEjecutiva: conclusion.ejecutiva,
    conclusiones: conclusion.conclusiones,
  };
}
