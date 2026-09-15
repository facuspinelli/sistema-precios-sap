import baseProductos from "../data/base_productos.json";
import baseReglas from "../data/base_reglas.json";

export function normalizar(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/\u0000/g, "").trim().toUpperCase();
}

export function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/\u0000/g, "").trim();
}

export function numero(valor: unknown): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  let t = String(valor).trim().replace(/\s/g, "");
  if (t.includes(".") && t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
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

export function productoPorMaterial(material: string): any | null {
  const productos = Array.isArray((baseProductos as any).productos) ? (baseProductos as any).productos : [];
  return productos.find((p: any) => normalizar(p.material) === normalizar(material)) || null;
}

export function reglaCliente(cliente: string): any | null {
  const reglas = Array.isArray((baseReglas as any).reglas) ? (baseReglas as any).reglas : [];
  return reglas.find((r: any) => normalizar(r.cod_sap) === normalizar(cliente)) || null;
}

export function reglasCliente(cliente: string): any[] {
  const reglas = Array.isArray((baseReglas as any).reglas) ? (baseReglas as any).reglas : [];
  return reglas.filter((r: any) => normalizar(r.cod_sap) === normalizar(cliente));
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
    return {
      encontrado: false,
      descripcion: "",
      unidad: "",
      textoLargo: "",
      familia: "",
      clasificacion: "",
    };
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
