"use client";

import { useState } from "react";
import { writeFile, utils } from "xlsx";

import { leerExcel } from "../lib/excel";

import {
  validarExcel,
  ResultadoValidacion,
} from "../lib/validador";

import {
  analizarResultados,
  ResumenAnalisis,
} from "../lib/analisis";

type Vista = "inicio" | "cargar" | "consulta";

export default function Home() {
  const [vista, setVista] =
    useState<Vista>("inicio");
  const [vistaConsulta, setVistaConsulta] =
  useState(false);

  const [archivo, setArchivo] =
    useState("");

  const [cargando, setCargando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [resumen, setResumen] =
    useState<ResumenAnalisis | null>(null);

  const [busqueda, setBusqueda] =
    useState("");

  const [filtroCliente, setFiltroCliente] =
    useState("");

  const [filtroMaterial, setFiltroMaterial] =
    useState("");

  const [filtroCondicion, setFiltroCondicion] =
    useState("");

  const [filtroEstado, setFiltroEstado] =
    useState("");

  const [filtroPB00, setFiltroPB00] =
    useState("");

  const [detalle, setDetalle] =
    useState<ResultadoValidacion | null>(null);


  async function procesarArchivo(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setArchivo(file.name);
    setCargando(true);
    setError("");
    setResumen(null);

    limpiarFiltros();

    try {
      const buffer =
        await file.arrayBuffer();

      const filas =
        leerExcel(buffer);

      if (!filas.length) {
        throw new Error(
          "El Excel no contiene registros."
        );
      }

      const resultados =
        validarExcel(filas);

      const analisis =
        analizarResultados(resultados);

      setResumen(analisis);

    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo procesar el Excel."
      );

    } finally {
      setCargando(false);
    }
  }


  function limpiarFiltros() {
    setBusqueda("");
    setFiltroCliente("");
    setFiltroMaterial("");
    setFiltroCondicion("");
    setFiltroEstado("");
    setFiltroPB00("");
  }


  const resultados =
    resumen?.resultados || [];


  /*
   * OPCIONES PARA LOS FILTROS
   */

  const clientesDisponibles =
    Array.from(
      new Set(
        resultados
          .map((r) => r.razonSocial)
          .filter(Boolean)
      )
    ).sort();

  const materialesDisponibles =
    Array.from(
      new Set(
        resultados
          .map((r) => r.material)
          .filter(Boolean)
      )
    ).sort();

  const condicionesDisponibles =
    Array.from(
      new Set(
        resultados
          .map((r) => r.condicionExcel)
          .filter(Boolean)
      )
    ).sort();


  /*
   * FILTRADO EN VIVO
   */

  const resultadosFiltrados =
    resultados.filter((r) => {

      const textoBusqueda =
        busqueda
          .trim()
          .toUpperCase();

      const coincideBusqueda =
        !textoBusqueda ||
        [
          r.cliente,
          r.razonSocial,
          r.material,
          r.descripcionMaterial,
          r.condicionExcel,
          r.condicionEsperada,
          r.estado,
        ]
          .join(" ")
          .toUpperCase()
          .includes(textoBusqueda);


      const coincideCliente =
        !filtroCliente ||
        r.razonSocial ===
          filtroCliente;


      const coincideMaterial =
        !filtroMaterial ||
        r.material ===
          filtroMaterial;


      const coincideCondicion =
        !filtroCondicion ||
        r.condicionExcel ===
          filtroCondicion;


      const coincideEstado =
        !filtroEstado ||
        r.estado ===
          filtroEstado;


      const coincidePB00 =
        !filtroPB00 ||
        (
          filtroPB00 === "SI"
            ? r.tienePB00
            : !r.tienePB00
        );


      return (
        coincideBusqueda &&
        coincideCliente &&
        coincideMaterial &&
        coincideCondicion &&
        coincideEstado &&
        coincidePB00
      );
    });


  /*
   * INDICADORES
   */

  const totalZPR0 =
    resultadosFiltrados.filter(
      (r) =>
        r.condicionExcel ===
        "ZPR0"
    ).length;

  const totalZPR2 =
    resultadosFiltrados.filter(
      (r) =>
        r.condicionExcel ===
        "ZPR2"
    ).length;

  const errores =
    resultadosFiltrados.filter(
      (r) =>
        r.estado === "ERROR"
    ).length;

  const alertas =
    resultadosFiltrados.filter(
      (r) =>
        r.estado === "ALERTA"
    ).length;

  const ok =
    resultadosFiltrados.filter(
      (r) =>
        r.estado === "OK"
    ).length;

  const importeTotal =
    resultadosFiltrados.reduce(
      (total, r) =>
        total +
        r.importeFinal,
      0
    );


  /*
   * EXPORTAR RESULTADOS FILTRADOS
   */

  function exportarExcel() {

    if (!resultadosFiltrados.length) {
      return;
    }

    const datos =
      resultadosFiltrados.map(
        (r) => ({
          Fila: r.fila,
          Cliente: r.cliente,
          "Razón social":
            r.razonSocial,
          Material: r.material,
          Descripción:
            r.descripcionMaterial,
          "Condición Excel":
            r.condicionExcel,
          "Condición correcta":
            r.condicionEsperada,
          Importe: r.importe,
          PB00: r.importePB00,
          "Importe final":
            r.importeFinal,
          Moneda: r.moneda,
          Cantidad: r.cantidad,
          Por: r.por,
          UM: r.unidadMedida,
          Estado: r.estado,
          Observaciones:
            r.observaciones.join(
              " "
            ),
        })
      );


    const hoja =
      utils.json_to_sheet(datos);

    const libro =
      utils.book_new();

    utils.book_append_sheet(
      libro,
      hoja,
      "Resultados"
    );

    writeFile(
      libro,
      "analisis-precios-sap.xlsx"
    );
  }


  /*
   * DATOS GENERALES
   */

  const totalRegistros =
    resultados.length;

  const clientes =
    new Set(
      resultados
        .map((r) => r.cliente)
        .filter(Boolean)
    ).size;

  const materiales =
    new Set(
      resultados
        .map((r) => r.material)
        .filter(Boolean)
    ).size;


  return (
    <main className="app">

      {/* =========================
          SIDEBAR
      ========================== */}

      <aside className="sidebar">

        <div className="brand">

          <img
            src="/logo-addoc.png"
            alt="ADDOC"
          />

          <div className="brandTitle">
            Sistema de Precios

            <span>
              SAP
            </span>
          </div>

        </div>


        <nav className="menu">

          <button
            className={
              vista === "inicio"
                ? "menuItem active"
                : "menuItem"
            }
            onClick={() =>
              setVista("inicio")
            }
          >
            <span>⌂</span>
            Inicio
          </button>


          <button
            className={
              vista === "cargar"
                ? "menuItem active"
                : "menuItem"
            }
            onClick={() =>
              setVista("cargar")
            }
          >
            <span>↑</span>
            Cargar Excel
          </button>


          <button className="menuItem disabled">
            <span>♙</span>
            Clientes
            <small>
              Próximamente
            </small>
          </button>


          <button className="menuItem disabled">
            <span>▣</span>
            Materiales
            <small>
              Próximamente
            </small>
          </button>


          <button className="menuItem disabled">
            <span>◈</span>
            Análisis
            <small>
              Próximamente
            </small>
          </button>


          <button className="menuItem disabled">
            <span>◷</span>
            Histórico
            <small>
              Próximamente
            </small>
          </button>

        </nav>


        <div className="sidebarBottom">

          <div className="systemStatus">
            <span className="statusDot"></span>
            Sistema operativo
          </div>

        </div>

      </aside>


      {/* =========================
          CONTENIDO
      ========================== */}

      <section className="content">

        {vista === "inicio" ? (

          <Dashboard
            resumen={resumen}
            clientes={clientes}
            materiales={materiales}
            ok={ok}
            alertas={alertas}
            errores={errores}
            importeTotal={importeTotal}
            onCargar={() =>
              setVista("cargar")
            }
          />

        ) : (

          <CargaExcel
            archivo={archivo}
            cargando={cargando}
            error={error}
            resumen={resumen}
            resultados={resultadosFiltrados}
            resultadosOriginales={resultados}
            clientesDisponibles={
              clientesDisponibles
            }
            materialesDisponibles={
              materialesDisponibles
            }
            condicionesDisponibles={
              condicionesDisponibles
            }
            busqueda={busqueda}
            filtroCliente={filtroCliente}
            filtroMaterial={filtroMaterial}
            filtroCondicion={filtroCondicion}
            filtroEstado={filtroEstado}
            filtroPB00={filtroPB00}
            totalZPR0={totalZPR0}
            totalZPR2={totalZPR2}
            ok={ok}
            alertas={alertas}
            errores={errores}
            importeTotal={importeTotal}
            onUpload={procesarArchivo}
            onInicio={() =>
              setVista("inicio")
            }
            onBusqueda={
              setBusqueda
            }
            onCliente={
              setFiltroCliente
            }
            onMaterial={
              setFiltroMaterial
            }
            onCondicion={
              setFiltroCondicion
            }
            onEstado={
              setFiltroEstado
            }
            onPB00={
              setFiltroPB00
            }
            onLimpiar={
              limpiarFiltros
            }
            onExportar={
              exportarExcel
            }
            onDetalle={
              setDetalle
            }
          />

        )}

      </section>


      {/* =========================
          MODAL DETALLE
      ========================== */}

      {detalle && (

        <div
          className="modalOverlay"
          onClick={() =>
            setDetalle(null)
          }
        >

          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modalHeader">

              <div>

                <div className="eyebrow">
                  DETALLE DEL REGISTRO
                </div>

                <h2>
                  {detalle.razonSocial ||
                    detalle.cliente ||
                    "Registro"}
                </h2>

              </div>

              <button
                className="closeButton"
                onClick={() =>
                  setDetalle(null)
                }
              >
                ×
              </button>

            </div>


            <div className="detailGrid">

              <Detail
                label="Cliente"
                value={
                  detalle.cliente
                }
              />

              <Detail
                label="Razón social"
                value={
                  detalle.razonSocial
                }
              />

              <Detail
                label="Material"
                value={
                  detalle.material
                }
              />

              <Detail
                label="Descripción"
                value={
                  detalle.descripcionMaterial
                }
              />

              <Detail
                label="Condición Excel"
                value={
                  detalle.condicionExcel
                }
              />

              <Detail
                label="Condición correcta"
                value={
                  detalle.condicionEsperada
                }
                highlight={
                  detalle.condicionExcel !==
                  detalle.condicionEsperada
                }
              />

              <Detail
                label="Importe"
                value={
                  detalle.importe.toLocaleString(
                    "es-AR",
                    {
                      minimumFractionDigits: 2,
                    }
                  )
                }
              />

              <Detail
                label="PB00"
                value={
                  detalle.importePB00
                    ? detalle.importePB00.toLocaleString(
                        "es-AR",
                        {
                          minimumFractionDigits: 2,
                        }
                      )
                    : "Sin PB00"
                }
              />

              <Detail
                label="Importe final"
                value={
                  detalle.importeFinal.toLocaleString(
                    "es-AR",
                    {
                      minimumFractionDigits: 2,
                    }
                  )
                }
              />

              <Detail
                label="Estado"
                value={
                  detalle.estado
                }
              />

            </div>


            {detalle.estado !==
              "OK" && (

              <div className="alertDetail">

                <div className="alertTitle">
                  ⚠️ Revisar registro
                </div>

                {detalle.condicionExcel !==
                  detalle.condicionEsperada &&
                  detalle.condicionEsperada && (

                  <div className="conditionComparison">

                    <div className="conditionWrong">
                      <span>
                        CONDICIÓN EN EXCEL
                      </span>

                      <strong>
                        {detalle.condicionExcel}
                      </strong>

                      <small>
                        ❌ No corresponde
                      </small>
                    </div>


                    <div className="arrow">
                      →
                    </div>


                    <div className="conditionCorrect">
                      <span>
                        CONDICIÓN CORRECTA
                      </span>

                      <strong>
                        {detalle.condicionEsperada}
                      </strong>

                      <small>
                        ✓ Según base maestra
                      </small>
                    </div>

                  </div>

                )}


                {detalle.observaciones.length >
                  0 && (

                  <div className="observations">

                    {detalle.observaciones.map(
                      (
                        observacion,
                        index
                      ) => (

                        <div
                          key={index}
                        >
                          {observacion}
                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            )}

          </div>

        </div>

      )}


      <style jsx global>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f4f6f9;
          color: #152238;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        button,
        input,
        select {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        .app {
          min-height: 100vh;
          display: flex;
        }


        /* SIDEBAR */

        .sidebar {
          width: 250px;
          min-height: 100vh;
          background: #101820;
          color: white;
          padding: 26px 16px;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
        }

        .brand {
          padding: 4px 12px 30px;
          border-bottom: 1px solid
            rgba(255,255,255,.08);
        }

        .brand img {
          width: 145px;
          max-height: 58px;
          object-fit: contain;
          object-position: left center;
          margin-bottom: 18px;
        }

        .brandTitle {
          font-size: 14px;
          color: #b9c2ce;
          line-height: 1.4;
        }

        .brandTitle span {
          display: block;
          color: white;
          font-weight: 700;
          font-size: 17px;
          margin-top: 2px;
        }

        .menu {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 25px;
        }

        .menuItem {
          border: 0;
          background: transparent;
          color: #aeb8c5;
          padding: 13px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          font-size: 14px;
          transition: .2s;
          position: relative;
        }

        .menuItem span {
          width: 22px;
          text-align: center;
          font-size: 18px;
        }

        .menuItem:hover {
          background: rgba(255,255,255,.06);
          color: white;
        }

        .menuItem.active {
          background: #79d000;
          color: #101820;
          font-weight: 700;
        }

        .menuItem.disabled {
          cursor: default;
          opacity: .75;
        }

        .menuItem small {
          margin-left: auto;
          font-size: 9px;
          color: #718091;
        }

        .sidebarBottom {
          margin-top: auto;
          padding: 15px 12px 4px;
        }

        .systemStatus {
          font-size: 11px;
          color: #8f9baa;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .statusDot {
          width: 7px;
          height: 7px;
          background: #79d000;
          border-radius: 50%;
          display: inline-block;
        }


        /* CONTENIDO */

        .content {
          margin-left: 250px;
          width: calc(100% - 250px);
          padding: 42px 48px 60px;
          max-width: 1700px;
        }

        .topHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
        }

        .eyebrow {
          font-size: 11px;
          letter-spacing: 1.7px;
          font-weight: 700;
          color: #79a800;
          margin-bottom: 7px;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          letter-spacing: -1px;
        }

        .topDescription {
          margin: 8px 0 0;
          color: #697586;
          font-size: 14px;
        }


        /* BOTONES */

        .primaryButton,
        .heroButton,
        .secondaryButton {
          border: 0;
          border-radius: 9px;
          font-weight: 700;
          transition: .2s;
        }

        .primaryButton {
          background: #79d000;
          color: #101820;
          padding: 13px 20px;
          display: flex;
          align-items: center;
          gap: 9px;
          box-shadow:
            0 5px 15px
            rgba(121,208,0,.18);
        }

        .primaryButton:hover,
        .heroButton:hover {
          transform: translateY(-1px);
        }


        /* HERO */

        .hero {
          min-height: 290px;
          border-radius: 18px;
          background:
            linear-gradient(
              120deg,
              #17232f,
              #253746
            );
          color: white;
          padding: 38px 45px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          overflow: hidden;
          position: relative;
          margin-bottom: 25px;
        }

        .heroTag {
          color: #8dd817;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 13px;
        }

        .hero h2 {
          margin: 0;
          font-size: 30px;
          line-height: 1.15;
        }

        .hero p {
          color: #b9c4ce;
          max-width: 570px;
          line-height: 1.6;
          font-size: 14px;
          margin: 16px 0 22px;
        }

        .heroButton {
          background: #79d000;
          color: #101820;
          padding: 12px 18px;
        }

        .heroGraphic {
          width: 360px;
          height: 230px;
          position: relative;
          margin-right: 25px;
        }

        .graphicCircle {
          position: absolute;
          border-radius: 50%;
          border: 1px solid
            rgba(121,208,0,.25);
        }

        .circle1 {
          width: 220px;
          height: 220px;
          right: 25px;
          top: 0;
        }

        .circle2 {
          width: 150px;
          height: 150px;
          right: 60px;
          top: 35px;
          border-color:
            rgba(255,255,255,.1);
        }

        .graphicCard {
          position: absolute;
          width: 230px;
          background: rgba(255,255,255,.96);
          color: #152238;
          border-radius: 13px;
          padding: 17px;
          top: 35px;
          left: 20px;
          box-shadow:
            0 20px 45px
            rgba(0,0,0,.22);
        }

        .miniHeader {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #687687;
        }

        .miniOk {
          color: #5f9e00;
          font-weight: 700;
        }

        .miniNumber {
          font-size: 30px;
          font-weight: 800;
          margin-top: 17px;
        }

        .miniLabel {
          color: #8993a0;
          font-size: 10px;
        }

        .miniBars {
          display: flex;
          gap: 4px;
          height: 5px;
          margin-top: 16px;
          background: #edf0f3;
          border-radius: 4px;
          overflow: hidden;
        }

        .miniBars div {
          height: 100%;
          background: #79d000;
        }


        /* CARDS */

        .cardsGrid {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 25px;
        }

        .dashCard {
          background: white;
          border: 1px solid #e4e8ed;
          border-radius: 14px;
          padding: 20px;
        }

        .dashIcon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #f0f7e8;
          color: #5d9700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          margin-bottom: 17px;
        }

        .dashTitle {
          font-size: 12px;
          color: #7b8796;
        }

        .dashValue {
          font-size: 27px;
          font-weight: 800;
          margin: 5px 0;
        }

        .dashSubtitle {
          color: #9aa4af;
          font-size: 10px;
        }

        .warningCard .dashIcon {
          background: #fff6df;
          color: #d59400;
        }


        /* PANELS */

        .dashboardGrid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .panel {
          background: white;
          border: 1px solid #e4e8ed;
          border-radius: 14px;
          padding: 24px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
        }

        .panelHeader h3 {
          margin: 0;
          font-size: 16px;
        }

        .panelHeader p {
          margin: 5px 0 0;
          font-size: 11px;
          color: #929ca8;
        }

        .conditionChart {
          display: flex;
          align-items: center;
          gap: 45px;
          min-height: 145px;
        }

        .donut {
          width: 145px;
          height: 145px;
          border-radius: 50%;
          background:
            conic-gradient(
              #79d000 0 63%,
              #dce4eb 63% 100%
            );
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .donutInner {
          width: 105px;
          height: 105px;
          background: white;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .donutInner strong {
          font-size: 22px;
        }

        .donutInner span {
          color: #929ca8;
          font-size: 9px;
          margin-top: 3px;
        }

        .legend {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .legendItem {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .legendItem strong {
          display: block;
          font-size: 12px;
        }

        .legendItem div span {
          display: block;
          color: #929ca8;
          font-size: 10px;
          margin-top: 3px;
        }

        .legendDot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: block;
        }

        .dotOne {
          background: #79d000;
        }

        .dotTwo {
          background: #cdd7e0;
        }

        .statusChart {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .statusRowHeader {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 11px;
        }

        .statusLabel {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .statusSymbol {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #eef6e5;
          color: #66a500;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: 800;
          font-size: 10px;
        }

        .progress {
          height: 7px;
          border-radius: 5px;
          background: #edf0f3;
          overflow: hidden;
        }

        .progressFill {
          height: 100%;
          background: #79d000;
          border-radius: 5px;
        }


        /* BOTTOM */

        .bottomGrid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 18px;
        }

        .economicPanel,
        .quickPanel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 150px;
        }

        .panelLabel {
          font-size: 9px;
          letter-spacing: 1.4px;
          color: #8b96a3;
          font-weight: 800;
        }

        .economicValue {
          font-size: 29px;
          font-weight: 800;
          margin: 8px 0 4px;
        }

        .economicCurrency {
          color: #929ca8;
          font-size: 10px;
        }

        .economicIcon {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #eef7e5;
          color: #65a900;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 26px;
          font-weight: 800;
        }

        .quickPanel h3 {
          margin: 7px 0 5px;
          font-size: 17px;
        }

        .quickPanel p {
          margin: 0;
          color: #87919d;
          font-size: 11px;
          max-width: 380px;
          line-height: 1.5;
        }

        .secondaryButton {
          background: #eef6e5;
          color: #528800;
          padding: 11px 15px;
        }


        /* CARGAR EXCEL */

        .uploadHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 25px;
        }

        .backButton {
          border: 1px solid #dce2e8;
          background: white;
          padding: 10px 15px;
          border-radius: 8px;
          color: #536171;
        }

        .uploadBox {
          background: white;
          border: 2px dashed #d7dee6;
          border-radius: 16px;
          padding: 35px;
          text-align: center;
          margin-bottom: 20px;
        }

        .uploadIcon {
          width: 50px;
          height: 50px;
          margin: auto;
          border-radius: 13px;
          background: #eef7e5;
          color: #62a600;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
          font-weight: 800;
        }

        .uploadBox h2 {
          margin: 14px 0 6px;
          font-size: 19px;
        }

        .uploadBox p {
          color: #8994a1;
          font-size: 12px;
          margin-bottom: 18px;
        }

        .fileInput {
          border: 1px solid #dce2e8;
          padding: 9px;
          border-radius: 8px;
          background: white;
        }

        .uploadFileName {
          margin-top: 13px;
          font-size: 12px;
          color: #5f6d7d;
        }

        .loading {
          color: #679e00;
          font-weight: 700;
        }

        .errorBox {
          margin-top: 15px;
          background: #fff0f0;
          color: #c53030;
          border-radius: 8px;
          padding: 12px;
          font-size: 12px;
        }


        /* RESULTADOS */

        .resultsHeader {
          display: grid;
          grid-template-columns:
            repeat(6, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        .resultCard {
          background: white;
          border: 1px solid #e4e8ed;
          border-radius: 12px;
          padding: 15px;
        }

        .resultCard span {
          color: #8994a1;
          font-size: 9px;
          letter-spacing: .5px;
        }

        .resultCard strong {
          display: block;
          margin-top: 5px;
          font-size: 21px;
        }


        /* FILTROS */

        .filtersPanel {
          background: white;
          border: 1px solid #e4e8ed;
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 18px;
        }

        .filtersTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .filtersTitle {
          font-size: 14px;
          font-weight: 800;
        }

        .filtersSubtitle {
          color: #8d98a5;
          font-size: 10px;
          margin-top: 4px;
        }

        .clearButton {
          border: 1px solid #dce2e8;
          background: white;
          color: #596777;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 11px;
        }

        .filterGrid {
          display: grid;
          grid-template-columns:
            2fr 1fr 1fr 1fr 1fr 1fr;
          gap: 10px;
        }

        .searchBox,
        .filterSelect {
          width: 100%;
          height: 40px;
          border: 1px solid #d8dee5;
          border-radius: 8px;
          background: white;
          padding: 0 11px;
          color: #263447;
          font-size: 11px;
          outline: none;
        }

        .searchBox:focus,
        .filterSelect:focus {
          border-color: #79d000;
          box-shadow:
            0 0 0 3px
            rgba(121,208,0,.10);
        }

        .filterLabel {
          display: block;
          font-size: 9px;
          color: #8b96a3;
          margin-bottom: 5px;
          font-weight: 700;
        }


        /* TABLA */

        .tablePanel {
          background: white;
          border: 1px solid #e4e8ed;
          border-radius: 14px;
          padding: 20px;
          overflow: hidden;
        }

        .tablePanelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .tablePanelHeader h3 {
          margin: 0;
          font-size: 16px;
        }

        .tablePanelHeader p {
          margin: 5px 0 0;
          color: #929ca8;
          font-size: 10px;
        }

        .exportButton {
          border: 0;
          background: #101820;
          color: white;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
        }

        .exportButton:hover {
          background: #253746;
        }

        .tableScroll {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        th {
          text-align: left;
          padding: 11px 9px;
          color: #687687;
          border-bottom: 2px solid #e5e9ed;
          white-space: nowrap;
          background: #fafbfc;
        }

        td {
          padding: 11px 9px;
          border-bottom: 1px solid #eef1f4;
          white-space: nowrap;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #fafcf8;
        }

        .estadoOk {
          color: #5d9800;
          font-weight: 700;
        }

        .estadoAlerta {
          color: #d28b00;
          font-weight: 700;
        }

        .estadoError {
          color: #d12e2e;
          font-weight: 700;
        }

        .correctCondition {
          color: #579000;
          font-weight: 800;
        }

        .wrongCondition {
          color: #c73535;
          font-weight: 800;
        }

        .viewButton {
          border: 1px solid #dce2e8;
          background: white;
          color: #526172;
          padding: 6px 9px;
          border-radius: 6px;
          font-size: 10px;
        }

        .viewButton:hover {
          border-color: #79d000;
          color: #579000;
        }

        .noResults {
          text-align: center;
          padding: 45px 20px;
          color: #8994a1;
        }

        .noResults strong {
          display: block;
          color: #536171;
          margin-bottom: 5px;
        }


        /* MODAL */

        .modalOverlay {
          position: fixed;
          inset: 0;
          background:
            rgba(15,24,32,.60);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 25px;
        }

        .modal {
          width: min(850px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 18px;
          padding: 28px;
          box-shadow:
            0 30px 80px
            rgba(0,0,0,.25);
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
        }

        .modalHeader h2 {
          margin: 0;
          font-size: 23px;
        }

        .closeButton {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 8px;
          background: #f1f3f5;
          color: #5c6977;
          font-size: 23px;
        }

        .detailGrid {
          display: grid;
          grid-template-columns:
            repeat(2, 1fr);
          gap: 12px;
        }

        .detailBox {
          border: 1px solid #e7ebef;
          border-radius: 10px;
          padding: 13px;
        }

        .detailBox span {
          display: block;
          color: #8c97a3;
          font-size: 9px;
          margin-bottom: 5px;
          text-transform: uppercase;
        }

        .detailBox strong {
          font-size: 13px;
        }

        .detailHighlight {
          background: #eef8e7;
          border-color: #cce5b3;
        }

        .alertDetail {
          margin-top: 18px;
          padding: 18px;
          background: #fffaf0;
          border: 1px solid #f2dfb2;
          border-radius: 12px;
        }

        .alertTitle {
          font-size: 13px;
          font-weight: 800;
          color: #b87900;
          margin-bottom: 15px;
        }

        .conditionComparison {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .conditionWrong,
        .conditionCorrect {
          flex: 1;
          padding: 15px;
          border-radius: 10px;
        }

        .conditionWrong {
          background: #fff0f0;
          border: 1px solid #f2cccc;
        }

        .conditionCorrect {
          background: #eef8e7;
          border: 1px solid #cde4b5;
        }

        .conditionWrong span,
        .conditionCorrect span {
          display: block;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .8px;
          margin-bottom: 7px;
        }

        .conditionWrong span {
          color: #ba3b3b;
        }

        .conditionCorrect span {
          color: #5c9600;
        }

        .conditionWrong strong,
        .conditionCorrect strong {
          display: block;
          font-size: 22px;
        }

        .conditionWrong strong {
          color: #c73535;
        }

        .conditionCorrect strong {
          color: #579000;
        }

        .conditionWrong small,
        .conditionCorrect small {
          display: block;
          margin-top: 5px;
          font-size: 9px;
        }

        .arrow {
          font-size: 22px;
          color: #8994a1;
        }

        .observations {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #687687;
          font-size: 10px;
        }


        /* RESPONSIVE */

        @media (max-width: 1200px) {

          .filterGrid {
            grid-template-columns:
              repeat(3, 1fr);
          }

          .resultsHeader {
            grid-template-columns:
              repeat(3, 1fr);
          }

        }


        @media (max-width: 1000px) {

          .sidebar {
            width: 210px;
          }

          .content {
            margin-left: 210px;
            width: calc(100% - 210px);
            padding: 30px;
          }

          .cardsGrid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .heroGraphic {
            display: none;
          }

          .dashboardGrid,
          .bottomGrid {
            grid-template-columns: 1fr;
          }

        }


        @media (max-width: 700px) {

          .sidebar {
            width: 70px;
            padding: 20px 8px;
          }

          .brandTitle,
          .menuItem:not(.active) small,
          .menuItem {
            font-size: 0;
          }

          .menuItem span {
            font-size: 18px;
          }

          .brand img {
            width: 50px;
          }

          .content {
            margin-left: 70px;
            width: calc(100% - 70px);
            padding: 20px;
          }

          .filterGrid {
            grid-template-columns: 1fr;
          }

          .resultsHeader {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .detailGrid {
            grid-template-columns: 1fr;
          }

          .conditionComparison {
            flex-direction: column;
          }

          .arrow {
            transform: rotate(90deg);
          }

        }

      `}</style>

    </main>
  );
}


/* =====================================
   DASHBOARD
===================================== */

function Dashboard({
  resumen,
  clientes,
  materiales,
  ok,
  alertas,
  errores,
  importeTotal,
  onCargar,
}: {
  resumen: ResumenAnalisis | null;
  clientes: number;
  materiales: number;
  ok: number;
  alertas: number;
  errores: number;
  importeTotal: number;
  onCargar: () => void;
}) {

  const total =
    resumen?.totalFilas || 0;

  return (
    <>

      <header className="topHeader">

        <div>

          <div className="eyebrow">
            GESTIÓN Y CONTROL
          </div>

          <h1>
            Dashboard
          </h1>

          <p className="topDescription">
            Control centralizado de precios,
            condiciones y materiales SAP.
          </p>

        </div>


        <button
          className="primaryButton"
          onClick={onCargar}
        >
          ↑ Cargar Excel
        </button>

      </header>


      <section className="hero">

        <div>

          <div className="heroTag">
            SISTEMA DE PRECIOS SAP
          </div>

          <h2>
            Toda la información de precios
            <br />
            en un solo lugar.
          </h2>

          <p>
            Validá tus archivos mensuales,
            detectá inconsistencias y
            analizá clientes y materiales.
          </p>

          <button
            className="heroButton"
            onClick={onCargar}
          >
            Comenzar análisis →
          </button>

        </div>


        <div className="heroGraphic">

          <div className="graphicCircle circle1"></div>

          <div className="graphicCircle circle2"></div>

          <div className="graphicCard">

            <div className="miniHeader">
              <span>
                Estado general
              </span>

              <span className="miniOk">
                ● Activo
              </span>
            </div>

            <div className="miniNumber">
              {total || "—"}
            </div>

            <div className="miniLabel">
              registros analizados
            </div>

            <div className="miniBars">

              <div
                style={{
                  width:
                    total
                      ? `${(ok / total) * 100}%`
                      : "15%",
                }}
              />

              <div
                style={{
                  width:
                    total
                      ? `${(alertas / total) * 100}%`
                      : "8%",
                }}
              />

              <div
                style={{
                  width:
                    total
                      ? `${(errores / total) * 100}%`
                      : "4%",
                }}
              />

            </div>

          </div>

        </div>

      </section>


      <section className="cardsGrid">

        <DashboardCard
          icon="◎"
          title="Registros"
          value={
            total
              ? total.toLocaleString(
                  "es-AR"
                )
              : "—"
          }
          subtitle={
            resumen
              ? "Último archivo cargado"
              : "Sin archivo cargado"
          }
        />

        <DashboardCard
          icon="♙"
          title="Clientes"
          value={
            resumen
              ? clientes.toLocaleString(
                  "es-AR"
                )
              : "—"
          }
          subtitle="Clientes identificados"
        />

        <DashboardCard
          icon="▣"
          title="Materiales"
          value={
            resumen
              ? materiales.toLocaleString(
                  "es-AR"
                )
              : "—"
          }
          subtitle="Materiales identificados"
        />

        <DashboardCard
          icon="!"
          title="Alertas"
          value={
            resumen
              ? alertas.toLocaleString(
                  "es-AR"
                )
              : "—"
          }
          subtitle="Registros para revisar"
          warning
        />

      </section>


      <section className="dashboardGrid">

        <div className="panel">

          <div className="panelHeader">

            <div>
              <h3>
                Distribución de condiciones
              </h3>

              <p>
                ZPR0 vs ZPR2
              </p>
            </div>

          </div>


          <div className="conditionChart">

            <div className="donut">

              <div className="donutInner">

                <strong>
                  {total || "—"}
                </strong>

                <span>
                  registros
                </span>

              </div>

            </div>


            <div className="legend">

              <div className="legendItem">

                <span className="legendDot dotOne"></span>

                <div>

                  <strong>
                    ZPR0
                  </strong>

                  <span>
                    {resumen
                      ? resultadosCount(
                          resumen,
                          "ZPR0"
                        )
                      : "—"}{" "}
                    registros
                  </span>

                </div>

              </div>


              <div className="legendItem">

                <span className="legendDot dotTwo"></span>

                <div>

                  <strong>
                    ZPR2
                  </strong>

                  <span>
                    {resumen
                      ? resultadosCount(
                          resumen,
                          "ZPR2"
                        )
                      : "—"}{" "}
                    registros
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>


        <div className="panel">

          <div className="panelHeader">

            <div>

              <h3>
                Estado de validación
              </h3>

              <p>
                Resultado del último análisis
              </p>

            </div>

          </div>


          <div className="statusChart">

            <StatusRow
              label="Correctos"
              value={ok}
              total={total}
              symbol="✓"
            />

            <StatusRow
              label="Alertas"
              value={alertas}
              total={total}
              symbol="!"
            />

            <StatusRow
              label="Errores"
              value={errores}
              total={total}
              symbol="×"
            />

          </div>

        </div>

      </section>


      <section className="bottomGrid">

        <div className="panel economicPanel">

          <div>

            <div className="panelLabel">
              IMPORTE ANALIZADO
            </div>

            <div className="economicValue">
              {resumen
                ? importeTotal.toLocaleString(
                    "es-AR",
                    {
                      minimumFractionDigits: 2,
                    }
                  )
                : "—"}
            </div>

            <div className="economicCurrency">
              ARS · Suma de importes finales
            </div>

          </div>

          <div className="economicIcon">
            $
          </div>

        </div>


        <div className="panel quickPanel">

          <div>

            <div className="panelLabel">
              ACCESO RÁPIDO
            </div>

            <h3>
              Analizá un nuevo período
            </h3>

            <p>
              Cargá el Excel mensual y
              obtené automáticamente las
              validaciones.
            </p>

          </div>

          <button
            className="secondaryButton"
            onClick={onCargar}
          >
            Cargar período →
          </button>

        </div>

      </section>

    </>
  );
}


/* =====================================
   CARGA EXCEL
===================================== */

function CargaExcel({
  archivo,
  cargando,
  error,
  resumen,
  resultados,
  resultadosOriginales,
  clientesDisponibles,
  materialesDisponibles,
  condicionesDisponibles,
  busqueda,
  filtroCliente,
  filtroMaterial,
  filtroCondicion,
  filtroEstado,
  filtroPB00,
  totalZPR0,
  totalZPR2,
  ok,
  alertas,
  errores,
  importeTotal,
  onUpload,
  onInicio,
  onBusqueda,
  onCliente,
  onMaterial,
  onCondicion,
  onEstado,
  onPB00,
  onLimpiar,
  onExportar,
  onDetalle,
}: {
  archivo: string;
  cargando: boolean;
  error: string;
  resumen: ResumenAnalisis | null;
  resultados: ResultadoValidacion[];
  resultadosOriginales: ResultadoValidacion[];
  clientesDisponibles: string[];
  materialesDisponibles: string[];
  condicionesDisponibles: string[];
  busqueda: string;
  filtroCliente: string;
  filtroMaterial: string;
  filtroCondicion: string;
  filtroEstado: string;
  filtroPB00: string;
  totalZPR0: number;
  totalZPR2: number;
  ok: number;
  alertas: number;
  errores: number;
  importeTotal: number;
  onUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onInicio: () => void;
  onBusqueda: (
    value: string
  ) => void;
  onCliente: (
    value: string
  ) => void;
  onMaterial: (
    value: string
  ) => void;
  onCondicion: (
    value: string
  ) => void;
  onEstado: (
    value: string
  ) => void;
  onPB00: (
    value: string
  ) => void;
  onLimpiar: () => void;
  onExportar: () => void;
  onDetalle: (
    resultado: ResultadoValidacion
  ) => void;
}) {

  const hayFiltros =
    Boolean(
      busqueda ||
      filtroCliente ||
      filtroMaterial ||
      filtroCondicion ||
      filtroEstado ||
      filtroPB00
    );


  return (
    <>

      <header className="uploadHeader">

        <div>

          <div className="eyebrow">
            ANÁLISIS MENSUAL
          </div>

          <h1>
            Cargar Excel
          </h1>

          <p className="topDescription">
            Procesá un archivo SAP y validalo
            contra las bases maestras.
          </p>

        </div>


        <button
          className="backButton"
          onClick={onInicio}
        >
          ← Volver al inicio
        </button>

      </header>


      <section className="uploadBox">

        <div className="uploadIcon">
          ↑
        </div>

        <h2>
          Cargar archivo mensual
        </h2>

        <p>
          Seleccioná el Excel exportado desde SAP
          para comenzar la validación.
        </p>

        <input
          className="fileInput"
          type="file"
          accept=".xls,.xlsx"
          onChange={onUpload}
        />


        {archivo && (

          <div className="uploadFileName">

            Archivo seleccionado:{" "}

            <strong>
              {archivo}
            </strong>

          </div>

        )}


        {cargando && (

          <div className="uploadFileName loading">
            ⏳ Procesando archivo...
          </div>

        )}


        {error && (

          <div className="errorBox">
            ❌ {error}
          </div>

        )}

      </section>


      {resumen && (

        <>

          {/* INDICADORES */}

          <section className="resultsHeader">

            <ResultCard
              label="REGISTROS"
              value={
                resultadosOriginales.length
              }
            />

            <ResultCard
              label="RESULTADOS"
              value={
                resultados.length
              }
            />

            <ResultCard
              label="ZPR0"
              value={
                totalZPR0
              }
            />

            <ResultCard
              label="ZPR2"
              value={
                totalZPR2
              }
            />

            <ResultCard
              label="ALERTAS"
              value={
                alertas
              }
            />

            <ResultCard
              label="ERRORES"
              value={
                errores
              }
            />

          </section>


          {/* FILTROS */}

          <section className="filtersPanel">

            <div className="filtersTop">

              <div>

                <div className="filtersTitle">
                  🔎 Buscar y filtrar
                </div>

                <div className="filtersSubtitle">
                  Los resultados cambian automáticamente
                  al modificar los filtros.
                </div>

              </div>


              <button
                className="clearButton"
                onClick={onLimpiar}
              >
                Limpiar filtros
              </button>

            </div>


            <div className="filterGrid">

              <div>

                <label className="filterLabel">
                  BUSCADOR
                </label>

                <input
                  className="searchBox"
                  placeholder="Cliente, material, descripción..."
                  value={busqueda}
                  onChange={(event) =>
                    onBusqueda(
                      event.target.value
                    )
                  }
                />

              </div>


              <div>

                <label className="filterLabel">
                  CLIENTE
                </label>

                <select
                  className="filterSelect"
                  value={filtroCliente}
                  onChange={(event) =>
                    onCliente(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Todos
                  </option>

                  {clientesDisponibles.map(
                    (cliente) => (

                      <option
                        key={cliente}
                        value={cliente}
                      >
                        {cliente}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div>

                <label className="filterLabel">
                  MATERIAL
                </label>

                <select
                  className="filterSelect"
                  value={filtroMaterial}
                  onChange={(event) =>
                    onMaterial(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Todos
                  </option>

                  {materialesDisponibles.map(
                    (material) => (

                      <option
                        key={material}
                        value={material}
                      >
                        {material}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div>

                <label className="filterLabel">
                  CONDICIÓN
                </label>

                <select
                  className="filterSelect"
                  value={filtroCondicion}
                  onChange={(event) =>
                    onCondicion(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Todas
                  </option>

                  {condicionesDisponibles.map(
                    (condicion) => (

                      <option
                        key={condicion}
                        value={condicion}
                      >
                        {condicion}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div>

                <label className="filterLabel">
                  ESTADO
                </label>

                <select
                  className="filterSelect"
                  value={filtroEstado}
                  onChange={(event) =>
                    onEstado(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Todos
                  </option>

                  <option value="OK">
                    🟢 OK
                  </option>

                  <option value="ALERTA">
                    🟠 ALERTA
                  </option>

                  <option value="ERROR">
                    🔴 ERROR
                  </option>

                </select>

              </div>


              <div>

                <label className="filterLabel">
                  PB00
                </label>

                <select
                  className="filterSelect"
                  value={filtroPB00}
                  onChange={(event) =>
                    onPB00(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Todos
                  </option>

                  <option value="SI">
                    Con PB00
                  </option>

                  <option value="NO">
                    Sin PB00
                  </option>

                </select>

              </div>

            </div>

          </section>


          {/* TABLA */}

          <section className="tablePanel">

            <div className="tablePanelHeader">

              <div>

                <h3>
                  Resultado de validación
                </h3>

                <p>

                  Mostrando{" "}

                  <strong>
                    {resultados.length}
                  </strong>

                  {" "}de{" "}

                  <strong>
                    {resultadosOriginales.length}
                  </strong>

                  {" "}registros

                  {hayFiltros &&
                    " · filtros activos"}

                </p>

              </div>


              <button
                className="exportButton"
                onClick={onExportar}
                disabled={
                  !resultados.length
                }
              >
                ↓ Descargar Excel
              </button>

            </div>


            <div className="tableScroll">

              {resultados.length ? (

                <table>

                  <thead>

                    <tr>

                      <th>
                        Fila
                      </th>

                      <th>
                        Cliente
                      </th>

                      <th>
                        Material
                      </th>

                      <th>
                        Descripción
                      </th>

                      <th>
                        Condición
                      </th>

                      <th>
                        Correcta
                      </th>

                      <th>
                        Importe
                      </th>

                      <th>
                        PB00
                      </th>

                      <th>
                        Final
                      </th>

                      <th>
                        Estado
                      </th>

                      <th>
                        Detalle
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {resultados.map(
                      (r) => (

                        <tr
                          key={r.fila}
                        >

                          <td>
                            {r.fila}
                          </td>

                          <td>

                            <strong>
                              {r.razonSocial ||
                                r.cliente ||
                                "-"}
                            </strong>

                            <div
                              style={{
                                color:
                                  "#929ca8",
                                fontSize:
                                  "9px",
                                marginTop:
                                  "3px",
                              }}
                            >
                              SAP:{" "}
                              {r.cliente ||
                                "-"}
                            </div>

                          </td>

                          <td>
                            {r.material ||
                              "-"}
                          </td>

                          <td>
                            {r.descripcionMaterial ||
                              "-"}
                          </td>

                          <td>

                            {r.condicionExcel ||
                              "-"}

                            {r.condicionExcel &&
                              r.condicionEsperada &&
                              r.condicionExcel !==
                                r.condicionEsperada && (

                                <div
                                  className="wrongCondition"
                                  style={{
                                    fontSize:
                                      "8px",
                                    marginTop:
                                      "3px",
                                  }}
                                >
                                  ❌ incorrecta
                                </div>

                              )}

                          </td>

                          <td>

                            <span
                              className={
                                r.condicionExcel ===
                                r.condicionEsperada
                                  ? "correctCondition"
                                  : "wrongCondition"
                              }
                            >
                              {r.condicionEsperada ||
                                "-"}
                            </span>

                          </td>

                          <td>
                            {r.importe.toLocaleString(
                              "es-AR",
                              {
                                minimumFractionDigits:
                                  2,
                              }
                            )}
                          </td>

                          <td>

                            {r.importePB00
                              ? r.importePB00.toLocaleString(
                                  "es-AR",
                                  {
                                    minimumFractionDigits:
                                      2,
                                  }
                                )
                              : "-"}

                          </td>

                          <td>

                            <strong>
                              {r.importeFinal.toLocaleString(
                                "es-AR",
                                {
                                  minimumFractionDigits:
                                    2,
                                }
                              )}
                            </strong>

                          </td>

                          <td>

                            <span
                              className={
                                r.estado ===
                                "OK"
                                  ? "estadoOk"
                                  : r.estado ===
                                    "ALERTA"
                                  ? "estadoAlerta"
                                  : "estadoError"
                              }
                            >

                              {r.estado ===
                              "OK"
                                ? "● OK"
                                : r.estado ===
                                  "ALERTA"
                                ? "● ALERTA"
                                : "● ERROR"}

                            </span>

                          </td>

                          <td>

                            <button
                              className="viewButton"
                              onClick={() =>
                                onDetalle(r)
                              }
                            >
                              Ver detalle
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              ) : (

                <div className="noResults">

                  <strong>
                    No encontramos registros
                  </strong>

                  Probá cambiando los filtros
                  o limpiándolos.

                </div>

              )}

            </div>

          </section>

        </>

      )}

    </>
  );
}


/* =====================================
   COMPONENTES PEQUEÑOS
===================================== */

function DashboardCard({
  icon,
  title,
  value,
  subtitle,
  warning = false,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  warning?: boolean;
}) {

  return (

    <div
      className={
        warning
          ? "dashCard warningCard"
          : "dashCard"
      }
    >

      <div className="dashIcon">
        {icon}
      </div>

      <div className="dashTitle">
        {title}
      </div>

      <div className="dashValue">
        {value}
      </div>

      <div className="dashSubtitle">
        {subtitle}
      </div>

    </div>

  );
}


function ResultCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {

  return (

    <div className="resultCard">

      <span>
        {label}
      </span>

      <strong>
        {value.toLocaleString(
          "es-AR"
        )}
      </strong>

    </div>

  );
}


function StatusRow({
  label,
  value,
  total,
  symbol,
}: {
  label: string;
  value: number;
  total: number;
  symbol: string;
}) {

  const porcentaje =
    total > 0
      ? (value / total) * 100
      : 0;

  return (

    <div>

      <div className="statusRowHeader">

        <div className="statusLabel">

          <span className="statusSymbol">
            {symbol}
          </span>

          {label}

        </div>

        <strong>
          {value}
        </strong>

      </div>


      <div className="progress">

        <div
          className="progressFill"
          style={{
            width:
              `${porcentaje}%`,
          }}
        />

      </div>

    </div>

  );
}


function Detail({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {

  return (

    <div
      className={
        highlight
          ? "detailBox detailHighlight"
          : "detailBox"
      }
    >

      <span>
        {label}
      </span>

      <strong>
        {value || "-"}
      </strong>

    </div>

  );
}


function resultadosCount(
  resumen: ResumenAnalisis,
  condicion: string
) {

  return resumen.resultados.filter(
    (r) =>
      r.condicionExcel ===
      condicion
  ).length;
}
