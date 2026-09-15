import baseProductos from "../data/base_productos.json";
import baseReglas from "../data/base_reglas.json";

export function normalizar(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/\u0000/g, "").replace(/^\uFEFF/, "").trim().toUpperCase();
}

export function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/\u0000/g, "").replace(/^\uFEFF/, "").trim();
}

/**
 * Convierte importes SAP/Argentina sin perder miles:
 * 2.383,37 -> 2383.37
 * 819,03   -> 819.03
 * 2383.37  -> 2383.37
 * También admite números nativos que ya vengan correctamente parseados.
 */
export function numero(valor: unknown): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

  let t = texto(valor)
    .replace(/\s/g, "")
    .replace(/[$€£]/g, "")
    .replace(/\u00A0/g, "");
  if (!t) return 0;

  const negativo = /^-/.test(t);
  t = t.replace(/^-/, "").replace(/[^0-9.,]/g, "");
  if (!t) return 0;

  const tieneComa = t.includes(",");
  const tienePunto = t.includes(".");

  if (tieneComa && tienePunto) {
    // Detecta el separador decimal por su última aparición.
    // SAP/Argentina: 25.000,32 -> 25000.32
    // Excel/US:       25,000.32 -> 25000.32
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) {
      t = t.replace(/\./g, "").replace(/,/g, ".");
    } else {
      t = t.replace(/,/g, "");
    }
  } else if (tieneComa) {
    // En SAP la coma es el separador decimal.
    t = t.replace(/,/g, ".");
  } else if (tienePunto) {
    const partes = t.split(".");
    if (partes.length > 2) {
      // 1.250.000 -> 1250000
      t = partes.join("");
    } else {
      const decimales = partes[1] || "";
      // En una exportación SAP, un único punto con 3 dígitos
      // normalmente representa miles: 25.000 -> 25000.
      // Con 1-2 dígitos lo tratamos como decimal para tolerar
      // archivos Excel que ya vengan con formato numérico textual.
      if (decimales.length === 3 && partes[0].length <= 3) t = partes.join("");
      else t = partes.join(".");
    }
  }

  const n = Number(t);
  if (!Number.isFinite(n)) return 0;
  return negativo ? -n : n;
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

const productos = Array.isArray((baseProductos as any).productos) ? (baseProductos as any).productos : [];
const reglas = Array.isArray((baseReglas as any).reglas) ? (baseReglas as any).reglas : [];

export function productoPorMaterial(material: string): any | null {
  const buscado = normalizar(material);
  return productos.find((p: any) => normalizar(p.material) === buscado) || null;
}

export function reglaCliente(cliente: string): any | null {
  const buscado = normalizar(cliente);
  return reglas.find((r: any) => normalizar(r.cod_sap) === buscado) || null;
}

export function reglasCliente(cliente: string): any[] {
  const buscado = normalizar(cliente);
  return reglas.filter((r: any) => normalizar(r.cod_sap) === buscado);
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

export function enriquecerMaterial(material: string) {
  const p = productoPorMaterial(material);
  if (!p) {
    return { encontrado: false, descripcion: "", unidad: "", textoLargo: "", familia: "", clasificacion: "" };
  }
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
