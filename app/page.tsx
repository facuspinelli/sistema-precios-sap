"use client";

import { useState } from "react";
import { leerExcel } from "../lib/excel";
import {
  validarExcel,
  ResultadoValidacion,
} from "../lib/validador";
import {
  analizarResultados,
  ResumenAnalisis,
} from "../lib/analisis";

type Vista = "inicio" | "cargar";

export default function Home() {
  const [vista, setVista] = useState<Vista>("inicio");
  const [archivo, setArchivo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resumen, setResumen] =
    useState<ResumenAnalisis | null>(null);

  async function procesarArchivo(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setArchivo(file.name);
    setCargando(true);
    setError("");
    setResumen(null);

    try {
      const buffer = await file.arrayBuffer();

      const filas = leerExcel(buffer);

      if (!filas.length) {
        throw new Error(
          "El Excel no contiene registros."
        );
      }

      const resultados = validarExcel(filas);
      const analisis = analizarResultados(resultados);

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

  const resultados = resumen?.resultados || [];

  const totalZPR0 = resultados.filter(
    (r) => r.condicionExcel === "ZPR0"
  ).length;

  const totalZPR2 = resultados.filter(
    (r) => r.condicionExcel === "ZPR2"
  ).length;

  const errores = resultados.filter(
    (r) => r.estado === "ERROR"
  ).length;

  const alertas = resultados.filter(
    (r) => r.estado === "ALERTA"
  ).length;

  const ok = resultados.filter(
    (r) => r.estado === "OK"
  ).length;

  const materiales = new Set(
    resultados
      .map((r) => r.material)
      .filter(Boolean)
  ).size;

  const clientes = new Set(
    resultados
      .map((r) => r.cliente)
      .filter(Boolean)
  ).size;

  const importeTotal = resultados.reduce(
    (total, r) => total + r.importeFinal,
    0
  );

  return (
    <main className="app">

      {/* MENÚ LATERAL */}
      <aside className="sidebar">

        <div className="brand">
          <img
            src="/Addoc_color_RGB (11)(1).png"
            alt="ADDOC"
          />

          <div className="brandTitle">
            Sistema de Precios
            <span>SAP</span>
          </div>
        </div>

        <nav className="menu">

          <button
            className={
              vista === "inicio"
                ? "menuItem active"
                : "menuItem"
            }
            onClick={() => setVista("inicio")}
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
            onClick={() => setVista("cargar")}
          >
            <span>↑</span>
            Cargar Excel
          </button>

          <button className="menuItem disabled">
            <span>♙</span>
            Clientes
            <small>Próximamente</small>
          </button>

          <button className="menuItem disabled">
            <span>▣</span>
            Materiales
            <small>Próximamente</small>
          </button>

          <button className="menuItem disabled">
            <span>◈</span>
            Análisis
            <small>Próximamente</small>
          </button>

          <button className="menuItem disabled">
            <span>◷</span>
            Histórico
            <small>Próximamente</small>
          </button>

        </nav>

        <div className="sidebarBottom">
          <div className="systemStatus">
            <span className="statusDot"></span>
            Sistema operativo
          </div>
        </div>

      </aside>


      {/* CONTENIDO */}
      <section className="content">

        {vista === "inicio" ? (

          <>
            {/* HEADER */}
            <header className="topHeader">

              <div>
                <div className="eyebrow">
                  GESTIÓN Y CONTROL
                </div>

                <h1>
                  Dashboard
                </h1>

                <p>
                  Control centralizado de precios,
                  condiciones y materiales SAP.
                </p>
              </div>

              <button
                className="primaryButton"
                onClick={() => setVista("cargar")}
              >
                <span>↑</span>
                Cargar Excel
              </button>

            </header>


            {/* HERO */}
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
                  onClick={() => setVista("cargar")}
                >
                  Comenzar análisis →
                </button>
              </div>

              <div className="heroGraphic">

                <div className="graphicCircle circle1"></div>
                <div className="graphicCircle circle2"></div>

                <div className="graphicCard">

                  <div className="miniHeader">
                    <span>Estado general</span>
                    <span className="miniOk">
                      ● Activo
                    </span>
                  </div>

                  <div className="miniNumber">
                    {resumen
                      ? resumen.totalFilas
                      : "—"}
                  </div>

                  <div className="miniLabel">
                    registros analizados
                  </div>

                  <div className="miniBars">
                    <div
                      style={{
                        width:
                          resumen && resumen.totalFilas
                            ? `${(ok /
                                resumen.totalFilas) *
                                100}%`
                            : "15%",
                      }}
                    />
                    <div
                      style={{
                        width:
                          resumen && resumen.totalFilas
                            ? `${(alertas /
                                resumen.totalFilas) *
                                100}%`
                            : "8%",
                      }}
                    />
                    <div
                      style={{
                        width:
                          resumen && resumen.totalFilas
                            ? `${(errores /
                                resumen.totalFilas) *
                                100}%`
                            : "4%",
                      }}
                    />
                  </div>

                </div>

              </div>

            </section>


            {/* CARDS */}
            <section className="cardsGrid">

              <DashboardCard
                icon="◎"
                title="Registros"
                value={
                  resumen
                    ? resumen.totalFilas.toLocaleString(
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


            {/* GRÁFICOS */}
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
                        {resumen
                          ? resumen.totalFilas
                          : "—"}
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
                        <strong>ZPR0</strong>
                        <span>
                          {resumen
                            ? totalZPR0
                            : "—"}{" "}
                          registros
                        </span>
                      </div>
                    </div>

                    <div className="legendItem">
                      <span className="legendDot dotTwo"></span>
                      <div>
                        <strong>ZPR2</strong>
                        <span>
                          {resumen
                            ? totalZPR2
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
                    total={
                      resumen?.totalFilas || 0
                    }
                    symbol="✓"
                  />

                  <StatusRow
                    label="Alertas"
                    value={alertas}
                    total={
                      resumen?.totalFilas || 0
                    }
                    symbol="!"
                  />

                  <StatusRow
                    label="Errores"
                    value={errores}
                    total={
                      resumen?.totalFilas || 0
                    }
                    symbol="×"
                  />

                </div>

              </div>

            </section>


            {/* RESUMEN ECONÓMICO */}
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
                  onClick={() => setVista("cargar")}
                >
                  Cargar período →
                </button>

              </div>

            </section>

          </>

        ) : (

          <CargaExcel
            archivo={archivo}
            cargando={cargando}
            error={error}
            resumen={resumen}
            resultados={resultados}
            totalZPR0={totalZPR0}
            totalZPR2={totalZPR2}
            errores={errores}
            alertas={alertas}
            materialesNoEncontrados={
              resultados.filter(
                (r) =>
                  r.material &&
                  !r.materialEncontrado
              ).length
            }
            onUpload={procesarArchivo}
            onInicio={() => setVista("inicio")}
          />

        )}

      </section>


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

        button {
          font-family: inherit;
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
          padding: 13px 13px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          font-size: 14px;
          cursor: pointer;
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

        /* CONTENT */

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

        .topHeader p {
          margin: 8px 0 0;
          color: #697586;
          font-size: 14px;
        }

        .primaryButton,
        .heroButton,
        .secondaryButton {
          border: 0;
          border-radius: 9px;
          cursor: pointer;
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
            0 5px 15px rgba(121,208,0,.18);
        }

        .primaryButton:hover,
        .heroButton:hover {
          transform: translateY(-1px);
          filter: brightness(.97);
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
          letter-spacing: -.7px;
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
          white-space: nowrap;
        }

        /* CARGA */

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
          cursor: pointer;
          color: #536171;
        }

        .uploadBox {
          background: white;
          border: 2px dashed #d7dee6;
          border-radius: 16px;
          padding: 45px;
          text-align: center;
          margin-bottom: 25px;
        }

        .uploadIcon {
          width: 55px;
          height: 55px;
          margin: auto;
          border-radius: 14px;
          background: #eef7e5;
          color: #62a600;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          font-weight: 800;
        }

        .uploadBox h2 {
          margin: 16px 0 7px;
          font-size: 20px;
        }

        .uploadBox p {
          color: #8994a1;
          font-size: 12px;
          margin-bottom: 20px;
        }

        .fileInput {
          border: 1px solid #dce2e8;
          padding: 10px;
          border-radius: 8px;
          background: white;
        }

        .uploadFileName {
          margin-top: 15px;
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

        .resultsHeader {
          display: grid;
          grid-template-columns:
            repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .resultCard {
          background: white;
          border: 1px solid #e4e8ed;
          border-radius: 12px;
          padding: 16px;
        }

        .resultCard span {
          color: #8994a1;
          font-size: 10px;
        }

        .resultCard strong {
          display: block;
          margin-top: 5px;
          font-size: 22px;
        }

        .tablePanel {
          background: white;
          border: 1px solid #e4e8ed;
          border-radius: 14px;
          padding: 22px;
          overflow: hidden;
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
          padding: 12px 10px;
          color: #687687;
          border-bottom: 2px solid #e5e9ed;
          white-space: nowrap;
        }

        td {
          padding: 12px 10px;
          border-bottom: 1px solid #eef1f4;
          white-space: nowrap;
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

        @media (max-width: 1100px) {

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
        }

      `}</style>

    </main>
  );
}


/* COMPONENTE TARJETA */

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


/* COMPONENTE ESTADO */

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
            width: `${porcentaje}%`,
          }}
        />
      </div>

    </div>
  );
}


/* PANTALLA CARGAR EXCEL */

function CargaExcel({
  archivo,
  cargando,
  error,
  resumen,
  resultados,
  totalZPR0,
  totalZPR2,
  errores,
  alertas,
  materialesNoEncontrados,
  onUpload,
  onInicio,
}: {
  archivo: string;
  cargando: boolean;
  error: string;
  resumen: ResumenAnalisis | null;
  resultados: ResultadoValidacion[];
  totalZPR0: number;
  totalZPR2: number;
  errores: number;
  alertas: number;
  materialesNoEncontrados: number;
  onUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onInicio: () => void;
}) {
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

          <p className="topHeader p">
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

          <section className="resultsHeader">

            <div className="resultCard">
              <span>REGISTROS</span>
              <strong>
                {resumen.totalFilas}
              </strong>
            </div>

            <div className="resultCard">
              <span>ZPR0</span>
              <strong>
                {totalZPR0}
              </strong>
            </div>

            <div className="resultCard">
              <span>ZPR2</span>
              <strong>
                {totalZPR2}
              </strong>
            </div>

            <div className="resultCard">
              <span>ALERTAS</span>
              <strong>
                {alertas}
              </strong>
            </div>

            <div className="resultCard">
              <span>ERRORES</span>
              <strong>
                {errores}
              </strong>
            </div>

          </section>


          <section className="tablePanel">

            <div className="panelHeader">

              <div>
                <h3>
                  Resultado de validación
                </h3>

                <p>
                  Materiales no encontrados:{" "}
                  {materialesNoEncontrados}
                </p>
              </div>

            </div>

            <div className="tableScroll">

              <table>

                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Cliente</th>
                    <th>Razón social</th>
                    <th>Material</th>
                    <th>Descripción</th>
                    <th>Condición</th>
                    <th>Correcta</th>
                    <th>Importe</th>
                    <th>PB00</th>
                    <th>Final</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>

                <tbody>

                  {resultados.map(
                    (
                      r: ResultadoValidacion
                    ) => (

                      <tr key={r.fila}>

                        <td>
                          {r.fila}
                        </td>

                        <td>
                          {r.cliente || "-"}
                        </td>

                        <td>
                          {r.razonSocial || "-"}
                        </td>

                        <td>
                          {r.material || "-"}
                        </td>

                        <td>
                          {r.descripcionMaterial || "-"}
                        </td>

                        <td>
                          {r.condicionExcel || "-"}
                        </td>

                        <td>
                          {r.condicionEsperada || "-"}
                        </td>

                        <td>
                          {r.importe.toLocaleString(
                            "es-AR",
                            {
                              minimumFractionDigits: 2,
                            }
                          )}
                        </td>

                        <td>
                          {r.importePB00
                            ? r.importePB00.toLocaleString(
                                "es-AR",
                                {
                                  minimumFractionDigits: 2,
                                }
                              )
                            : "-"}
                        </td>

                        <td>
                          <strong>
                            {r.importeFinal.toLocaleString(
                              "es-AR",
                              {
                                minimumFractionDigits: 2,
                              }
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={
                              r.estado === "OK"
                                ? "estadoOk"
                                : r.estado === "ALERTA"
                                ? "estadoAlerta"
                                : "estadoError"
                            }
                          >
                            {r.estado === "OK"
                              ? "● OK"
                              : r.estado === "ALERTA"
                              ? "● ALERTA"
                              : "● ERROR"}
                          </span>
                        </td>

                        <td>
                          {r.observaciones.length
                            ? r.observaciones.join(
                                " "
                              )
                            : "-"}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

        </>

      )}

    </>
  );
}
