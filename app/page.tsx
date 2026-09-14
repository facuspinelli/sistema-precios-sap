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

export default function Home() {
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

  const resultados =
    resumen?.resultados || [];

  const totalZPR0 =
    resultados.filter(
      (r) =>
        r.condicionExcel === "ZPR0"
    ).length;

  const totalZPR2 =
    resultados.filter(
      (r) =>
        r.condicionExcel === "ZPR2"
    ).length;

  const errores =
    resultados.filter(
      (r) => r.estado === "ERROR"
    ).length;

  const alertas =
    resultados.filter(
      (r) => r.estado === "ALERTA"
    ).length;

  const materialesNoEncontrados =
    resultados.filter(
      (r) =>
        r.material &&
        !r.materialEncontrado
    ).length;

  const importeTotal =
    resultados.reduce(
      (total, r) =>
        total + r.importeFinal,
      0
    );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        color: "#172033",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "30px",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              marginBottom: "8px",
            }}
          >
            Sistema de Precios SAP
          </h1>

          <p
            style={{
              color: "#667085",
              margin: 0,
            }}
          >
            Validación y análisis de
            precios, clientes y materiales.
          </p>
        </header>

        <section
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "25px",
            marginBottom: "25px",
            border: "1px solid #e4e7ec",
          }}
        >
          <h2>
            Cargar Excel mensual
          </h2>

          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={procesarArchivo}
          />

          {archivo && (
            <p>
              Archivo:{" "}
              <strong>{archivo}</strong>
            </p>
          )}

          {cargando && (
            <p>
              ⏳ Procesando...
            </p>
          )}

          {error && (
            <div
              style={{
                padding: "15px",
                background: "#fff1f0",
                borderRadius: "8px",
                color: "#cf1322",
              }}
            >
              ❌ {error}
            </div>
          )}
        </section>

        {resumen && (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(5, 1fr)",
                gap: "15px",
                marginBottom: "25px",
              }}
            >
              <Tarjeta
                titulo="Registros"
                valor={resumen.totalFilas}
              />

              <Tarjeta
                titulo="ZPR0"
                valor={totalZPR0}
              />

              <Tarjeta
                titulo="ZPR2"
                valor={totalZPR2}
              />

              <Tarjeta
                titulo="PB00"
                valor={
                  resumen.filasConPB00
                }
              />

              <Tarjeta
                titulo="Importe total"
                valor={importeTotal}
                dinero
              />
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap: "15px",
                marginBottom: "25px",
              }}
            >
              <Tarjeta
                titulo="Alertas"
                valor={alertas}
              />

              <Tarjeta
                titulo="Errores"
                valor={errores}
              />

              <Tarjeta
                titulo="Materiales no encontrados"
                valor={
                  materialesNoEncontrados
                }
              />
            </section>

            <section
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "25px",
                border: "1px solid #e4e7ec",
              }}
            >
              <h2>
                Detalle de registros
              </h2>

              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={th}>
                        Fila
                      </th>

                      <th style={th}>
                        Cliente
                      </th>

                      <th style={th}>
                        Razón social
                      </th>

                      <th style={th}>
                        Material
                      </th>

                      <th style={th}>
                        Descripción
                      </th>

                      <th style={th}>
                        Condición
                      </th>

                      <th style={th}>
                        Esperada
                      </th>

                      <th style={th}>
                        Importe
                      </th>

                      <th style={th}>
                        PB00
                      </th>

                      <th style={th}>
                        Importe final
                      </th>

                      <th style={th}>
                        Moneda
                      </th>

                      <th style={th}>
                        Por
                      </th>

                      <th style={th}>
                        UM
                      </th>

                      <th style={th}>
                        Estado
                      </th>

                      <th style={th}>
                        Observaciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {resultados.map(
                      (
                        r: ResultadoValidacion
                      ) => (
                        <tr
                          key={r.fila}
                        >
                          <td style={td}>
                            {r.fila}
                          </td>

                          <td style={td}>
                            {r.cliente ||
                              "-"}
                          </td>

                          <td style={td}>
                            {r.razonSocial ||
                              "-"}
                          </td>

                          <td style={td}>
                            {r.material ||
                              "-"}
                          </td>

                          <td style={td}>
                            {r.descripcionMaterial ||
                              "-"}
                          </td>

                          <td style={td}>
                            {r.condicionExcel ||
                              "-"}
                          </td>

                          <td style={td}>
                            {r.condicionEsperada ||
                              "-"}
                          </td>

                          <td style={td}>
                            {r.importe.toLocaleString(
                              "es-AR",
                              {
                                minimumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td style={td}>
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

                          <td
                            style={{
                              ...td,
                              fontWeight: 700,
                            }}
                          >
                            {r.importeFinal.toLocaleString(
                              "es-AR",
                              {
                                minimumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td style={td}>
                            {r.moneda ||
                              "-"}
                          </td>

                          <td style={td}>
                            {r.por || "-"}
                          </td>

                          <td style={td}>
                            {r.unidadMedida ||
                              "-"}
                          </td>

                          <td style={td}>
                            <Estado
                              estado={
                                r.estado
                              }
                            />
                          </td>

                          <td style={td}>
                            {r.observaciones
                              .length
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
      </div>
    </main>
  );
}

function Tarjeta({
  titulo,
  valor,
  dinero = false,
}: {
  titulo: string;
  valor: number;
  dinero?: boolean;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "14px",
        padding: "22px",
        border: "1px solid #e4e7ec",
      }}
    >
      <div
        style={{
          color: "#667085",
          fontSize: "14px",
          marginBottom: "8px",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          fontSize: "25px",
          fontWeight: 700,
        }}
      >
        {dinero
          ? valor.toLocaleString(
              "es-AR",
              {
                minimumFractionDigits: 2,
              }
            )
          : valor}
      </div>
    </div>
  );
}

function Estado({
  estado,
}: {
  estado:
    | "OK"
    | "ALERTA"
    | "ERROR";
}) {
  if (estado === "OK") {
    return "🟢 OK";
  }

  if (estado === "ALERTA") {
    return "🟠 ALERTA";
  }

  return "🔴 ERROR";
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px",
  borderBottom:
    "2px solid #e4e7ec",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "12px",
  borderBottom:
    "1px solid #eef0f3",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};
