"use client";

import { useMemo, useState } from "react";
import { writeFile, utils } from "xlsx";
import { leerExcel } from "../lib/excel";
import { validarExcel, ResultadoValidacion } from "../lib/validador";
import { analizarResultados, filtrarResultados, realizarAnalisis, ResultadoComercial, SeleccionAnalisis } from "../lib/analisis";

type Vista = "inicio" | "cargar";

const money = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export default function Home() {
  const [vista, setVista] = useState<Vista>("inicio");
  const [archivo, setArchivo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultados, setResultados] = useState<ResultadoValidacion[]>([]);
  const [detalle, setDetalle] = useState<ResultadoValidacion | null>(null);
  const [analisis, setAnalisis] = useState<ResultadoComercial | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState<string[]>([]);
  const [materiales, setMateriales] = useState<string[]>([]);
  const [familias, setFamilias] = useState<string[]>([]);
  const [condiciones, setCondiciones] = useState<string[]>([]);

  async function procesarArchivo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setArchivo(file.name);
    setCargando(true);
    setError("");
    setAnalisis(null);
    limpiarFiltros();
    try {
      const buffer = await file.arrayBuffer();
      const filas = leerExcel(buffer);
      if (!filas.length) throw new Error("El Excel no contiene registros.");
      const validados = validarExcel(filas);
      setResultados(validados);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo procesar el Excel.");
      setResultados([]);
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
    noValidos: resultadosFiltrados.filter(r => !r.incluidoEnAnalisis).length,
    zpr0: resultadosFiltrados.filter(r => r.condicionAnalisis === "ZPR0").length,
    zpr2: resultadosFiltrados.filter(r => r.condicionAnalisis === "ZPR2").length,
    importe: resultadosFiltrados.filter(r => r.incluidoEnAnalisis).reduce((s, r) => s + r.importeFinal, 0),
  }), [resultadosFiltrados]);

  function ejecutarAnalisis() {
    setAnalisis(realizarAnalisis(resultadosFiltrados));
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
      "Condición correcta": r.condicionEsperada,
      "Condición utilizada análisis": r.condicionAnalisis,
      "Incluido en análisis": r.incluidoEnAnalisis ? "SI" : "NO",
      Importe: r.importe,
      PB00: r.importePB00,
      "Importe final": r.importeFinal,
      Moneda: r.moneda,
      Cantidad: r.cantidad,
      Por: r.por,
      UM: r.unidadMedida,
      Estado: r.estado,
      Observaciones: r.observaciones.join(" "),
    }));
    const hoja = utils.json_to_sheet(datos);
    const libro = utils.book_new();
    utils.book_append_sheet(libro, hoja, "Resultados");
    writeFile(libro, "analisis-precios-sap.xlsx");
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-addoc.png" alt="ADDOC" />
          <div className="brandTitle">Sistema de Precios<span>SAP</span></div>
        </div>
        <nav className="menu">
          <button className={vista === "inicio" ? "menuItem active" : "menuItem"} onClick={() => setVista("inicio")}><span>⌂</span>Inicio</button>
          <button className={vista === "cargar" ? "menuItem active" : "menuItem"} onClick={() => setVista("cargar")}><span>↑</span>Cargar y analizar</button>
        </nav>
        <div className="sidebarBottom"><div className="systemStatus"><span className="statusDot" />Sistema operativo</div></div>
      </aside>

      <section className="content">
        {vista === "inicio" ? (
          <Dashboard resultados={resultados} archivo={archivo} onCargar={() => setVista("cargar")} />
        ) : (
          <Workspace
            archivo={archivo}
            cargando={cargando}
            error={error}
            resultados={resultados}
            resultadosFiltrados={resultadosFiltrados}
            clientesDisponibles={clientesDisponibles}
            materialesDisponibles={materialesDisponibles}
            familiasDisponibles={familiasDisponibles}
            condicionesDisponibles={condicionesDisponibles}
            clientes={clientes}
            materiales={materiales}
            familias={familias}
            condiciones={condiciones}
            busqueda={busqueda}
            setClientes={setClientes}
            setMateriales={setMateriales}
            setFamilias={setFamilias}
            setCondiciones={setCondiciones}
            setBusqueda={setBusqueda}
            limpiarFiltros={limpiarFiltros}
            estadisticas={estadisticas}
            ejecutarAnalisis={ejecutarAnalisis}
            analisis={analisis}
            onUpload={procesarArchivo}
            onExportar={exportarExcel}
            onDetalle={setDetalle}
          />
        )}
      </section>

      {detalle && <DetalleModal detalle={detalle} onClose={() => setDetalle(null)} />}

      <style jsx global>{styles}</style>
    </main>
  );
}

function Workspace(props: any) {
  const {
    archivo, cargando, error, resultados, resultadosFiltrados,
    clientesDisponibles, materialesDisponibles, familiasDisponibles, condicionesDisponibles,
    clientes, materiales, familias, condiciones, busqueda,
    setClientes, setMateriales, setFamilias, setCondiciones, setBusqueda,
    limpiarFiltros, estadisticas, ejecutarAnalisis, analisis, onUpload, onExportar, onDetalle,
  } = props;

  return <>
    <header className="topHeader">
      <div><div className="eyebrow">ESPACIO DE TRABAJO</div><h1>Cargar y analizar Excel</h1><p className="topDescription">Cargá el archivo SAP, filtrá el universo y recién después ejecutá el análisis comercial.</p></div>
    </header>

    <section className="uploadBox compactUpload">
      <div className="uploadIcon">↑</div>
      <div className="uploadText"><h2>Cargar archivo mensual</h2><p>Se valida contra Nomenclador de Materiales y Condición Impositiva.</p></div>
      <input className="fileInput" type="file" accept=".xls,.xlsx" onChange={onUpload} />
      {archivo && <div className="uploadFileName">Archivo: <strong>{archivo}</strong></div>}
      {cargando && <div className="loading">⏳ Procesando...</div>}
    </section>
    {error && <div className="errorBox">❌ {error}</div>}

    {!!resultados.length && <>
      <section className="scopeBanner">
        <div><strong>Universo actual</strong><span>{resultadosFiltrados.length.toLocaleString("es-AR")} registros de {resultados.length.toLocaleString("es-AR")}</span></div>
        <button className="primaryButton analysisButton" onClick={ejecutarAnalisis} disabled={!resultadosFiltrados.length}>⚡ Realizar análisis</button>
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
        <div className="filtersTop"><div><div className="filtersTitle">🔎 Definí el universo a analizar</div><div className="filtersSubtitle">Podés seleccionar uno, varios o todos. Los filtros se combinan entre sí.</div></div><button className="clearButton" onClick={limpiarFiltros}>Limpiar filtros</button></div>
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

      {analisis && <CommercialAnalysis analisis={analisis} />}

      <section className="tablePanel">
        <div className="tablePanelHeader"><div><h3>Registros del universo seleccionado</h3><p>Los registros con ZPR incorrecta, cliente sin referencia o material sin nomenclador quedan fuera del análisis comercial.</p></div><button className="exportButton" onClick={onExportar}>↓ Descargar Excel</button></div>
        <div className="tableScroll"><table><thead><tr><th>Fila</th><th>Cliente</th><th>Material</th><th>Familia</th><th>Condición</th><th>Importe</th><th>PB00</th><th>Final</th><th>Análisis $</th><th>Estado</th><th></th></tr></thead>
          <tbody>{resultadosFiltrados.slice(0, 500).map((r: ResultadoValidacion) => <tr key={r.fila}><td>{r.fila}</td><td><strong>{r.razonSocial || r.cliente || "-"}</strong><small>SAP {r.cliente}</small></td><td>{r.material}</td><td>{r.familia || <span className="wrongCondition">Sin familia</span>}</td><td><strong>{r.condicionExcel || "-"}</strong>{r.condicionEsperada && r.condicionExcel !== r.condicionEsperada && <small className="wrongCondition">Base: {r.condicionEsperada}</small>}</td><td>{money(r.importe)}</td><td>{r.importePB00 ? money(r.importePB00) : "-"}</td><td><strong>{money(r.importeFinal)}</strong></td><td>{r.incluidoEnAnalisis ? <span className="estadoOk">✓ Sí</span> : <span className="estadoError">✕ No</span>}</td><td><span className={r.estado === "OK" ? "estadoOk" : r.estado === "ALERTA" ? "estadoAlerta" : "estadoError"}>● {r.estado}</span></td><td><button className="viewButton" onClick={() => onDetalle(r)}>Ver</button></td></tr>)}</tbody></table>{resultadosFiltrados.length > 500 && <div className="tableNote">Se muestran los primeros 500 registros en pantalla. El Excel descargado contiene todo el universo seleccionado.</div>}</div>
      </section>
    </>}
  </>;
}

function MultiSelect({ label, options, values, onChange, placeholder }: { label: string; options: string[]; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = options.filter(o => o.toUpperCase().includes(q.toUpperCase())).slice(0, 250);
  function toggle(value: string) { onChange(values.includes(value) ? values.filter(v => v !== value) : [...values, value]); }
  return <div className="multiWrap"><label className="filterLabel">{label}</label><button type="button" className="multiButton" onClick={() => setOpen(!open)}><span>{values.length ? `${values.length} seleccionado(s)` : placeholder}</span><span>⌄</span></button>{open && <div className="multiMenu"><input autoFocus className="multiSearch" value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar ${label.toLowerCase()}...`} /><div className="multiActions"><button onClick={() => onChange([...options])}>Seleccionar todos</button><button onClick={() => onChange([])}>Limpiar</button></div><div className="multiList">{filtered.map(o => <label key={o} className="checkItem"><input type="checkbox" checked={values.includes(o)} onChange={() => toggle(o)} /><span>{o}</span></label>)}{!filtered.length && <div className="emptySmall">Sin coincidencias</div>}</div></div>}</div>;
}

function CommercialAnalysis({ analisis }: { analisis: ResultadoComercial }) {
  const maxFamily = Math.max(...analisis.gruposFamilia.map(x => x.importeTotal), 1);
  return <section className="analysisPanel">
    <div className="analysisHeader"><div><div className="eyebrow">ANÁLISIS COMERCIAL</div><h2>Comparación del universo seleccionado</h2><p>El análisis usa únicamente registros validados y habilitados para comparación de precios.</p></div><div className="analysisKpis"><Kpi label="Registros" value={analisis.totalRegistros.toLocaleString("es-AR")} /><Kpi label="Clientes" value={String(analisis.clientes)} /><Kpi label="Familias" value={String(analisis.familias)} /><Kpi label="Importe" value={`$ ${money(analisis.importeTotal)}`} /></div></div>
    <div className="analysisGrid">
      <div className="panel"><div className="panelHeader"><div><h3>Importe por familia</h3><p>Participación económica dentro del universo seleccionado.</p></div></div>{analisis.gruposFamilia.length ? analisis.gruposFamilia.slice(0, 12).map(f => <div className="barRow" key={f.familia}><div className="barLabel"><strong>{f.familia}</strong><span>$ {money(f.importeTotal)} · prom. $ {money(f.promedio)}</span></div><div className="bar"><i style={{ width: `${Math.max(3, f.importeTotal / maxFamily * 100)}%` }} /></div></div>) : <div className="noResults">No hay familias válidas para analizar.</div>}</div>
      <div className="panel"><div className="panelHeader"><div><h3>Oportunidades</h3><p>Umbral actual: ±15% frente al promedio de los otros clientes del mismo material.</p></div></div>{analisis.oportunidades.length ? analisis.oportunidades.slice(0, 12).map((o, i) => <div className="opportunity" key={i}><div className={o.tipo === "PRECIO_ALTO" ? "oppTag high" : "oppTag low"}>{o.tipo === "PRECIO_ALTO" ? "PRECIO ALTO" : "PRECIO BAJO"}</div><div><strong>{o.razonSocial}</strong><span>{o.material} · {o.familia}</span><small>{pct(o.porcentaje)} vs referencia · $ {money(o.importe)} vs $ {money(o.referencia)}</small></div></div>) : <div className="noResults"><strong>No se detectaron oportunidades fuertes</strong>Con el universo seleccionado no aparecen diferencias superiores al ±15%.</div>}</div>
    </div>
    <div className="panel"><div className="panelHeader"><div><h3>Comparación por material y cliente</h3><p>Ranking de precios dentro del alcance seleccionado.</p></div></div><div className="tableScroll"><table><thead><tr><th>Familia</th><th>Material</th><th>Cliente</th><th>Promedio</th><th>Vs otros</th><th>Posición</th></tr></thead><tbody>{analisis.gruposMaterial.slice(0, 100).flatMap(g => g.clientes.map(c => <tr key={`${g.material}-${c.cliente}`}><td>{g.familia}</td><td><strong>{g.material}</strong><small>{g.descripcion}</small></td><td>{c.razonSocial}</td><td>$ {money(c.importePromedio)}</td><td className={c.porcentajeVsPromedioOtros >= 0 ? "estadoAlerta" : "estadoOk"}>{pct(c.porcentajeVsPromedioOtros)}</td><td>#{c.posicion}</td></tr>))}</tbody></table></div></div>
  </section>;
}

function Dashboard({ resultados, archivo, onCargar }: { resultados: ResultadoValidacion[]; archivo: string; onCargar: () => void }) {
  const importe = resultados.filter(r => r.incluidoEnAnalisis).reduce((s, r) => s + r.importeFinal, 0);
  const validos = resultados.filter(r => r.incluidoEnAnalisis).length;
  return <><header className="topHeader"><div><div className="eyebrow">GESTIÓN COMERCIAL</div><h1>Sistema de Precios SAP</h1><p className="topDescription">Validá datos SAP y compará precios por cliente, familia y material.</p></div><button className="primaryButton" onClick={onCargar}>↑ Cargar Excel</button></header><section className="hero"><div><div className="heroTag">ANÁLISIS DE PRECIOS</div><h2>Del Excel SAP a una lectura comercial.</h2><p>Cargá un archivo, definí el universo con múltiples filtros y obtené comparaciones de precios y oportunidades.</p><button className="heroButton" onClick={onCargar}>Comenzar →</button></div><div className="heroGraphic"><div className="graphicCard"><div className="miniHeader"><span>{archivo || "Sin archivo"}</span><span className="miniOk">● Activo</span></div><div className="miniNumber">{validos || "—"}</div><div className="miniLabel">registros válidos para análisis</div><div className="miniBars"><i /><i /><i /></div></div></div></section><section className="cardsGrid"><DashboardCard title="Registros" value={resultados.length.toLocaleString("es-AR")} subtitle="Último archivo cargado" /><DashboardCard title="Válidos para análisis" value={validos.toLocaleString("es-AR")} subtitle="Luego de validar ZPR y material" /><DashboardCard title="Clientes" value={String(new Set(resultados.map(r => r.cliente).filter(Boolean)).size)} subtitle="Identificados en el archivo" /><DashboardCard title="Importe válido" value={`$ ${money(importe)}`} subtitle="Suma de importes finales válidos" /></section></>;
}

function DashboardCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) { return <div className="dashCard"><div className="dashTitle">{title}</div><div className="dashValue">{value}</div><div className="dashSubtitle">{subtitle}</div></div>; }
function ResultCard({ label, value, money: isMoney = false }: { label: string; value: number; money?: boolean }) { return <div className="resultCard"><span>{label}</span><strong>{isMoney ? `$ ${money(value)}` : value.toLocaleString("es-AR")}</strong></div>; }
function Kpi({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function DetalleModal({ detalle, onClose }: { detalle: ResultadoValidacion; onClose: () => void }) { return <div className="modalOverlay" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}><div className="modalHeader"><div><div className="eyebrow">DETALLE DEL REGISTRO</div><h2>{detalle.razonSocial || detalle.cliente || "Registro"}</h2></div><button className="closeButton" onClick={onClose}>×</button></div><div className="detailGrid"><Detail label="Cliente" value={`${detalle.cliente} · ${detalle.razonSocial}`} /><Detail label="Material" value={detalle.material} /><Detail label="Familia" value={detalle.familia} /><Detail label="Descripción" value={detalle.descripcionMaterial} /><Detail label="Texto largo" value={detalle.textoLargoMaterial} /><Detail label="Condición Excel" value={detalle.condicionExcel} /><Detail label="Condición correcta" value={detalle.condicionEsperada} highlight={detalle.condicionCorrecta} /><Detail label="Condición utilizada" value={detalle.condicionAnalisis || "No utilizada"} /><Detail label="Importe" value={money(detalle.importe)} /><Detail label="PB00" value={detalle.importePB00 ? money(detalle.importePB00) : "Sin PB00"} /><Detail label="Importe final" value={money(detalle.importeFinal)} /><Detail label="Incluido en análisis" value={detalle.incluidoEnAnalisis ? "Sí" : "No"} /><Detail label="Estado" value={detalle.estado} /></div>{detalle.observaciones.length > 0 && <div className="alertDetail"><div className="alertTitle">⚠️ Observaciones</div>{detalle.observaciones.map((o, i) => <div className="observation" key={i}>{o}</div>)}</div>}</div></div>; }
function Detail({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) { return <div className={highlight ? "detailBox detailHighlight" : "detailBox"}><span>{label}</span><strong>{value || "-"}</strong></div>; }
function unique(values: string[]) { return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "es")); }

const styles = `
*{box-sizing:border-box}body{margin:0;background:#f4f6f9;color:#152238;font-family:Arial,Helvetica,sans-serif}button,input{font-family:inherit}button{cursor:pointer}.app{min-height:100vh;display:flex}.sidebar{width:250px;min-height:100vh;background:#101820;color:#fff;padding:26px 16px;display:flex;flex-direction:column;position:fixed;left:0;top:0;bottom:0}.brand{padding:4px 12px 30px;border-bottom:1px solid rgba(255,255,255,.08)}.brand img{width:145px;max-height:58px;object-fit:contain;object-position:left center;margin-bottom:18px}.brandTitle{font-size:14px;color:#b9c2ce;line-height:1.4}.brandTitle span{display:block;color:#fff;font-weight:700;font-size:17px;margin-top:2px}.menu{display:flex;flex-direction:column;gap:6px;margin-top:25px}.menuItem{border:0;background:transparent;color:#aeb8c5;padding:13px;border-radius:10px;display:flex;align-items:center;gap:12px;text-align:left;font-size:14px;transition:.2s}.menuItem span{width:22px;text-align:center;font-size:18px}.menuItem:hover{background:rgba(255,255,255,.06);color:#fff}.menuItem.active{background:#79d000;color:#101820;font-weight:700}.sidebarBottom{margin-top:auto;padding:15px 12px 4px}.systemStatus{font-size:11px;color:#8f9baa;display:flex;align-items:center;gap:8px}.statusDot{width:7px;height:7px;background:#79d000;border-radius:50%}.content{margin-left:250px;width:calc(100% - 250px);padding:42px 48px 60px;max-width:1750px}.topHeader,.uploadHeader{display:flex;align-items:center;justify-content:space-between;margin-bottom:25px}.eyebrow{font-size:11px;letter-spacing:1.7px;font-weight:700;color:#79a800;margin-bottom:7px}h1{margin:0;font-size:34px;letter-spacing:-1px}h2{margin:0}.topDescription{margin:8px 0 0;color:#697586;font-size:14px}.primaryButton,.heroButton,.secondaryButton{border:0;border-radius:9px;font-weight:700;transition:.2s}.primaryButton{background:#79d000;color:#101820;padding:13px 20px;display:flex;align-items:center;gap:9px;box-shadow:0 5px 15px rgba(121,208,0,.18)}.primaryButton:hover,.heroButton:hover{transform:translateY(-1px)}.primaryButton:disabled{opacity:.45;cursor:not-allowed}.hero{min-height:290px;border-radius:18px;background:linear-gradient(120deg,#17232f,#253746);color:#fff;padding:38px 45px;display:flex;justify-content:space-between;align-items:center;overflow:hidden;position:relative;margin-bottom:25px}.heroTag{color:#8dd817;font-size:10px;font-weight:800;letter-spacing:2px;margin-bottom:13px}.hero h2{font-size:30px;line-height:1.15}.hero p{color:#b9c4ce;max-width:570px;line-height:1.6;font-size:14px;margin:16px 0 22px}.heroButton{background:#79d000;color:#101820;padding:12px 18px}.heroGraphic{width:360px;height:230px;position:relative;margin-right:25px}.graphicCard{position:absolute;width:260px;background:rgba(255,255,255,.96);color:#152238;border-radius:13px;padding:17px;top:35px;left:20px;box-shadow:0 20px 45px rgba(0,0,0,.22)}.miniHeader{display:flex;justify-content:space-between;font-size:10px;color:#687687;gap:10px}.miniOk{color:#5f9e00;font-weight:700}.miniNumber{font-size:30px;font-weight:800;margin-top:17px}.miniLabel{color:#8993a0;font-size:10px}.miniBars{display:flex;gap:4px;height:5px;margin-top:16px;background:#edf0f3;border-radius:4px;overflow:hidden}.miniBars i{height:100%;background:#79d000;display:block;flex:1}.cardsGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:25px}.dashCard,.panel,.resultCard,.filtersPanel,.tablePanel,.analysisPanel{background:#fff;border:1px solid #e4e8ed;border-radius:14px}.dashCard{padding:20px}.dashTitle{font-size:12px;color:#7b8796}.dashValue{font-size:27px;font-weight:800;margin:7px 0}.dashSubtitle{color:#9aa4af;font-size:10px}.compactUpload{display:flex;align-items:center;gap:20px}.uploadBox{background:#fff;border:2px dashed #d7dee6;border-radius:16px;padding:22px 28px;text-align:left;margin-bottom:15px}.uploadIcon{width:50px;height:50px;border-radius:13px;background:#eef7e5;color:#62a600;display:flex;align-items:center;justify-content:center;font-size:23px;font-weight:800;flex:none}.uploadText{flex:1}.uploadText h2{font-size:19px;margin:0 0 5px}.uploadText p{color:#8994a1;font-size:12px;margin:0}.fileInput{border:1px solid #dce2e8;padding:9px;border-radius:8px;background:#fff}.uploadFileName{font-size:12px;color:#5f6d7d}.loading{color:#679e00;font-weight:700;font-size:12px}.errorBox{margin:10px 0 15px;background:#fff0f0;color:#c53030;border-radius:8px;padding:12px;font-size:12px}.scopeBanner{background:#17232f;color:#fff;border-radius:14px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin:18px 0}.scopeBanner strong{display:block;font-size:15px}.scopeBanner span{font-size:11px;color:#b9c4ce;display:block;margin-top:4px}.analysisButton{box-shadow:none}.resultsHeader{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:18px}.resultCard{padding:15px}.resultCard span{color:#8994a1;font-size:9px;letter-spacing:.5px}.resultCard strong{display:block;margin-top:5px;font-size:18px}.filtersPanel{padding:20px;margin-bottom:18px}.filtersTop{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.filtersTitle{font-size:14px;font-weight:800}.filtersSubtitle{color:#8d98a5;font-size:10px;margin-top:4px}.clearButton{border:1px solid #dce2e8;background:#fff;color:#596777;padding:8px 12px;border-radius:8px;font-size:11px}.filterGridMulti{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.filterLabel{display:block;font-size:9px;color:#8b96a3;margin-bottom:5px;font-weight:700}.multiWrap{position:relative}.multiButton{width:100%;height:40px;border:1px solid #d8dee5;border-radius:8px;background:#fff;padding:0 11px;color:#263447;font-size:11px;display:flex;justify-content:space-between;align-items:center;text-align:left}.multiMenu{position:absolute;z-index:50;top:61px;left:0;width:100%;min-width:250px;background:#fff;border:1px solid #d8dee5;border-radius:10px;box-shadow:0 15px 40px rgba(15,24,32,.15);padding:10px}.multiSearch{width:100%;height:34px;border:1px solid #d8dee5;border-radius:7px;padding:0 9px;font-size:11px}.multiActions{display:flex;justify-content:space-between;padding:8px 0}.multiActions button{border:0;background:transparent;color:#5d9700;font-size:10px;font-weight:700}.multiList{max-height:260px;overflow:auto}.checkItem{display:flex;align-items:center;gap:8px;padding:7px 5px;font-size:10px;border-radius:6px}.checkItem:hover{background:#f5f8f2}.checkItem input{accent-color:#79d000}.emptySmall{padding:15px;text-align:center;color:#8994a1;font-size:10px}.searchRow{margin-top:13px}.searchBox{width:100%;height:40px;border:1px solid #d8dee5;border-radius:8px;padding:0 11px;color:#263447;font-size:11px;outline:none}.searchBox:focus{border-color:#79d000;box-shadow:0 0 0 3px rgba(121,208,0,.1)}.selectionSummary{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.selectionSummary span{font-size:9px;background:#f0f6e9;color:#527e11;padding:6px 9px;border-radius:999px}.validationStrip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}.validationStrip>div{background:#fff;border:1px solid #e4e8ed;border-radius:10px;padding:13px}.validationStrip strong,.validationStrip span{display:block}.validationStrip strong{font-size:10px}.validationStrip span{font-size:11px;color:#7b8796;margin-top:4px}.tablePanel{padding:20px;overflow:hidden}.tablePanelHeader,.analysisHeader{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}.tablePanelHeader h3,.panelHeader h3{margin:0;font-size:16px}.tablePanelHeader p,.panelHeader p{margin:5px 0 0;color:#929ca8;font-size:10px}.exportButton{border:0;background:#101820;color:#fff;padding:10px 14px;border-radius:8px;font-size:11px;font-weight:700}.tableScroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:10px}th{text-align:left;padding:10px;color:#687687;border-bottom:2px solid #e5e9ed;white-space:nowrap;background:#fafbfc}td{padding:10px;border-bottom:1px solid #eef1f4;white-space:nowrap;vertical-align:middle}td small{display:block;color:#929ca8;font-size:8px;margin-top:3px}tbody tr:hover{background:#fafcf8}.estadoOk{color:#5d9800;font-weight:700}.estadoAlerta{color:#d28b00;font-weight:700}.estadoError,.wrongCondition{color:#d12e2e;font-weight:700}.viewButton{border:1px solid #dce2e8;background:#fff;color:#526172;padding:6px 9px;border-radius:6px;font-size:9px}.tableNote{padding:12px;background:#fafbfc;color:#8994a1;font-size:10px}.analysisPanel{margin:18px 0;padding:20px}.analysisHeader{align-items:center}.analysisHeader h2{font-size:21px}.analysisHeader p{color:#7b8796;font-size:11px}.analysisKpis{display:flex;gap:9px}.analysisKpis>div{background:#f7f9fb;border:1px solid #e7ebef;border-radius:9px;padding:10px 13px;min-width:85px}.analysisKpis span{display:block;color:#8994a1;font-size:8px}.analysisKpis strong{display:block;margin-top:4px;font-size:12px}.analysisGrid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px}.panel{padding:18px}.panelHeader{display:flex;justify-content:space-between;margin-bottom:18px}.barRow{margin:12px 0}.barLabel{display:flex;justify-content:space-between;gap:15px;font-size:9px;margin-bottom:5px}.barLabel span{color:#8994a1}.bar{height:7px;background:#edf0f3;border-radius:5px;overflow:hidden}.bar i{height:100%;display:block;background:#79d000;border-radius:5px}.opportunity{display:flex;gap:10px;padding:11px 0;border-bottom:1px solid #eef1f4}.oppTag{font-size:8px;font-weight:800;padding:5px 6px;border-radius:5px;height:max-content}.oppTag.high{background:#fff0f0;color:#c73535}.oppTag.low{background:#eef8e7;color:#579000}.opportunity strong,.opportunity span,.opportunity small{display:block}.opportunity strong{font-size:10px}.opportunity span{font-size:9px;color:#687687;margin-top:3px}.opportunity small{font-size:8px;color:#929ca8;margin-top:4px}.noResults{text-align:center;padding:25px;color:#8994a1;font-size:10px}.noResults strong{display:block;color:#536171;margin-bottom:5px}.modalOverlay{position:fixed;inset:0;background:rgba(15,24,32,.6);display:flex;align-items:center;justify-content:center;z-index:1000;padding:25px}.modal{width:min(950px,100%);max-height:90vh;overflow-y:auto;background:#fff;border-radius:18px;padding:28px;box-shadow:0 30px 80px rgba(0,0,0,.25)}.modalHeader{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.modalHeader h2{font-size:23px}.closeButton{width:34px;height:34px;border:0;border-radius:8px;background:#f1f3f5;color:#5c6977;font-size:23px}.detailGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.detailBox{border:1px solid #e7ebef;border-radius:10px;padding:12px}.detailBox span{display:block;color:#8c97a3;font-size:8px;margin-bottom:5px;text-transform:uppercase}.detailBox strong{font-size:11px;white-space:normal}.detailHighlight{background:#eef8e7;border-color:#cce5b3}.alertDetail{margin-top:16px;padding:16px;background:#fffaf0;border:1px solid #f2dfb2;border-radius:12px}.alertTitle{font-size:12px;font-weight:800;color:#b87900;margin-bottom:10px}.observation{font-size:10px;color:#687687;margin:5px 0}@media(max-width:1200px){.filterGridMulti{grid-template-columns:repeat(2,1fr)}.resultsHeader{grid-template-columns:repeat(3,1fr)}.analysisHeader{display:block}.analysisKpis{margin-top:15px}}@media(max-width:900px){.sidebar{width:75px;padding:20px 8px}.brandTitle{display:none}.brand img{width:50px}.menuItem{font-size:0}.menuItem span{font-size:18px}.content{margin-left:75px;width:calc(100% - 75px);padding:25px}.cardsGrid{grid-template-columns:repeat(2,1fr)}.analysisGrid{grid-template-columns:1fr}.heroGraphic{display:none}.filterGridMulti{grid-template-columns:1fr}.validationStrip{grid-template-columns:1fr}.compactUpload{display:grid;grid-template-columns:auto 1fr}.fileInput{grid-column:1/-1;width:100%}}@media(max-width:600px){.content{padding:18px}.resultsHeader{grid-template-columns:repeat(2,1fr)}.cardsGrid{grid-template-columns:1fr}.scopeBanner{display:block}.scopeBanner button{margin-top:12px}.detailGrid{grid-template-columns:1fr}.analysisKpis{display:grid;grid-template-columns:1fr 1fr}.topHeader{display:block}.topHeader .primaryButton{margin-top:15px}}
`;
