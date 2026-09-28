import { read, utils } from "xlsx";
import baseProductos from "../data/base_productos.json";
import baseReglas from "../data/base_reglas.json";

export type ProductoMaestro = {
  material: string;
  descripcion: string;
  unidad: string;
  texto_largo: string;
  activo: boolean;
};

export type ReglaMaestro = {
  cod_sap: string;
  razon_social: string;
  condicion_impositiva: string;
  activo: boolean;
};

export type Maestros = {
  productos: ProductoMaestro[];
  reglas: ReglaMaestro[];
  actualizadoEn?: string;
};

export const MAESTROS_STORAGE_KEY = "sap-precios-maestros-v2";

export function normalizar(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/\u0000/g, "").replace(/^\uFEFF/, "").trim().toUpperCase();
}

export function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/\u0000/g, "").replace(/^\uFEFF/, "").trim();
}

export function numero(valor: unknown): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

  let t = texto(valor).replace(/\s/g, "").replace(/[$€£]/g, "").replace(/\u00A0/g, "");
  if (!t) return 0;
  const negativo = /^-/.test(t);
  t = t.replace(/^-/, "").replace(/[^0-9.,]/g, "");
  if (!t) return 0;

  const tieneComa = t.includes(",");
  const tienePunto = t.includes(".");
  if (tieneComa && tienePunto) {
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) t = t.replace(/\./g, "").replace(/,/g, ".");
    else t = t.replace(/,/g, "");
  } else if (tieneComa) {
    t = t.replace(/,/g, ".");
  } else if (tienePunto) {
    const partes = t.split(".");
    if (partes.length > 2) t = partes.join("");
    else {
      const decimales = partes[1] || "";
      if (decimales.length === 3 && partes[0].length <= 3) t = partes.join("");
    }
  }

  const n = Number(t);
  return Number.isFinite(n) ? (negativo ? -n : n) : 0;
}

export function valorCampo(datos: Record<string, unknown>, nombres: string[], preferirNoVacio = true): string {
  const entries = Object.entries(datos);
  for (const nombre of nombres) {
    const buscado = normalizar(nombre);
    const candidatos = entries.filter(([clave]) => normalizar(clave) === buscado);
    if (!candidatos.length) continue;
    if (preferirNoVacio) {
      const lleno = candidatos.find(([, valor]) => texto(valor) !== "");
      if (lleno) return texto(lleno[1]);
    }
    return texto(candidatos[0][1]);
  }
  return "";
}

function productoInicial(p: any): ProductoMaestro {
  return {
    material: texto(p.material),
    descripcion: texto(p.descripcion),
    unidad: texto(p.unidad),
    texto_largo: texto(p.texto_largo),
    activo: p.activo !== false,
  };
}

function reglaInicial(r: any): ReglaMaestro {
  return {
    cod_sap: texto(r.cod_sap),
    razon_social: texto(r.razon_social),
    condicion_impositiva: normalizar(r.condicion_impositiva),
    activo: r.activo !== false,
  };
}

export const MAESTROS_INICIALES: Maestros = {
  productos: Array.isArray((baseProductos as any).productos)
    ? (baseProductos as any).productos.map(productoInicial)
    : [],
  reglas: Array.isArray((baseReglas as any).reglas)
    ? (baseReglas as any).reglas.map(reglaInicial)
    : [],
};

export function cargarMaestrosGuardados(): Maestros {
  if (typeof window === "undefined") return MAESTROS_INICIALES;
  try {
    const raw = window.localStorage.getItem(MAESTROS_STORAGE_KEY);
    if (!raw) return MAESTROS_INICIALES;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.productos) || !Array.isArray(parsed.reglas)) return MAESTROS_INICIALES;
    return {
      productos: parsed.productos.map(productoInicial),
      reglas: parsed.reglas.map(reglaInicial),
      actualizadoEn: parsed.actualizadoEn,
    };
  } catch {
    return MAESTROS_INICIALES;
  }
}

export function guardarMaestrosGuardados(maestros: Maestros): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MAESTROS_STORAGE_KEY,
    JSON.stringify({ ...maestros, actualizadoEn: new Date().toISOString() }),
  );
}

export function restaurarMaestrosIniciales(): Maestros {
  const copia: Maestros = {
    productos: MAESTROS_INICIALES.productos.map((p) => ({ ...p })),
    reglas: MAESTROS_INICIALES.reglas.map((r) => ({ ...r })),
  };
  guardarMaestrosGuardados(copia);
  return copia;
}

export function fusionarProductos(actuales: ProductoMaestro[], nuevos: ProductoMaestro[]) {
  const mapa = new Map(actuales.map((p) => [normalizar(p.material), { ...p }]));
  let agregados = 0;
  let actualizados = 0;
  let ignorados = 0;

  for (const item of nuevos) {
    const key = normalizar(item.material);
    if (!key) {
      ignorados++;
      continue;
    }
    const anterior = mapa.get(key);
    if (anterior) {
      mapa.set(key, { ...anterior, ...item, material: texto(item.material), activo: anterior.activo !== false });
      actualizados++;
    } else {
      mapa.set(key, { ...item, material: texto(item.material), activo: true });
      agregados++;
    }
  }

  return { registros: Array.from(mapa.values()).sort((a, b) => a.material.localeCompare(b.material, "es", { numeric: true })), agregados, actualizados, ignorados };
}

export function fusionarReglas(actuales: ReglaMaestro[], nuevas: ReglaMaestro[]) {
  // Una misma cuenta SAP puede aparecer más de una vez si la fuente trae
  // condiciones diferentes. Conservamos esa información para que el validador
  // pueda detectar una situación ambigua en lugar de ocultarla.
  const clave = (r: ReglaMaestro) => `${normalizar(r.cod_sap)}|||${normalizar(r.condicion_impositiva)}`;
  const mapa = new Map(actuales.map((r) => [clave(r), { ...r }]));
  let agregados = 0;
  let actualizados = 0;
  let ignorados = 0;

  for (const item of nuevas) {
    const key = clave(item);
    if (!normalizar(item.cod_sap)) {
      ignorados++;
      continue;
    }
    const anterior = mapa.get(key);
    if (anterior) {
      mapa.set(key, {
        ...anterior,
        ...item,
        cod_sap: texto(item.cod_sap),
        condicion_impositiva: normalizar(item.condicion_impositiva),
        activo: anterior.activo !== false,
      });
      actualizados++;
    } else {
      mapa.set(key, {
        ...item,
        cod_sap: texto(item.cod_sap),
        condicion_impositiva: normalizar(item.condicion_impositiva),
        activo: true,
      });
      agregados++;
    }
  }

  return {
    registros: Array.from(mapa.values()).sort((a, b) =>
      `${a.cod_sap}-${a.condicion_impositiva}`.localeCompare(
        `${b.cod_sap}-${b.condicion_impositiva}`,
        "es",
        { numeric: true },
      ),
    ),
    agregados,
    actualizados,
    ignorados,
  };
}

function filasExcel(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = read(buffer, { type: "array", raw: false });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  if (!hoja) throw new Error("El archivo no contiene una hoja.");
  const filas = utils.sheet_to_json(hoja, { defval: "", raw: false }) as Record<string, unknown>[];
  if (!filas.length) throw new Error("El Excel no contiene registros.");
  return filas;
}

export function leerMaterialesMaestroExcel(buffer: ArrayBuffer): ProductoMaestro[] {
  const filas = filasExcel(buffer);
  const resultado: ProductoMaestro[] = [];
  for (const fila of filas) {
    const material = valorCampo(fila, ["Material PROD", "Material", "Código material", "Codigo material"]);
    if (!material) continue;
    resultado.push({
      material: texto(material),
      descripcion: valorCampo(fila, ["Texto breve de material", "Descripción", "Descripcion"]),
      unidad: valorCampo(fila, ["Unidad medida base", "Unidad", "UM"]),
      texto_largo: valorCampo(fila, ["TEXTO LARGO", "Texto largo", "Texto Largo"]),
      activo: true,
    });
  }
  if (!resultado.length) throw new Error("No se encontraron materiales válidos en el Excel maestro.");
  return resultado;
}

export function leerCondicionesMaestroExcel(buffer: ArrayBuffer): ReglaMaestro[] {
  const filas = filasExcel(buffer);
  const resultado: ReglaMaestro[] = [];
  for (const fila of filas) {
    const cod = valorCampo(fila, ["COD SAP", "Cod SAP", "Código SAP", "Codigo SAP", "Cliente"]);
    if (!cod) continue;
    resultado.push({
      cod_sap: texto(cod),
      razon_social: valorCampo(fila, ["RAZÓN SOCIAL", "Razon Social", "Razón social", "Cliente"]),
      condicion_impositiva: normalizar(valorCampo(fila, ["CONDICIÓN IMPOSITIVA", "Condición impositiva", "Condicion impositiva", "Condición", "Condicion"])),
      activo: true,
    });
  }
  if (!resultado.length) throw new Error("No se encontraron clientes válidos en el Excel de condiciones.");
  return resultado;
}

export function productoPorMaterial(material: string, maestros: Maestros = MAESTROS_INICIALES): ProductoMaestro | null {
  const buscado = normalizar(material);
  return maestros.productos.find((p) => p.activo !== false && normalizar(p.material) === buscado) || null;
}

export function reglaCliente(cliente: string, maestros: Maestros = MAESTROS_INICIALES): ReglaMaestro | null {
  const buscado = normalizar(cliente);
  return maestros.reglas.find((r) => r.activo !== false && normalizar(r.cod_sap) === buscado) || null;
}

export function reglasCliente(cliente: string, maestros: Maestros = MAESTROS_INICIALES): ReglaMaestro[] {
  const buscado = normalizar(cliente);
  return maestros.reglas.filter((r) => r.activo !== false && normalizar(r.cod_sap) === buscado);
}

export function extraerFamilia(textoLargo: string): string {
  const t = texto(textoLargo);
  if (!t) return "";
  return texto(t.split(" - ")[0]);
}

export function extraerClasificacion(textoLargo: string): string {
  const t = texto(textoLargo);
  const partes = t.split(" - ").map((p) => p.trim()).filter(Boolean);
  return partes.slice(1).join(" - ");
}

export function enriquecerMaterial(material: string, maestros: Maestros = MAESTROS_INICIALES) {
  const p = productoPorMaterial(material, maestros);
  if (!p) return { encontrado: false, descripcion: "", unidad: "", textoLargo: "", familia: "", clasificacion: "" };
  const textoLargo = texto(p.texto_largo);
  return {
    encontrado: true,
    descripcion: texto(p.descripcion),
    unidad: texto(p.unidad),
    textoLargo,
    familia: extraerFamilia(textoLargo),
    clasificacion: extraerClasificacion(textoLargo),
  };
}
