"use client";

import { useEffect, useMemo, useState } from "react";
import { utils, writeFile } from "xlsx";
import { leerExcel } from "../lib/excel";
import { validarExcel, ResultadoValidacion } from "../lib/validador";
import { filtrarResultados, realizarAnalisis, ResultadoComercial, SeleccionAnalisis } from "../lib/analisis";
import {
  Maestros,
  ProductoMaestro,
  ReglaMaestro,
  cargarMaestrosGuardados,
  guardarMaestrosGuardados,
  fusionarProductos,
  fusionarReglas,
  leerMaterialesMaestroExcel,
  leerCondicionesMaestroExcel,
  restaurarMaestrosIniciales,
  MAESTROS_INICIALES,
} from "../lib/maestros";

type Vista = "inicio" | "cargar" | "maestros";

const money = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));

export default function Home() {
  const [vista, setVista] = useState<Vista>("inicio");
  const [archivo, setArchivo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [generandoWord, setGenerandoWord] = useState(false);
  const [error, setError] = useState("");
  const [resultados, setResultados] = useState<ResultadoValidacion[]>([]);
  const [detalle, setDetalle] = useState<ResultadoValidacion | null>(null);
  const [analisis, setAnalisis] = useState<ResultadoComercial | null>(null);
  const [maestros, setMaestros] = useState<Maestros>(MAESTROS_INICIALES);
  const [filasOriginales, setFilasOriginales] = useState<Record<string, unknown>[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState<string[]>([]);
  const [materiales, setMateriales] = useState<string[]>([]);
  const [familias, setFamilias] = useState<string[]>([]);
  const [condiciones, setCondiciones] = useState<string[]>([]);

  useEffect(() => {
    setMaestros(cargarMaestrosGuardados());
  }, []);

  useEffect(() => {
    if (!filasOriginales.length) return;
    try {
      setResultados(validarExcel(filasOriginales, maestros));
      setAnalisis(null);
    } catch (err) {
      console.error(err);
    }
  }, [maestros, filasOriginales]);

  async function procesarArchivo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setArchivo(file.name);
    setCargando(true);
    setError("");
    setAnalisis(null);
    setBusqueda("");
    setClientes([]);
    setMateriales([]);
    setFamilias([]);
    setCondiciones([]);
    try {
      const buffer = await file.arrayBuffer();
      const filas = leerExcel(buffer);
      if (!filas.length) throw new Error("El Excel no contiene registros.");
      setFilasOriginales(filas);
      const validados = validarExcel(filas, maestros);
      setResultados(validados);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo procesar el Excel.");
      setResultados([]);
      setFilasOriginales([]);
    } finally {
      setCargando(false);
    }
  }

  function limpiarFiltros() {
    setBusqueda("");
    setClientes([]);
    setMateriales([]);
    setFamilias([]);
    setCondiciones([]);
    setAnalisis(null);
  }

  const clientesDisponibles = useMemo(() => unique(resultados.map(r => r.razonSocial).filter(Boolean)), [resultados]);
  const materialesDisponibles = useMemo(() => unique(resultados.map(r => r.material).filter(Boolean)), [resultados]);
  const familiasDisponibles = useMemo(() => unique(resultados.map(r => r.familia).filter(Boolean)), [resultados]);
  const condicionesDisponibles = useMemo(() => unique(resultados.map(r => r.condicionEsperada || r.condicionExcel).filter(Boolean)), [resultados]);

  const seleccion: SeleccionAnalisis = { clientes, materiales, familias, condiciones, busqueda };
  const resultadosFiltrados = useMemo(() => filtrarResultados(resultados, seleccion), [resultados, clientes, materiales, familias, condiciones, busqueda]);

  const estadisticas = useMemo(() => ({
    ok: resultadosFiltrados.filter(r => r.estado === "OK").length,
    alertas: resultadosFiltrados.filter(r => r.estado === "ALERTA").length,
    errores: resultadosFiltrados.filter(r => r.estado === "ERROR").length,
    validos: resultadosFiltrados.filter(r => r.incluidoEnAnalisis).length,
    importe: resultadosFiltrados.filter(r => r.incluidoEnAnalisis).reduce((s, r) => s + r.importeFinal, 0),
    zpr0: resultadosFiltrados.filter(r => r.condicionAnalisis === "ZPR0").length,
    zpr2: resultadosFiltrados.filter(r => r.condicionAnalisis === "ZPR2").length,
  }), [resultadosFiltrados]);

  function ejecutarAnalisis() {
    if (!resultadosFiltrados.length) return;
    setAnalisis(realizarAnalisis(resultadosFiltrados));
    setTimeout(() => document.getElementById("analisis-comercial")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function exportarExcel() {
    if (!resultadosFiltrados.length) return;
    const datos = resultadosFiltrados.map(r => ({
      Fila: r.fila,
      Cliente: r.cliente,
      "Razón social": r.razonSocial,
      Material: r.material,
      Familia: r.familia,
      "Descripción material": r.descripcionMaterial,
      "Texto largo": r.textoLargoMaterial,
      Clasificación: r.clasificacionMaterial,
      "Condición Excel": r.condicionExcel,
      "Condición correcta según base": r.condicionEsperada,
      "Condición utilizada análisis": r.condicionAnalisis,
      "Condiciones encontradas en Excel para cliente": r.condicionesExcelCliente.join(" / "),
      "Incluido en análisis": r.incluidoEnAnalisis ? "SI" : "NO",
      Importe: r.importe,
      PB00: r.importePB00,
      "Importe final": r.importeFinal,
      Moneda: r.moneda,
      Cantidad: r.cantidad,
      Por: r.por,
      UM: r.unidadMedida,
      Estado: r.estado,
      Observaciones: r.observaciones.join(" | "),
    }));
    const hoja = utils.json_to_sheet(datos);
    const libro = utils.book_new();
    utils.book_append_sheet(libro, hoja, "Resultados");
    writeFile(libro, "analisis-precios-sap.xlsx");
  }

  async function exportarWord() {
    if (!analisis) return;
    setGenerandoWord(true);
    try {
      const { generarInformeWord: generarInformeWordDoc, descargarBlob } = await import("../lib/reporte");
      const blob = await generarInformeWordDoc(analisis, seleccion, archivo);
      descargarBlob(blob, `Informe_Analisis_Comercial_${fechaArchivo()}.docx`);
    } catch (err) {
      console.error(err);
      setError("No se pudo generar el informe Word. Probá nuevamente.");
    } finally {
      setGenerandoWord(false);
    }
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-addoc.png" alt="ADDOC" />
          <div className="brandTitle">Sistema de Precios<span>SAP</span></div>
        </div>
        <nav className="menu">
          <button className={`menuItem ${vista === "inicio" ? "active" : ""}`} onClick={() => setVista("inicio")}><span>⌂</span> Inicio</button>
          <button className={`menuItem ${vista === "cargar" ? "active" : ""}`} onClick={() => setVista("cargar")}><span>↑</span> Cargar Excel</button>
          <button className={`menuItem ${vista === "maestros" ? "active" : ""}`} onClick={() => setVista("maestros")}><span>▣</span> Conocimiento maestro</button>
          <div className="menuDisabled"><span>♟</span> Clientes <small>Dentro de Maestros</small></div>
          <div className="menuDisabled"><span>◇</span> Histórico <small>Próximamente</small></div>
        </nav>
        <div className="sidebarStatus"><i /> Sistema operativo</div>
      </aside>

      <section className="content">
        <header className="topHeader">
          <div><div className="eyebrow">GESTIÓN Y CONTROL</div><h1>{vista === "inicio" ? "Dashboard" : vista === "maestros" ? "Conocimiento maestro" : "Cargar y analizar"}</h1><p>{vista === "inicio" ? "Control centralizado de precios, condiciones y materiales SAP." : vista === "maestros" ? "Administrá los materiales SAP y las condiciones ZPR0 / ZPR2 que utiliza el sistema." : "Procesá un archivo SAP y validalo contra las bases maestras."}</p></div>
          <button className="primaryButton" onClick={() => setVista(vista === "maestros" ? "cargar" : "cargar")}>↑ Cargar Excel</button>
        </header>

        {vista === "inicio" ? (
          <Dashboard resultados={resultados} onCargar={() => setVista("cargar")} onMaestros={() => setVista("maestros")} maestros={maestros} />
        ) : vista === "maestros" ? (
          <MaestrosView maestros={maestros} onChange={(m) => { setMaestros(m); guardarMaestrosGuardados(m); }} />
        ) : (
          <CargaExcel
            archivo={archivo}
            cargando={cargando}
            generandoWord={generandoWord}
            error={error}
            resultados={resultados}
            resultadosFiltrados={resultadosFiltrados}
            estadisticas={estadisticas}
            clientes={clientes}
            materiales={materiales}
            familias={familias}
            condiciones={condiciones}
            busqueda={busqueda}
            clientesDisponibles={clientesDisponibles}
            materialesDisponibles={materialesDisponibles}
            familiasDisponibles={familiasDisponibles}
            condicionesDisponibles={condicionesDisponibles}
            analisis={analisis}
            detalle={detalle}
            setClientes={setClientes}
            setMateriales={setMateriales}
            setFamilias={setFamilias}
            setCondiciones={setCondiciones}
            setBusqueda={setBusqueda}
            setDetalle={setDetalle}
            onUpload={procesarArchivo}
            onClear={limpiarFiltros}
            onAnalisis={ejecutarAnalisis}
            onExportarExcel={exportarExcel}
            onExportarWord={exportarWord}
          />
        )}
      </section>
    </main>
  );
}


function MaestrosView({ maestros, onChange }: { maestros: Maestros; onChange: (m: Maestros) => void }) {
  const [tab, setTab] = useState<"materiales" | "zpr">("materiales");
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<"nuevoMaterial" | "nuevoZpr" | "editarMaterial" | "editarZpr" | null>(null);
  const [editMaterial, setEditMaterial] = useState<ProductoMaestro | null>(null);
  const [editZpr, setEditZpr] = useState<ReglaMaestro | null>(null);
  const [mensaje, setMensaje] = useState("");

  const materiales = useMemo(() => maestros.productos.filter(p => {
    const q = busqueda.trim().toUpperCase();
    return !q || [p.material, p.descripcion, p.texto_largo, p.unidad].join(" ").toUpperCase().includes(q);
  }), [maestros.productos, busqueda]);
  const reglas = useMemo(() => maestros.reglas.filter(r => {
    const q = busqueda.trim().toUpperCase();
    return !q || [r.cod_sap, r.razon_social, r.condicion_impositiva].join(" ").toUpperCase().includes(q);
  }), [maestros.reglas, busqueda]);

  function avisar(texto: string) {
    setMensaje(texto);
    setTimeout(() => setMensaje(""), 4500);
  }

  async function importarMateriales(file: File) {
    try {
      const nuevos = leerMaterialesMaestroExcel(await file.arrayBuffer());
      const resultado = fusionarProductos(maestros.productos, nuevos);
      const siguiente = { ...maestros, productos: resultado.registros };
      onChange(siguiente);
      avisar(`Materiales actualizados: ${resultado.actualizados} · nuevos: ${resultado.agregados} · ignorados: ${resultado.ignorados}.`);
    } catch (err) {
      avisar(err instanceof Error ? err.message : "No se pudo importar el maestro de materiales.");
    }
  }

  async function importarZpr(file: File) {
    try {
      const nuevas = leerCondicionesMaestroExcel(await file.arrayBuffer());
      const resultado = fusionarReglas(maestros.reglas, nuevas);
      const siguiente = { ...maestros, reglas: resultado.registros };
      onChange(siguiente);
      avisar(`Condiciones actualizadas: ${resultado.actualizados} · nuevas: ${resultado.agregados} · ignoradas: ${resultado.ignorados}.`);
    } catch (err) {
      avisar(err instanceof Error ? err.message : "No se pudo importar el maestro de condiciones.");
    }
  }

  function guardarMaterial(p: ProductoMaestro) {
    const material = p.material.trim();
    if (!material) return avisar("El material es obligatorio.");
    const existe = maestros.productos.some(x => x.material.toUpperCase() === material.toUpperCase() && x !== editMaterial);
    if (existe) return avisar("Ese material ya existe.");
    const lista = editMaterial
      ? maestros.productos.map(x => x === editMaterial ? { ...p, activo: p.activo !== false } : x)
      : [...maestros.productos, { ...p, activo: true }];
    onChange({ ...maestros, productos: lista.sort((a,b) => a.material.localeCompare(b.material, "es", { numeric: true })) });
    setModal(null); setEditMaterial(null); avisar(editMaterial ? "Material actualizado." : "Material agregado al maestro.");
  }

  function guardarZpr(r: ReglaMaestro) {
    const cod = r.cod_sap.trim();
    if (!cod || !r.condicion_impositiva) return avisar("Código SAP y condición son obligatorios.");
    const condicion = r.condicion_impositiva.toUpperCase();
    const existe = maestros.reglas.some(x => x.cod_sap.toUpperCase() === cod.toUpperCase() && x.condicion_impositiva.toUpperCase() === condicion && x !== editZpr);
    if (existe) return avisar("Ese cliente ya tiene registrada esa condición.");
    const lista = editZpr
      ? maestros.reglas.map(x => x === editZpr ? { ...r, condicion_impositiva: r.condicion_impositiva.toUpperCase(), activo: r.activo !== false } : x)
      : [...maestros.reglas, { ...r, condicion_impositiva: r.condicion_impositiva.toUpperCase(), activo: true }];
    onChange({ ...maestros, reglas: lista.sort((a,b) => a.cod_sap.localeCompare(b.cod_sap, "es", { numeric: true })) });
    setModal(null); setEditZpr(null); avisar(editZpr ? "Condición actualizada." : "Cliente / condición agregado.");
  }

  function restaurar() {
    if (!window.confirm("¿Restaurar los maestros originales de la V1? Se perderán los cambios locales de esta versión.")) return;
    onChange(restaurarMaestrosIniciales());
    avisar("Maestros restaurados a la versión inicial.");
  }

  return <section className="mastersPanel">
    <div className="mastersHero">
      <div><div className="heroTag">CONOCIMIENTO MAESTRO</div><h2>Materiales y condiciones que utiliza el sistema</h2><p>Estos maestros reemplazan la necesidad de modificar el código cuando SAP incorpora nuevos materiales o cambia una condición.</p></div>
      <div className="masterStats"><div><strong>{maestros.productos.length.toLocaleString("es-AR")}</strong><span>materiales</span></div><div><strong>{maestros.reglas.length.toLocaleString("es-AR")}</strong><span>clientes / ZPR</span></div></div>
    </div>
    {mensaje && <div className="masterMessage">{mensaje}</div>}
    <div className="masterTabs"><button className={tab === "materiales" ? "masterTab active" : "masterTab"} onClick={() => {setTab("materiales"); setBusqueda("")}}>Materiales SAP</button><button className={tab === "zpr" ? "masterTab active" : "masterTab"} onClick={() => {setTab("zpr"); setBusqueda("")}}>ZPR0 / ZPR2</button></div>
    <div className="masterToolbar">
      <input className="searchBox" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder={tab === "materiales" ? "Buscar por material, descripción o familia..." : "Buscar por código, razón social o condición..."} />
      <label className="masterImportButton">Actualizar desde Excel<input type="file" accept=".xlsx,.xls" onChange={e => { const f=e.target.files?.[0]; if(f && tab === "materiales") importarMateriales(f); if(f && tab === "zpr") importarZpr(f); e.currentTarget.value=""; }} /></label>
      <button className="primaryButton smallButton" onClick={() => { if(tab === "materiales") {setEditMaterial(null); setModal("nuevoMaterial")} else {setEditZpr(null); setModal("nuevoZpr")} }}>+ Agregar</button>
      <button className="clearButton" onClick={restaurar}>Restaurar inicial</button>
    </div>
    <div className="masterHint">La actualización desde Excel <strong>agrega los registros nuevos y actualiza los existentes</strong>; no elimina automáticamente los que ya estaban. Los cambios quedan guardados en este navegador y pasan a la validación y al análisis.</div>
    {tab === "materiales" ? <div className="masterTableWrap"><table><thead><tr><th>Material</th><th>Descripción</th><th>Familia</th><th>Unidad</th><th>Estado</th><th></th></tr></thead><tbody>{materiales.slice(0, 300).map(p => <tr key={p.material}><td><strong>{p.material}</strong></td><td>{p.descripcion}</td><td>{p.texto_largo.split(" - ")[0] || "-"}</td><td>{p.unidad || "-"}</td><td><span className={p.activo ? "estadoOk" : "estadoError"}>{p.activo ? "Activo" : "Inactivo"}</span></td><td><button className="viewButton" onClick={() => {setEditMaterial(p); setModal("editarMaterial")}}>Editar</button></td></tr>)}</tbody></table>{materiales.length > 300 && <div className="tableNote">Mostrando 300 de {materiales.length.toLocaleString("es-AR")} coincidencias. Usá el buscador para acotar.</div>}</div> : <div className="masterTableWrap"><table><thead><tr><th>Código SAP</th><th>Razón social</th><th>Condición</th><th>Estado</th><th></th></tr></thead><tbody>{reglas.slice(0, 300).map(r => <tr key={r.cod_sap}><td><strong>{r.cod_sap}</strong></td><td>{r.razon_social}</td><td><span className={r.condicion_impositiva === "ZPR0" ? "conditionZpr0" : "conditionZpr2"}>{r.condicion_impositiva}</span></td><td><span className={r.activo ? "estadoOk" : "estadoError"}>{r.activo ? "Activo" : "Inactivo"}</span></td><td><button className="viewButton" onClick={() => {setEditZpr(r); setModal("editarZpr")}}>Editar</button></td></tr>)}</tbody></table>{reglas.length > 300 && <div className="tableNote">Mostrando 300 de {reglas.length.toLocaleString("es-AR")} coincidencias. Usá el buscador para acotar.</div>}</div>}
    {modal === "nuevoMaterial" || modal === "editarMaterial" ? <MaterialForm inicial={editMaterial || undefined} onClose={() => {setModal(null);setEditMaterial(null)}} onSave={guardarMaterial} /> : null}
    {modal === "nuevoZpr" || modal === "editarZpr" ? <ZprForm inicial={editZpr || undefined} onClose={() => {setModal(null);setEditZpr(null)}} onSave={guardarZpr} /> : null}
  </section>;
}

function MaterialForm({ inicial, onClose, onSave }: { inicial?: ProductoMaestro; onClose: () => void; onSave: (p: ProductoMaestro) => void }) {
  const [form, setForm] = useState<ProductoMaestro>(inicial ? {...inicial} : {material:"", descripcion:"", unidad:"", texto_largo:"", activo:true});
  return <div className="modalOverlay"><div className="modal masterModal"><div className="modalHeader"><div><h2>{inicial ? "Editar material" : "Nuevo material"}</h2><p>El material queda disponible para las próximas cargas y análisis.</p></div><button className="closeButton" onClick={onClose}>×</button></div><div className="formGrid"><label>Material<input value={form.material} onChange={e=>setForm({...form,material:e.target.value})} /></label><label>Unidad<input value={form.unidad} onChange={e=>setForm({...form,unidad:e.target.value})} /></label><label>Descripción<input value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} /></label><label>Texto largo / familia<textarea value={form.texto_largo} onChange={e=>setForm({...form,texto_largo:e.target.value})} /></label></div><div className="formActions"><button className="clearButton" onClick={onClose}>Cancelar</button><button className="primaryButton smallButton" onClick={()=>onSave(form)}>Guardar material</button></div></div></div>;
}

function ZprForm({ inicial, onClose, onSave }: { inicial?: ReglaMaestro; onClose: () => void; onSave: (r: ReglaMaestro) => void }) {
  const [form, setForm] = useState<ReglaMaestro>(inicial ? {...inicial} : {cod_sap:"", razon_social:"", condicion_impositiva:"ZPR0", activo:true});
  return <div className="modalOverlay"><div className="modal masterModal"><div className="modalHeader"><div><h2>{inicial ? "Editar condición" : "Nuevo cliente / condición"}</h2><p>La condición guardada será la referencia para validar el Excel mensual.</p></div><button className="closeButton" onClick={onClose}>×</button></div><div className="formGrid"><label>Código SAP<input value={form.cod_sap} onChange={e=>setForm({...form,cod_sap:e.target.value})} /></label><label>Condición<select value={form.condicion_impositiva} onChange={e=>setForm({...form,condicion_impositiva:e.target.value})}><option>ZPR0</option><option>ZPR2</option></select></label><label>Razón social<input value={form.razon_social} onChange={e=>setForm({...form,razon_social:e.target.value})} /></label></div><div className="formActions"><button className="clearButton" onClick={onClose}>Cancelar</button><button className="primaryButton smallButton" onClick={()=>onSave(form)}>Guardar condición</button></div></div></div>;
}

function Dashboard({ resultados, onCargar, onMaestros, maestros }: { resultados: ResultadoValidacion[]; onCargar: () => void; onMaestros: () => void; maestros: Maestros }) {
  const validos = resultados.filter(r => r.incluidoEnAnalisis);
  const importe = validos.reduce((s, r) => s + r.importeFinal, 0);
  const clientes = new Set(validos.map(r => r.razonSocial).filter(Boolean)).size;
  const materiales = new Set(validos.map(r => r.material).filter(Boolean)).size;
  const alertas = resultados.filter(r => r.estado !== "OK").length;
  return <>
    <section className="hero">
      <div><div className="heroTag">SISTEMA DE PRECIOS SAP</div><h2>Toda la información de precios<br />en un solo lugar.</h2><p>Validá tus archivos mensuales, detectá inconsistencias y analizá clientes y materiales.</p><div className="heroActions"><button className="heroButton" onClick={onCargar}>Comenzar análisis →</button><button className="secondaryButton" onClick={onMaestros}>Administrar maestros</button></div></div>
      <div className="heroGraphic"><div className="graphicCard"><div className="miniHeader"><span>Estado general</span><b className="miniOk">● Activo</b></div><div className="miniNumber">{resultados.length ? resultados.length.toLocaleString("es-AR") : "—"}</div><div className="miniLabel">registros procesados</div><div className="miniBars"><i /><i /><i /></div></div></div>
    </section>
    <section className="cardsGrid">
      <DashCard label="Materiales maestros" value={maestros.productos.length.toLocaleString("es-AR")} subtitle="Disponibles para validar" />
      <DashCard label="Clientes / ZPR" value={maestros.reglas.length.toLocaleString("es-AR")} subtitle="Reglas maestras vigentes" />
      <DashCard label="Registros" value={resultados.length ? resultados.length.toLocaleString("es-AR") : "—"} subtitle={resultados.length ? "Registros cargados" : "Sin archivo cargado"} />
      <DashCard label="Clientes" value={resultados.length ? String(clientes) : "—"} subtitle="Clientes identificados" />
      <DashCard label="Materiales" value={resultados.length ? String(materiales) : "—"} subtitle="Materiales válidos" />
      <DashCard label="Alertas" value={resultados.length ? String(alertas) : "—"} subtitle={resultados.length ? `Importe válido $ ${money(importe)}` : "Registros para revisar"} alert />
    </section>
  </>;
}

function DashCard({ label, value, subtitle, alert = false }: { label: string; value: string; subtitle: string; alert?: boolean }) {
  return <div className="dashCard"><div className={`dashIcon ${alert ? "alertIcon" : ""}`}>{alert ? "!" : "◉"}</div><div className="dashTitle">{label}</div><div className="dashValue">{value}</div><div className="dashSubtitle">{subtitle}</div></div>;
}

function CargaExcel(props: any) {
  const {
    archivo, cargando, generandoWord, error, resultados, resultadosFiltrados, estadisticas,
    clientes, materiales, familias, condiciones, busqueda,
    clientesDisponibles, materialesDisponibles, familiasDisponibles, condicionesDisponibles,
    analisis, detalle, setClientes, setMateriales, setFamilias, setCondiciones, setBusqueda,
    setDetalle, onUpload, onClear, onAnalisis, onExportarExcel, onExportarWord,
  } = props;

  return <>
    <section className="uploadBox">
      <div className="uploadIcon">↑</div>
      <div className="uploadText"><h2>Cargar archivo mensual</h2><p>Seleccioná el archivo exportado desde SAP. El sistema valida y normaliza los datos automáticamente.</p></div>
      <input className="fileInput" type="file" accept=".xls,.xlsx" onChange={onUpload} />
      {archivo && <div className="uploadFileName">Archivo seleccionado: <strong>{archivo}</strong></div>}
      {cargando && <div className="loading">⏳ Procesando archivo...</div>}
    </section>
    {error && <div className="errorBox">❌ {error}</div>}

    {!!resultados.length && <>
      <section className="scopeBanner">
        <div><strong>Universo actual</strong><span>{resultadosFiltrados.length.toLocaleString("es-AR")} registros de {resultados.length.toLocaleString("es-AR")}</span></div>
        <button className="primaryButton analysisButton" onClick={onAnalisis} disabled={!resultadosFiltrados.length}>⚡ Realizar análisis</button>
      </section>

      <section className="resultsHeader">
        <ResultCard label="REGISTROS" value={resultados.length} />
        <ResultCard label="SELECCIONADOS" value={resultadosFiltrados.length} />
        <ResultCard label="VÁLIDOS PARA $" value={estadisticas.validos} />
        <ResultCard label="ALERTAS" value={estadisticas.alertas} />
        <ResultCard label="ERRORES" value={estadisticas.errores} />
        <ResultCard label="IMPORTE VÁLIDO" value={estadisticas.importe} money />
      </section>

      <section className="filtersPanel">
        <div className="filtersTop"><div><div className="filtersTitle">🔎 Definí el universo a analizar</div><div className="filtersSubtitle">Podés seleccionar uno, varios o todos. Los filtros se combinan entre sí y definen el universo que analizará el botón.</div></div><button className="clearButton" onClick={onClear}>Limpiar filtros</button></div>
        <div className="filterGridMulti">
          <MultiSelect label="CLIENTES" options={clientesDisponibles} values={clientes} onChange={setClientes} placeholder="Todos los clientes" />
          <MultiSelect label="FAMILIAS" options={familiasDisponibles} values={familias} onChange={setFamilias} placeholder="Todas las familias" />
          <MultiSelect label="MATERIALES" options={materialesDisponibles} values={materiales} onChange={setMateriales} placeholder="Todos los materiales" />
          <MultiSelect label="ZPR" options={condicionesDisponibles} values={condiciones} onChange={setCondiciones} placeholder="ZPR0 / ZPR2" />
        </div>
        <div className="searchRow"><label className="filterLabel">BÚSQUEDA LIBRE</label><input className="searchBox" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Cliente, razón social, material, familia, descripción, ZPR o texto largo..." /></div>
        <div className="selectionSummary"><span>{clientes.length ? `${clientes.length} cliente(s)` : "Todos los clientes"}</span><span>{familias.length ? `${familias.length} familia(s)` : "Todas las familias"}</span><span>{materiales.length ? `${materiales.length} material(es)` : "Todos los materiales"}</span><span>{condiciones.length ? condiciones.join(" + ") : "ZPR: todas"}</span></div>
      </section>

      <section className="validationStrip">
        <div><strong>Validación</strong><span>OK {estadisticas.ok} · Alertas {estadisticas.alertas} · Errores {estadisticas.errores}</span></div>
        <div><strong>Condiciones válidas</strong><span>ZPR0 {estadisticas.zpr0} · ZPR2 {estadisticas.zpr2}</span></div>
        <div><strong>Importe válido</strong><span>$ {money(estadisticas.importe)}</span></div>
      </section>

      {analisis && <CommercialAnalysis analisis={analisis} onExportWord={onExportarWord} generandoWord={generandoWord} />}

      <section className="tablePanel">
        <div className="tablePanelHeader"><div><h3>Registros del universo seleccionado</h3><p>Los registros con ZPR incorrecta, cliente sin referencia o material sin nomenclador quedan fuera del análisis comercial.</p></div><button className="exportButton" onClick={onExportarExcel}>↓ Descargar Excel</button></div>
        <div className="tableScroll"><table><thead><tr><th>Fila</th><th>Cliente</th><th>Material</th><th>Familia</th><th>Condición</th><th>Importe</th><th>PB00</th><th>Final</th><th>Análisis $</th><th>Estado</th><th>Detalle</th></tr></thead>
          <tbody>{resultadosFiltrados.slice(0, 500).map((r: ResultadoValidacion, idx: number) => <tr key={`${r.fila}-${r.cliente}-${r.material}-${idx}`}><td>{r.fila}</td><td><strong>{r.razonSocial || r.cliente || "-"}</strong><small>SAP {r.cliente}</small></td><td>{r.material}</td><td>{r.familia || <span className="wrongCondition">Sin familia</span>}</td><td><strong>{r.condicionExcel || "-"}</strong>{r.condicionEsperada && r.condicionExcel && r.condicionExcel.toUpperCase() !== r.condicionEsperada.toUpperCase() && <small className="wrongCondition">Base: {r.condicionEsperada}</small>}</td><td>{money(r.importe)}</td><td>{r.tienePB00 ? money(r.importePB00) : "-"}</td><td><strong>{money(r.importeFinal)}</strong></td><td>{r.incluidoEnAnalisis ? <span className="estadoOk">✓ Sí</span> : <span className="estadoError">✕ No</span>}</td><td><span className={r.estado === "OK" ? "estadoOk" : r.estado === "ALERTA" ? "estadoAlerta" : "estadoError"}>● {r.estado}</span></td><td><button className="viewButton" onClick={() => setDetalle(r)}>Ver</button></td></tr>)}</tbody></table>{resultadosFiltrados.length > 500 && <div className="tableNote">Se muestran los primeros 500 registros en pantalla. El Excel descargado contiene todo el universo seleccionado.</div>}</div>
      </section>
    </>}
    {detalle && <DetailModal r={detalle} onClose={() => setDetalle(null)} />}
  </>;
}

function MultiSelect({ label, options, values, onChange, placeholder }: { label: string; options: string[]; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = options.filter(o => o.toUpperCase().includes(q.toUpperCase())).slice(0, 250);
  function toggle(value: string) { onChange(values.includes(value) ? values.filter(v => v !== value) : [...values, value]); }
  function seleccionarTodos() { onChange(Array.from(new Set([...values, ...options]))); }
  return <div className="multiWrap"><label className="filterLabel">{label}</label><button type="button" className={`multiButton ${values.length ? "hasSelection" : ""}`} onClick={() => setOpen(!open)}><span>{values.length ? `${values.length} seleccionado(s)` : placeholder}</span><span>⌄</span></button>{open && <div className="multiMenu"><input autoFocus className="multiSearch" value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar ${label.toLowerCase()}...`} /><div className="multiActions"><button type="button" onClick={seleccionarTodos}>Seleccionar todos</button><button type="button" onClick={() => onChange([])}>Limpiar</button></div><div className="multiList">{filtered.map(o => <label key={o} className="checkItem"><input type="checkbox" checked={values.includes(o)} onChange={() => toggle(o)} /><span>{o}</span></label>)}{!filtered.length && <div className="emptySmall">Sin coincidencias</div>}</div></div>}</div>;
}

function CommercialAnalysis({ analisis, onExportWord, generandoWord }: { analisis: ResultadoComercial; onExportWord: () => void; generandoWord: boolean }) {
  const maxFamily = Math.max(...analisis.gruposFamilia.map(x => x.importeTotal), 1);

  // Las señales principales se leen desde FAMILIA x CLIENTE.
  // El material queda como segundo nivel de detalle.
  const familySignals = [...analisis.gruposFamiliaCliente]
    .filter(x => x.promedioFamilia > 0 && Math.abs(x.porcentajeVsPromedio) > 0.0001)
    .sort((a, b) => Math.abs(b.porcentajeVsPromedio) - Math.abs(a.porcentajeVsPromedio))
    .slice(0, 15);

  return <section className="analysisPanel" id="analisis-comercial">
    <div className="analysisHeader">
      <div>
        <div className="eyebrow">ANÁLISIS COMERCIAL</div>
        <h2>Comparación del universo seleccionado</h2>
        <p>El análisis principal se realiza por familia: primero suma los materiales de cada cliente dentro de la familia y luego compara ese total contra el promedio de los clientes de esa misma familia.</p>
      </div>
      <div className="analysisActions">
        <div className="analysisKpis">
          <Kpi label="Registros" value={analisis.totalRegistros.toLocaleString("es-AR")} />
          <Kpi label="Clientes" value={String(analisis.clientes)} />
          <Kpi label="Familias" value={String(analisis.familias)} />
          <Kpi label="Importe" value={`$ ${money(analisis.importeTotal)}`} />
        </div>
        <button className="wordButton" onClick={onExportWord} disabled={generandoWord}>
          {generandoWord ? "⏳ Generando Word..." : "▣ Descargar informe Word"}
        </button>
      </div>
    </div>

    <div className="executiveBox">
      <strong>Conclusión ejecutiva</strong>
      <p>{analisis.conclusionEjecutiva}</p>
      <ul>{analisis.conclusiones.slice(0, 8).map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>

    <div className="analysisGrid">
      <div className="panel">
        <div className="panelHeader">
          <div>
            <h3>Importe por familia</h3>
            <p>Cada barra representa el importe total de todos los clientes dentro de la familia.</p>
          </div>
        </div>
        {analisis.gruposFamilia.length ? analisis.gruposFamilia.slice(0, 12).map(f =>
          <div className="barRow" key={f.familia}>
            <div className="barLabel">
              <strong>{f.familia}</strong>
              <span>$ {money(f.importeTotal)} · prom. clientes $ {money(f.promedio)}</span>
            </div>
            <div className="bar">
              <i style={{ width: `${Math.max(3, f.importeTotal / maxFamily * 100)}%` }} />
            </div>
          </div>
        ) : <div className="noResults">No hay familias válidas para analizar.</div>}
      </div>

      <div className="panel">
        <div className="panelHeader">
          <div>
            <h3>Principales diferencias por familia</h3>
            <p>Se muestran las mayores diferencias reales contra el promedio de cada familia.</p>
          </div>
        </div>
        {familySignals.length ? familySignals.map((x, i) =>
          <div className="opportunity" key={`${x.familia}-${x.cliente}-${i}`}>
            <div className={x.porcentajeVsPromedio > 0 ? "oppTag high" : "oppTag low"}>
              {x.porcentajeVsPromedio > 0 ? "POR ENCIMA" : "POR DEBAJO"}
            </div>
            <div>
              <strong>{x.cliente}</strong>
              <span>{x.familia}</span>
              <small>
                {pct(x.porcentajeVsPromedio)} vs promedio ·
                $ {money(x.importeTotal)} vs $ {money(x.promedioFamilia)} ·
                {x.vecesVsPromedio.toFixed(1)}x
              </small>
            </div>
          </div>
        ) : <div className="noResults"><strong>Sin diferencias</strong>Los clientes del universo están en promedio dentro de las familias comparables.</div>}
      </div>
    </div>

    <div className="panel familyClientPanel">
      <div className="panelHeader">
        <div>
          <h3>Comparación por familia y cliente</h3>
          <p>Primero se consolidan todos los materiales de cada cliente dentro de una familia. Luego se calcula el promedio de esos clientes y la diferencia de cada uno.</p>
        </div>
      </div>
      <div className="tableScroll">
        <table>
          <thead>
            <tr>
              <th>Familia</th>
              <th>Cliente</th>
              <th>Registros</th>
              <th>Materiales</th>
              <th>Total familia</th>
              <th>Promedio</th>
              <th>Diferencia</th>
              <th>Vs promedio</th>
              <th>Posición</th>
            </tr>
          </thead>
          <tbody>
            {analisis.gruposFamiliaCliente.slice(0, 200).map((x, i) =>
              <tr key={`${x.familia}-${x.cliente}-${i}`}>
                <td>{x.familia}</td>
                <td>{x.cliente}</td>
                <td>{x.registros}</td>
                <td>{x.materiales}</td>
                <td>$ {money(x.importeTotal)}</td>
                <td>$ {money(x.promedioFamilia)}</td>
                <td>{x.diferenciaVsPromedio >= 0 ? "+" : "-"}$ {money(Math.abs(x.diferenciaVsPromedio))}</td>
                <td className={x.porcentajeVsPromedio > 0.0001 ? "estadoOk" : x.porcentajeVsPromedio < -0.0001 ? "estadoAlerta" : ""}>
                  {pct(x.porcentajeVsPromedio)}
                  <small>{x.vecesVsPromedio ? `${x.vecesVsPromedio.toFixed(1)}x` : ""}</small>
                </td>
                <td>#{x.posicion}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    <div className="panel">
      <div className="panelHeader">
        <div>
          <h3>Detalle por material y cliente</h3>
          <p>El material explica cómo se compone cada familia. Cuando hay varios clientes con el mismo material, se compara cada cliente contra el promedio de ese material.</p>
        </div>
      </div>
      <div className="tableScroll">
        <table>
          <thead>
            <tr>
              <th>Familia</th>
              <th>Material</th>
              <th>Cliente</th>
              <th>Importe</th>
              <th>Promedio material</th>
              <th>Diferencia</th>
              <th>Vs promedio</th>
              <th>Posición</th>
            </tr>
          </thead>
          <tbody>
            {analisis.gruposMaterial.slice(0, 150).flatMap(g =>
              g.clientes.map(c =>
                <tr key={`${g.familia}-${g.material}-${c.cliente}`}>
                  <td>{g.familia}</td>
                  <td><strong>{g.material}</strong><small>{g.descripcion}</small></td>
                  <td>{c.razonSocial}</td>
                  <td>$ {money(c.importeTotal)}</td>
                  <td>$ {money(c.referenciaPromedioSeleccionado)}</td>
                  <td>{c.diferenciaVsPromedio >= 0 ? "+" : "-"}$ {money(Math.abs(c.diferenciaVsPromedio))}</td>
                  <td className={c.porcentajeVsPromedio > 0.0001 ? "estadoOk" : c.porcentajeVsPromedio < -0.0001 ? "estadoAlerta" : ""}>
                    {pct(c.porcentajeVsPromedio)}
                    <small>{c.vecesVsPromedio ? `${c.vecesVsPromedio.toFixed(1)}x` : ""}</small>
                  </td>
                  <td>#{c.posicion}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  </section>;
}

function DetailModal({ r, onClose }: { r: ResultadoValidacion; onClose: () => void }) {
  return <div className="modalOverlay" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modalHeader"><div><div className="eyebrow">DETALLE DEL REGISTRO</div><h2>{r.material || "Sin material"}</h2><p>{r.razonSocial || r.cliente}</p></div><button className="closeButton" onClick={onClose}>×</button></div><div className="detailGrid"><DetailBox label="Cliente SAP" value={r.cliente} /><DetailBox label="Razón social" value={r.razonSocial} /><DetailBox label="Material" value={r.material} /><DetailBox label="Descripción" value={r.descripcionMaterial} /><DetailBox label="Familia" value={r.familia || "Sin familia"} /><DetailBox label="Clasificación" value={r.clasificacionMaterial || "-"} /><DetailBox label="Texto largo" value={r.textoLargoMaterial || "-"} /><DetailBox label="Condición Excel" value={r.condicionExcel || "-"} /><DetailBox label="Condición según base" value={r.condicionEsperada || "-"} /><DetailBox label="Condición utilizada" value={r.condicionAnalisis || "No utilizada"} /><DetailBox label="Importe" value={`$ ${money(r.importe)} ${r.moneda}`} /><DetailBox label="PB00" value={r.tienePB00 ? `$ ${money(r.importePB00)}` : "Sin PB00"} /><DetailBox label="Importe final" value={`$ ${money(r.importeFinal)}`} /><DetailBox label="Participa del análisis" value={r.incluidoEnAnalisis ? "SÍ" : "NO"} highlight={r.incluidoEnAnalisis} /></div>{r.observaciones.length > 0 && <div className="alertDetail"><div className="alertTitle">Observaciones</div>{r.observaciones.map((o, i) => <div className="observation" key={i}>• {o}</div>)}</div>}</div></div>;
}

function DetailBox({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) { return <div className={`detailBox ${highlight ? "detailHighlight" : ""}`}><span>{label}</span><strong>{value || "-"}</strong></div>; }
function ResultCard({ label, value, money: isMoney = false }: { label: string; value: number; money?: boolean }) { return <div className="resultCard"><span>{label}</span><strong>{isMoney ? `$ ${money(value)}` : value.toLocaleString("es-AR")}</strong></div>; }
function Kpi({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function fechaArchivo() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

const styles = `
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;color:#152238}.app{min-height:100vh}.sidebar{position:fixed;left:0;top:0;bottom:0;width:295px;background:#101a23;color:#fff;padding:42px 20px 24px;z-index:20}.brand{padding:0 28px 38px;border-bottom:1px solid rgba(255,255,255,.08)}.brand img{width:140px;height:auto;display:block;margin-bottom:35px}.brandTitle{font-size:13px;color:#b9c4ce;line-height:1.8}.brandTitle span{display:block;color:#fff;font-size:20px;font-weight:800}.menu{padding-top:28px;display:flex;flex-direction:column;gap:6px}.menuItem,.menuDisabled{width:100%;height:57px;border:0;background:transparent;color:#c6d0da;border-radius:12px;padding:0 14px;text-align:left;font-size:14px;display:flex;align-items:center;gap:16px}.menuItem{cursor:pointer}.menuItem span,.menuDisabled span{width:25px;text-align:center;font-size:17px}.menuItem.active{background:#79d000;color:#111820;font-weight:800}.menuDisabled{color:#7e8995}.menuDisabled small{margin-left:auto;font-size:9px;color:#687481}.sidebarStatus{position:absolute;bottom:24px;left:29px;color:#8ea0af;font-size:11px}.sidebarStatus i{display:inline-block;width:8px;height:8px;background:#79d000;border-radius:50%;margin-right:9px}.content{margin-left:295px;width:calc(100% - 295px);padding:42px 58px 70px}.topHeader{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:34px}.eyebrow{font-size:11px;letter-spacing:3px;color:#70bb00;font-weight:800;margin-bottom:8px}.topHeader h1{font-size:38px;line-height:1;margin:0 0 10px}.topHeader p{margin:0;color:#758294;font-size:14px}.primaryButton{border:0;background:#79d000;color:#101820;padding:14px 19px;border-radius:10px;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 8px 22px rgba(121,208,0,.16)}.primaryButton:disabled,.wordButton:disabled{opacity:.55;cursor:not-allowed}.hero{background:linear-gradient(120deg,#17232f,#253746);color:#fff;border-radius:20px;padding:43px 53px;display:flex;justify-content:space-between;align-items:center;overflow:hidden;position:relative;margin-bottom:30px;min-height:320px}.heroTag{color:#8dd817;font-size:11px;font-weight:800;letter-spacing:2px;margin-bottom:15px}.hero h2{font-size:34px;line-height:1.15;margin:0}.hero p{color:#b9c4ce;max-width:600px;line-height:1.6;font-size:14px;margin:18px 0 23px}.heroButton{background:#79d000;color:#101820;border:0;padding:13px 19px;border-radius:9px;font-weight:800;cursor:pointer}.heroActions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.secondaryButton{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.28);padding:12px 17px;border-radius:9px;font-weight:700;cursor:pointer}.smallButton{padding:9px 13px;font-size:11px}.mastersPanel{background:#fff;border:1px solid #e1e6eb;border-radius:18px;padding:22px}.mastersHero{background:#17232f;color:#fff;border-radius:15px;padding:25px 28px;display:flex;justify-content:space-between;gap:25px;align-items:center}.mastersHero h2{font-size:25px;margin:0}.mastersHero p{color:#b9c4ce;font-size:12px;line-height:1.55;max-width:720px}.masterStats{display:flex;gap:10px;flex:none}.masterStats div{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:13px 16px;min-width:105px}.masterStats strong,.masterStats span{display:block}.masterStats strong{font-size:20px}.masterStats span{font-size:9px;color:#b9c4ce;margin-top:4px}.masterMessage{margin:13px 0;padding:11px 13px;border-radius:9px;background:#eef8e7;color:#4f7f09;font-size:11px;font-weight:700}.masterTabs{display:flex;gap:5px;margin:20px 0 12px;border-bottom:1px solid #e5e9ed}.masterTab{border:0;background:transparent;padding:11px 14px;color:#718092;font-weight:700;font-size:11px;cursor:pointer;border-bottom:3px solid transparent}.masterTab.active{color:#4e8300;border-bottom-color:#79d000}.masterToolbar{display:grid;grid-template-columns:1fr auto auto auto;gap:9px;align-items:center}.masterImportButton{display:inline-flex;align-items:center;justify-content:center;border:1px solid #dce2e8;background:#fff;color:#596777;padding:9px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer}.masterImportButton input{display:none}.masterHint{margin:12px 0;padding:10px 12px;background:#f7f9fb;border:1px solid #e7ebef;border-radius:8px;color:#7a8795;font-size:10px;line-height:1.5}.masterTableWrap{border:1px solid #e4e8ed;border-radius:10px;overflow:auto;max-height:620px}.conditionZpr0{color:#5d9800;font-weight:800}.conditionZpr2{color:#9b6b00;font-weight:800}.formGrid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.formGrid label{font-size:10px;color:#7a8795;font-weight:700}.formGrid input,.formGrid textarea,.formGrid select{display:block;width:100%;margin-top:6px;border:1px solid #d8dee5;border-radius:8px;padding:10px;font-size:12px;color:#263447;background:#fff}.formGrid textarea{min-height:90px;resize:vertical}.formGrid label:nth-child(3),.formGrid label:nth-child(4){grid-column:1/-1}.formActions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.heroGraphic{width:390px;height:240px;position:relative;margin-right:10px}.graphicCard{position:absolute;width:275px;background:rgba(255,255,255,.97);color:#152238;border-radius:15px;padding:18px;top:35px;left:50px;box-shadow:0 20px 45px rgba(0,0,0,.22)}.miniHeader{display:flex;justify-content:space-between;font-size:10px;color:#687687}.miniOk{color:#5f9e00}.miniNumber{font-size:31px;font-weight:800;margin-top:25px}.miniLabel{color:#8993a0;font-size:10px}.miniBars{display:flex;gap:5px;height:5px;margin-top:17px;background:#edf0f3;border-radius:4px;overflow:hidden}.miniBars i{height:100%;background:#79d000;display:block;flex:1}.cardsGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:17px}.dashCard,.panel,.resultCard,.filtersPanel,.tablePanel,.analysisPanel{background:#fff;border:1px solid #e1e6eb;border-radius:15px}.dashCard{padding:20px}.dashIcon{width:43px;height:43px;border-radius:11px;background:#eef7e5;color:#5d9c00;display:flex;align-items:center;justify-content:center;font-weight:800;margin-bottom:18px}.alertIcon{background:#fff4dc;color:#d48b00}.dashTitle{font-size:12px;color:#7b8796}.dashValue{font-size:28px;font-weight:800;margin:7px 0}.dashSubtitle{color:#9aa4af;font-size:10px}.uploadBox{background:#fff;border:2px dashed #d7dee6;border-radius:16px;padding:30px 34px;display:flex;align-items:center;gap:20px;margin-bottom:15px;min-height:165px}.uploadIcon{width:54px;height:54px;border-radius:14px;background:#eef7e5;color:#62a600;display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:800;flex:none}.uploadText{flex:1}.uploadText h2{font-size:20px;margin:0 0 6px}.uploadText p{color:#8994a1;font-size:12px;margin:0;line-height:1.5}.fileInput{border:1px solid #dce2e8;padding:9px;border-radius:8px;background:#fff;max-width:300px}.uploadFileName{font-size:12px;color:#5f6d7d}.loading{color:#679e00;font-weight:700;font-size:12px}.errorBox{margin:10px 0 15px;background:#fff0f0;color:#c53030;border-radius:9px;padding:13px;font-size:12px}.scopeBanner{background:#17232f;color:#fff;border-radius:14px;padding:17px 20px;display:flex;justify-content:space-between;align-items:center;margin:18px 0}.scopeBanner strong{display:block;font-size:15px}.scopeBanner span{font-size:11px;color:#b9c4ce;display:block;margin-top:4px}.analysisButton{box-shadow:none}.resultsHeader{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:18px}.resultCard{padding:15px}.resultCard span{color:#8994a1;font-size:9px;letter-spacing:.5px}.resultCard strong{display:block;margin-top:6px;font-size:18px}.filtersPanel{padding:20px;margin-bottom:18px}.filtersTop{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.filtersTitle{font-size:15px;font-weight:800}.filtersSubtitle{color:#8d98a5;font-size:10px;margin-top:5px}.clearButton{border:1px solid #dce2e8;background:#fff;color:#596777;padding:8px 12px;border-radius:8px;font-size:11px;cursor:pointer}.filterGridMulti{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}.filterLabel{display:block;font-size:9px;color:#8b96a3;margin-bottom:6px;font-weight:700}.multiWrap{position:relative}.multiButton{width:100%;height:41px;border:1px solid #d8dee5;border-radius:8px;background:#fff;padding:0 11px;color:#263447;font-size:11px;display:flex;justify-content:space-between;align-items:center;text-align:left;cursor:pointer}.multiButton.hasSelection{border-color:#9bd55d;background:#fbfdf8}.multiMenu{position:absolute;z-index:50;top:63px;left:0;width:100%;min-width:250px;background:#fff;border:1px solid #d8dee5;border-radius:10px;box-shadow:0 15px 40px rgba(15,24,32,.15);padding:10px}.multiSearch{width:100%;height:34px;border:1px solid #d8dee5;border-radius:7px;padding:0 9px;font-size:11px}.multiActions{display:flex;justify-content:space-between;padding:8px 0}.multiActions button{border:0;background:transparent;color:#5d9700;font-size:10px;font-weight:700;cursor:pointer}.multiList{max-height:270px;overflow:auto}.checkItem{display:flex;align-items:center;gap:8px;padding:7px 5px;font-size:10px;border-radius:6px}.checkItem:hover{background:#f5f8f2}.checkItem input{accent-color:#79d000}.emptySmall{padding:15px;text-align:center;color:#8994a1;font-size:10px}.searchRow{margin-top:13px}.searchBox{width:100%;height:40px;border:1px solid #d8dee5;border-radius:8px;padding:0 11px;color:#263447;font-size:11px;outline:none}.searchBox:focus{border-color:#79d000;box-shadow:0 0 0 3px rgba(121,208,0,.1)}.selectionSummary{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.selectionSummary span{font-size:9px;background:#f0f6e9;color:#527e11;padding:6px 9px;border-radius:999px}.validationStrip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}.validationStrip>div{background:#fff;border:1px solid #e4e8ed;border-radius:10px;padding:13px}.validationStrip strong,.validationStrip span{display:block}.validationStrip strong{font-size:10px}.validationStrip span{font-size:11px;color:#7b8796;margin-top:4px}.tablePanel{padding:20px;overflow:hidden}.tablePanelHeader,.analysisHeader{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}.tablePanelHeader h3,.panelHeader h3{margin:0;font-size:16px}.tablePanelHeader p,.panelHeader p{margin:5px 0 0;color:#929ca8;font-size:10px;line-height:1.4}.exportButton,.wordButton{border:0;background:#101820;color:#fff;padding:10px 14px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}.wordButton{background:#79d000;color:#101820;margin-top:9px}.tableScroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:10px}th{text-align:left;padding:10px;color:#687687;border-bottom:2px solid #e5e9ed;white-space:nowrap;background:#fafbfc}td{padding:10px;border-bottom:1px solid #eef1f4;white-space:nowrap;vertical-align:middle}td small{display:block;color:#929ca8;font-size:8px;margin-top:3px}.estadoOk{color:#5d9800;font-weight:700}.estadoAlerta{color:#d28b00;font-weight:700}.estadoError,.wrongCondition{color:#d12e2e;font-weight:700}.viewButton{border:1px solid #dce2e8;background:#fff;color:#526172;padding:6px 9px;border-radius:6px;font-size:9px;cursor:pointer}.tableNote{padding:12px;background:#fafbfc;color:#8994a1;font-size:10px}.analysisPanel{margin:18px 0;padding:22px}.analysisHeader{align-items:flex-start}.analysisHeader h2{font-size:23px;margin:0}.analysisHeader p{color:#7b8796;font-size:11px;margin:7px 0 0}.analysisActions{display:flex;flex-direction:column;align-items:flex-end}.analysisKpis{display:flex;gap:9px}.analysisKpis>div{background:#f7f9fb;border:1px solid #e7ebef;border-radius:9px;padding:10px 13px;min-width:88px}.analysisKpis span{display:block;color:#8994a1;font-size:8px}.analysisKpis strong{display:block;margin-top:4px;font-size:12px}.executiveBox{background:#f4f8ee;border:1px solid #dcebc9;border-radius:12px;padding:17px 18px;margin-bottom:16px}.executiveBox strong{font-size:12px;color:#466c09}.executiveBox p{font-size:12px;line-height:1.55;margin:8px 0}.executiveBox ul{margin:8px 0 0;padding-left:20px}.executiveBox li{font-size:10px;color:#536171;margin:5px 0;line-height:1.5}.analysisGrid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px}.panel{padding:18px}.panelHeader{display:flex;justify-content:space-between;margin-bottom:18px}.barRow{margin:12px 0}.barLabel{display:flex;justify-content:space-between;gap:15px;font-size:9px;margin-bottom:5px}.barLabel span{color:#8994a1}.bar{height:8px;background:#edf0f3;border-radius:5px;overflow:hidden}.bar i{height:100%;display:block;background:#79d000;border-radius:5px}.opportunity{display:flex;gap:10px;padding:11px 0;border-bottom:1px solid #eef1f4}.oppTag{font-size:8px;font-weight:800;padding:5px 6px;border-radius:5px;height:max-content}.oppTag.high{background:#eef8e7;color:#579000}.oppTag.low{background:#fff4dc;color:#d28b00}.opportunity strong,.opportunity span,.opportunity small{display:block}.opportunity strong{font-size:10px}.opportunity span{font-size:9px;color:#687687;margin-top:3px}.opportunity small{font-size:8px;color:#929ca8;margin-top:4px}.noResults{text-align:center;padding:25px;color:#8994a1;font-size:10px}.noResults strong{display:block;color:#536171;margin-bottom:5px}.familyClientPanel{margin-top:15px}.modalOverlay{position:fixed;inset:0;background:rgba(15,24,32,.6);display:flex;align-items:center;justify-content:center;z-index:1000;padding:25px}.modal{width:min(950px,100%);max-height:90vh;overflow-y:auto;background:#fff;border-radius:18px;padding:28px;box-shadow:0 30px 80px rgba(0,0,0,.25)}.modalHeader{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.modalHeader h2{font-size:23px;margin:0 0 5px}.modalHeader p{margin:0;color:#748293;font-size:12px}.closeButton{width:34px;height:34px;border:0;border-radius:8px;background:#f1f3f5;color:#5c6977;font-size:23px;cursor:pointer}.detailGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.detailBox{border:1px solid #e7ebef;border-radius:10px;padding:12px}.detailBox span{display:block;color:#8c97a3;font-size:8px;margin-bottom:5px;text-transform:uppercase}.detailBox strong{font-size:11px;white-space:normal;line-height:1.45}.detailHighlight{background:#eef8e7;border-color:#cce5b3}.alertDetail{margin-top:16px;padding:16px;background:#fffaf0;border:1px solid #f2dfb2;border-radius:12px}.alertTitle{font-size:12px;font-weight:800;color:#b87900;margin-bottom:10px}.observation{font-size:10px;color:#687687;margin:5px 0;line-height:1.4}@media(max-width:1200px){.filterGridMulti{grid-template-columns:repeat(2,1fr)}.resultsHeader{grid-template-columns:repeat(3,1fr)}.analysisHeader{display:block}.analysisActions{align-items:flex-start;margin-top:15px}.heroGraphic{display:none}}@media(max-width:900px){.sidebar{width:75px;padding:20px 8px}.brandTitle{display:none}.brand img{width:50px}.menuItem,.menuDisabled{font-size:0}.menuItem span,.menuDisabled span{font-size:18px}.menuDisabled small{display:none}.content{margin-left:75px;width:calc(100% - 75px);padding:25px}.cardsGrid{grid-template-columns:repeat(2,1fr)}.analysisGrid{grid-template-columns:1fr}.filterGridMulti{grid-template-columns:1fr}.validationStrip{grid-template-columns:1fr}.uploadBox{display:grid;grid-template-columns:auto 1fr}.fileInput{grid-column:1/-1;max-width:none;width:100%}.topHeader{display:block}.topHeader .primaryButton{margin-top:15px}}@media(max-width:600px){.content{padding:18px}.resultsHeader{grid-template-columns:repeat(2,1fr)}.cardsGrid{grid-template-columns:1fr}.scopeBanner{display:block}.scopeBanner button{margin-top:12px}.detailGrid{grid-template-columns:1fr}.analysisKpis{display:grid;grid-template-columns:1fr 1fr}.analysisActions{display:block}.analysisActions .wordButton{width:100%}}
`;

if (typeof document !== "undefined" && !document.getElementById("sap-styles")) {
  const style = document.createElement("style");
  style.id = "sap-styles";
  style.textContent = styles;
  document.head.appendChild(style);
}
