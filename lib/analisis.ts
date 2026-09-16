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

export type ClasificacionPromedio =
  | "POR_ENCIMA"
  | "POR_DEBAJO"
  | "EN_PROMEDIO";

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
  promedioUniverso: number;
  diferenciaVsPromedio: number;
  porcentajeVsPromedio: number;
  vecesVsPromedio: number;
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

  // En el análisis por familia, importePromedio representa el TOTAL
  // que ese cliente concentra dentro de la familia.
  importePromedio: number;

  // Promedio de los totales de los clientes dentro de esa familia.
  promedioUniverso: number;
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

  // Se conserva por compatibilidad con la interfaz anterior.
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
  promedioSeleccionado: number;

  clientesSobrePromedio: number;
  clientesBajoPromedio: number;
  clientesEnPromedio: number;

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

function promedio(nums: number[]): number {
  return nums.length
    ? nums.reduce((a, b) => a + b, 0) / nums.length
    : 0;
}

function porcentajeVs(valor: number, referencia: number): number {
  return referencia ? ((valor - referencia) / referencia) * 100 : 0;
}

function clasificar(
  valor: number,
  referencia: number,
): ClasificacionPromedio {
  if (!referencia) return "EN_PROMEDIO";
  const pct = porcentajeVs(valor, referencia);
  if (Math.abs(pct) < 0.0001) return "EN_PROMEDIO";
  return pct > 0 ? "POR_ENCIMA" : "POR_DEBAJO";
}

function formatearImporte(n: number): string {
  return `$ ${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function incluye(texto: string, busqueda: string): boolean {
  return !busqueda || texto.toUpperCase().includes(busqueda.toUpperCase());
}

export function analizarResultados(
  resultados: ResultadoValidacion[],
): ResumenAnalisis {
  const totalFilas = resultados.length;
  const filasConPB00 = resultados.filter((r) => r.tienePB00).length;

  return {
    totalFilas,
    filasConPB00,
    filasSinPB00: totalFilas - filasConPB00,
    filasConObservaciones: resultados.filter(
      (r) => r.observaciones.length > 0,
    ).length,
    porcentajePB00: totalFilas
      ? (filasConPB00 / totalFilas) * 100
      : 0,
    resultados,
  };
}

export function filtrarResultados(
  resultados: ResultadoValidacion[],
  seleccion: SeleccionAnalisis,
): ResultadoValidacion[] {
  const clientes = new Set(seleccion.clientes);
  const materiales = new Set(seleccion.materiales);
  const familias = new Set(seleccion.familias);
  const condiciones = new Set(
    seleccion.condiciones.map((x) => x.toUpperCase()),
  );
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

    const condicion = (
      r.condicionAnalisis ||
      r.condicionExcel ||
      ""
    ).toUpperCase();

    return (
      (!clientes.size || clientes.has(r.razonSocial)) &&
      (!materiales.size || materiales.has(r.material)) &&
      (!familias.size || familias.has(r.familia)) &&
      (!condiciones.size || condiciones.has(condicion)) &&
      incluye(textoFila, q)
    );
  });
}

/**
 * Construye comparaciones donde cada entidad pesa una sola vez.
 *
 * CLIENTE:
 *   suma todos sus importes seleccionados y luego compara los totales.
 *
 * MATERIAL:
 *   suma todos los registros del mismo material por cliente y luego
 *   calcula el promedio entre clientes.
 *
 * FAMILIA:
 *   suma todos los materiales de la familia por cliente y luego
 *   calcula el promedio entre clientes.
 */
function construirComparacionesSeleccion(
  universo: ResultadoValidacion[],
  tipo: "CLIENTE" | "MATERIAL" | "FAMILIA",
): ComparacionSeleccion[] {
  const mapa = new Map<string, ResultadoValidacion[]>();

  for (const r of universo) {
    let clave = "";
    if (tipo === "CLIENTE") {
      clave = r.razonSocial || r.cliente || "SIN CLIENTE";
    } else if (tipo === "MATERIAL") {
      clave = r.material || "SIN MATERIAL";
    } else {
      clave = r.familia || "SIN FAMILIA";
    }

    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave)!.push(r);
  }

  const base = Array.from(mapa.entries()).map(([clave, rows]) => ({
    clave,
    descripcion:
      tipo === "MATERIAL"
        ? rows[0]?.descripcionMaterial || ""
        : clave,
    registros: rows.length,
    importeTotal: rows.reduce((s, r) => s + r.importeFinal, 0),
    importePromedio: rows.reduce((s, r) => s + r.importeFinal, 0),
  }));

  const referenciaPromedio = promedio(
    base.map((x) => x.importeTotal),
  );

  base.sort((a, b) => b.importeTotal - a.importeTotal);

  return base.map((x, index) => {
    const diferencia = x.importeTotal - referenciaPromedio;
    const porcentaje = porcentajeVs(
      x.importeTotal,
      referenciaPromedio,
    );
    const veces = referenciaPromedio
      ? x.importeTotal / referenciaPromedio
      : 0;

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
      clasificacion: clasificar(
        x.importeTotal,
        referenciaPromedio,
      ),
      posicion: index + 1,
    };
  });
}

function construirConclusion(
  gruposFamilia: ResultadoComercial["gruposFamilia"],
  gruposFamiliaCliente: ComparacionFamiliaCliente[],
  comparacionClientes: ComparacionSeleccion[],
  universo: ResultadoValidacion[],
  importeTotal: number,
  promedioSeleccionado: number,
): { ejecutiva: string; conclusiones: string[] } {
  if (!universo.length) {
    return {
      ejecutiva:
        "No hay registros válidos para realizar una conclusión comercial con el universo seleccionado.",
      conclusiones: [
        "El sistema no encontró registros habilitados para comparación de precios.",
      ],
    };
  }

  const conclusiones: string[] = [];

  conclusiones.push(
    `El universo seleccionado contiene ${universo.length.toLocaleString(
      "es-AR",
    )} registro(s) válidos, correspondientes a ${comparacionClientes.length} cliente(s), y representa un importe total de ${formatearImporte(
      importeTotal,
    )}. El promedio general por cliente es ${formatearImporte(
      promedioSeleccionado,
    )}.`,
  );

  if (gruposFamilia.length) {
    const mayor = gruposFamilia[0];
    const menor = gruposFamilia[gruposFamilia.length - 1];

    conclusiones.push(
      `La familia con mayor importe acumulado es ${mayor.familia}, con ${formatearImporte(
        mayor.importeTotal,
      )}. La familia con menor importe acumulado es ${menor.familia}, con ${formatearImporte(
        menor.importeTotal,
      )}.`,
    );
  }

  const comparables = gruposFamiliaCliente.filter(
    (x) => x.cliente !== "SIN CLIENTE" && x.promedioFamilia > 0,
  );

  const mayorVsPromedio = [...comparables].sort(
    (a, b) =>
      b.porcentajeVsPromedio - a.porcentajeVsPromedio,
  )[0];

  const menorVsPromedio = [...comparables].sort(
    (a, b) =>
      a.porcentajeVsPromedio - b.porcentajeVsPromedio,
  )[0];

  if (mayorVsPromedio) {
    conclusiones.push(
      `${mayorVsPromedio.cliente} concentra ${formatearImporte(
        mayorVsPromedio.importeTotal,
      )} en la familia ${mayorVsPromedio.familia}, un ${mayorVsPromedio.porcentajeVsPromedio.toFixed(
        1,
      )}% por encima del promedio de los clientes analizados para esa familia.`,
    );
  }

  if (menorVsPromedio) {
    conclusiones.push(
      `${menorVsPromedio.cliente} concentra ${formatearImporte(
        menorVsPromedio.importeTotal,
      )} en la familia ${menorVsPromedio.familia}, un ${Math.abs(
        menorVsPromedio.porcentajeVsPromedio,
      ).toFixed(
        1,
      )}% por debajo del promedio de los clientes analizados para esa familia.`,
    );
  }

  // Para cada cliente, mostramos dónde concentra más y menos importe.
  // Esto permite detectar rápidamente la distribución económica del cliente
  // entre las familias seleccionadas.
  const porCliente = new Map<string, ComparacionFamiliaCliente[]>();
  for (const row of comparables) {
    if (!porCliente.has(row.cliente)) porCliente.set(row.cliente, []);
    porCliente.get(row.cliente)!.push(row);
  }

  const clientesOrdenados = [...porCliente.entries()].sort(
    (a, b) =>
      (comparacionClientes.find((x) => x.clave === b[0])?.importeTotal || 0) -
      (comparacionClientes.find((x) => x.clave === a[0])?.importeTotal || 0),
  );

  for (const [cliente, rows] of clientesOrdenados.slice(0, 5)) {
    const mayor = [...rows].sort(
      (a, b) => b.importeTotal - a.importeTotal,
    )[0];
    const menor = [...rows].sort(
      (a, b) => a.importeTotal - b.importeTotal,
    )[0];

    if (mayor && menor && mayor.familia !== menor.familia) {
      conclusiones.push(
        `${cliente}: la mayor concentración de importe está en ${mayor.familia} (${formatearImporte(
          mayor.importeTotal,
        )}) y la menor en ${menor.familia} (${formatearImporte(
          menor.importeTotal,
        )}).`,
      );
    }
  }

  const ejecutiva =
    `El universo seleccionado contiene ${universo.length.toLocaleString(
      "es-AR",
    )} registro(s) válidos y ${comparacionClientes.length} cliente(s). El importe total analizado es ${formatearImporte(
      importeTotal,
    )}, con un promedio de ${formatearImporte(
      promedioSeleccionado,
    )} por cliente. El análisis principal se realiza por familia: primero se suman todos los materiales de cada cliente dentro de cada familia y luego se calcula el promedio de los clientes de esa familia.`;

  return { ejecutiva, conclusiones };
}

export function realizarAnalisis(
  resultados: ResultadoValidacion[],
): ResultadoComercial {
  const universo = resultados.filter(
    (r) =>
      r.incluidoEnAnalisis &&
      Number.isFinite(r.importeFinal),
  );

  const importeTotal = universo.reduce(
    (s, r) => s + r.importeFinal,
    0,
  );

  // Promedio general por cliente, no promedio por fila.
  const clientesMapGlobal = new Map<string, ResultadoValidacion[]>();
  for (const r of universo) {
    const cliente = r.razonSocial || r.cliente || "SIN CLIENTE";
    if (!clientesMapGlobal.has(cliente)) {
      clientesMapGlobal.set(cliente, []);
    }
    clientesMapGlobal.get(cliente)!.push(r);
  }

  const totalesClientes = [...clientesMapGlobal.values()].map(
    (rows) => rows.reduce((s, r) => s + r.importeFinal, 0),
  );
  const promedioSeleccionado = promedio(totalesClientes);

  const comparacionClientesSeleccionados =
    construirComparacionesSeleccion(universo, "CLIENTE");
  const comparacionMaterialesSeleccionados =
    construirComparacionesSeleccion(universo, "MATERIAL");
  const comparacionFamiliasSeleccionadas =
    construirComparacionesSeleccion(universo, "FAMILIA");

  // -----------------------------
  // 1) FAMILIAS
  // -----------------------------
  const familiasMap = new Map<string, ResultadoValidacion[]>();

  for (const r of universo) {
    const familia = r.familia || "SIN FAMILIA";
    if (!familiasMap.has(familia)) familiasMap.set(familia, []);
    familiasMap.get(familia)!.push(r);
  }

  const gruposFamilia = Array.from(familiasMap.entries())
    .map(([familia, rows]) => {
      const clientesFamilia = new Map<string, number>();

      for (const r of rows) {
        const cliente =
          r.razonSocial || r.cliente || "SIN CLIENTE";
        clientesFamilia.set(
          cliente,
          (clientesFamilia.get(cliente) || 0) + r.importeFinal,
        );
      }

      const totales = [...clientesFamilia.values()];

      return {
        familia,
        registros: rows.length,
        promedio: promedio(totales),
        minimo: totales.length ? Math.min(...totales) : 0,
        maximo: totales.length ? Math.max(...totales) : 0,
        importeTotal: rows.reduce(
          (s, r) => s + r.importeFinal,
          0,
        ),
      };
    })
    .sort((a, b) => b.importeTotal - a.importeTotal);

  // -----------------------------
  // 2) FAMILIA x CLIENTE
  // -----------------------------
  const gruposFamiliaCliente: ComparacionFamiliaCliente[] = [];

  for (const familia of gruposFamilia) {
    const rowsFamilia =
      familiasMap.get(familia.familia) || [];

    const clientesFamilia = new Map<
      string,
      ResultadoValidacion[]
    >();

    for (const r of rowsFamilia) {
      const cliente =
        r.razonSocial || r.cliente || "SIN CLIENTE";
      if (!clientesFamilia.has(cliente)) {
        clientesFamilia.set(cliente, []);
      }
      clientesFamilia.get(cliente)!.push(r);
    }

    // FUNDAMENTAL:
    // cada cliente se consolida primero por SUMA de sus materiales
    // dentro de la familia. Recién después se calcula el promedio.
    const clientesBase = Array.from(
      clientesFamilia.entries(),
    ).map(([cliente, rows]) => {
      const importeTotalCliente = rows.reduce(
        (s, r) => s + r.importeFinal,
        0,
      );

      return {
        cliente,
        importeTotal: importeTotalCliente,
        importePromedio: importeTotalCliente,
        registros: rows.length,
        materiales: new Set(
          rows.map((r) => r.material).filter(Boolean),
        ).size,
      };
    });

    const promedioFamilia = promedio(
      clientesBase.map((c) => c.importeTotal),
    );

    clientesBase.sort(
      (a, b) => b.importeTotal - a.importeTotal,
    );

    clientesBase.forEach((c, index) => {
      const diferencia =
        c.importeTotal - promedioFamilia;
      const porcentaje = porcentajeVs(
        c.importeTotal,
        promedioFamilia,
      );
      const veces = promedioFamilia
        ? c.importeTotal / promedioFamilia
        : 0;

      gruposFamiliaCliente.push({
        familia: familia.familia,
        cliente: c.cliente,
        registros: c.registros,
        materiales: c.materiales,
        importeTotal: c.importeTotal,
        importePromedio: c.importeTotal,
        promedioUniverso: promedioFamilia,
        promedioFamilia,
        diferenciaVsPromedio: diferencia,
        porcentajeVsPromedio: porcentaje,
        vecesVsPromedio: veces,
        referenciaPromedioSeleccionado: promedioFamilia,
        diferenciaVsPromedioSeleccionado: diferencia,
        porcentajeVsPromedioSeleccionado: porcentaje,
        vecesVsPromedioSeleccionado: veces,
        clasificacion: clasificar(
          c.importeTotal,
          promedioFamilia,
        ),
        posicion: index + 1,
        materialesComparables: c.materiales,
      });
    });
  }

  // -----------------------------
  // 3) MATERIAL x CLIENTE
  // -----------------------------
  const materialesMap = new Map<
    string,
    ResultadoValidacion[]
  >();

  for (const r of universo) {
    const familia = r.familia || "SIN FAMILIA";
    const material = r.material || "SIN MATERIAL";
    const key = `${familia}|||${material}`;

    if (!materialesMap.has(key)) materialesMap.set(key, []);
    materialesMap.get(key)!.push(r);
  }

  const gruposMaterial: ComparacionGrupo[] = Array.from(
    materialesMap.entries(),
  )
    .map(([key, rows]) => {
      const [familia, material] = key.split("|||");
      const clientesMap = new Map<
        string,
        ResultadoValidacion[]
      >();

      for (const r of rows) {
        const cliente =
          r.razonSocial || r.cliente || "SIN CLIENTE";
        if (!clientesMap.has(cliente)) {
          clientesMap.set(cliente, []);
        }
        clientesMap.get(cliente)!.push(r);
      }

      const raw = Array.from(clientesMap.entries()).map(
        ([cliente, clientRows]) => {
          const total = clientRows.reduce(
            (s, r) => s + r.importeFinal,
            0,
          );

          return {
            cliente,
            razonSocial: cliente,
            importeTotal: total,
            importePromedio: total,
            registros: clientRows.length,
            materiales: 1,
          };
        },
      );

      const promedioGrupo = promedio(
        raw.map((c) => c.importeTotal),
      );

      raw.sort(
        (a, b) => b.importeTotal - a.importeTotal,
      );

      const clientes: ComparacionCliente[] = raw.map(
        (c, index) => {
          const diferencia =
            c.importeTotal - promedioGrupo;
          const porcentaje = porcentajeVs(
            c.importeTotal,
            promedioGrupo,
          );
          const veces = promedioGrupo
            ? c.importeTotal / promedioGrupo
            : 0;
          const clasificacion = clasificar(
            c.importeTotal,
            promedioGrupo,
          );

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
        },
      );

      return {
        familia,
        material,
        descripcion: rows[0]?.descripcionMaterial || "",
        registros: rows.length,
        promedio: promedioGrupo,
        promedioSeleccionado: promedioGrupo,
        minimo: rows.length
          ? Math.min(...raw.map((x) => x.importeTotal))
          : 0,
        maximo: rows.length
          ? Math.max(...raw.map((x) => x.importeTotal))
          : 0,
        clientes,
        clientesSobrePromedio: clientes.filter(
          (c) => c.clasificacion === "POR_ENCIMA",
        ).length,
        clientesBajoPromedio: clientes.filter(
          (c) => c.clasificacion === "POR_DEBAJO",
        ).length,
        clientesEnPromedio: clientes.filter(
          (c) => c.clasificacion === "EN_PROMEDIO",
        ).length,
      };
    })
    .sort((a, b) => b.promedio - a.promedio);

  // -----------------------------
  // 4) SEÑALES COMERCIALES
  // -----------------------------
  // Se mantienen como detalle material x cliente.
  // No existe umbral: toda diferencia real contra el promedio se muestra.
  const oportunidades: ResultadoComercial["oportunidades"] = [];

  for (const grupo of gruposMaterial) {
    if (grupo.clientes.length < 2) continue;

    for (const c of grupo.clientes) {
      const ref = c.referenciaPromedioSeleccionado;
      if (!ref) continue;

      const pct = c.porcentajeVsPromedioSeleccionado;
      const diff = c.diferenciaVsPromedioSeleccionado;
      const veces = c.vecesVsPromedioSeleccionado;

      if (pct === 0) continue;

      oportunidades.push({
        tipo: pct > 0 ? "PRECIO_ALTO" : "PRECIO_BAJO",
        cliente: c.cliente,
        razonSocial: c.razonSocial,
        familia: grupo.familia,
        material: grupo.material,
        importe: c.importeTotal,
        referencia: ref,
        diferencia: diff,
        porcentaje: pct,
        veces,
        texto:
          pct > 0
            ? `${c.razonSocial} presenta un importe ${pct.toFixed(
                1,
              )}% superior al promedio de los clientes seleccionados para el mismo material.`
            : `${c.razonSocial} presenta un importe ${Math.abs(
                pct,
              ).toFixed(
                1,
              )}% inferior al promedio de los clientes seleccionados para el mismo material.`,
      });
    }
  }

  oportunidades.sort(
    (a, b) =>
      Math.abs(b.porcentaje) - Math.abs(a.porcentaje),
  );

  const promediosClientes = comparacionClientesSeleccionados.map(
    (x) => x.importeTotal,
  );
  const promedioGeneralClientes = promedio(
    promediosClientes,
  );

  const clientesSobrePromedio =
    promediosClientes.filter(
      (v) => v > promedioGeneralClientes,
    ).length;
  const clientesBajoPromedio =
    promediosClientes.filter(
      (v) => v < promedioGeneralClientes,
    ).length;
  const clientesEnPromedio =
    promediosClientes.filter(
      (v) => Math.abs(v - promedioGeneralClientes) < 0.0001,
    ).length;

  const conclusion = construirConclusion(
    gruposFamilia,
    gruposFamiliaCliente,
    comparacionClientesSeleccionados,
    universo,
    importeTotal,
    promedioSeleccionado,
  );

  return {
    universo,
    totalRegistros: universo.length,
    clientes: new Set(
      universo.map((r) => r.razonSocial || r.cliente),
    ).size,
    familias: new Set(
      universo.map((r) => r.familia || "SIN FAMILIA"),
    ).size,
    materiales: new Set(
      universo.map((r) => r.material || "SIN MATERIAL"),
    ).size,
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
