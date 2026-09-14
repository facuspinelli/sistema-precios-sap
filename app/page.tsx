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

    if (!file) {
      return;
    }

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

  const materialesNoEncontrados =
    resultados.filter(
      (r) =>
        r.material &&
        !r.materialEncontrado
    ).length;

  const errores =
    resultados.filter(
      (r) => r.estado === "ERROR"
    ).length;

  const alertas =
    resultados.filter(
      (r) => r.estado === "ALERTA"
    ).length;

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
          maxWidth: "1400px",
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
            Validación y análisis automático
            de precios, clientes y materiales.
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
          <h2
            style={{
              marginTop: 0,
              fontSize: "20px",
            }}
          >
            Cargar Excel mensual
          </h2>

          <p
            style={{
              color: "#667085",
            }}
          >
            Subí el archivo mensual de SAP
            (.xls o .xlsx).
          </p>

          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={procesarArchivo}
          />

          {archivo && (
            <p>
              Archivo seleccionado:{" "}
              <strong>{archivo}</strong>
            </p>
          )}

          {cargando && (
            <p>
              ⏳ Procesando Excel...
            </p>
          )}

          {error && (
            <div
              style={{
                marginTop: "15px",
                padding: "15px",
                background: "#fff1f0",
                border:
                  "1px solid #ffccc7",
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
                  "repeat(4, 1fr)",
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
              <h2
                style={{
                  marginTop: 0,
                }}
              >
                Resultado del análisis
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
                    fontSize: "14px",
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
                        Excel
                      </th>

                      <th style={th}>
                        Esperada
                      </th>

                      <th style={th}>
                        Material
                      </th>

                      <th style={th}>
                        PB00
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
                        resultado: ResultadoValidacion
                      ) => (
                        <tr
                          key={
                            resultado.fila
                          }
                        >
                          <td style={td}>
                            {
                              resultado.fila
                            }
                          </td>

                          <td style={td}>
                            {
                              resultado.cliente
                            }
                          </td>

                          <td style={td}>
                            {
                              resultado.razonSocial ||
                              "-"
                            }
                          </td>

                          <td style={td}>
                            {
                              resultado.material ||
                              "-"
                            }
                          </td>

                          <td style={td}>
                            {
                              resultado
                                .descripcionMaterial ||
                              "-"
                            }
                          </td>

                          <td style={td}>
                            {
                              resultado
                                .condicionExcel ||
                              "-"
                            }
                          </td>

                          <td style={td}>
                            {
                              resultado
                                .condicionEsperada ||
                              "-"
                            }
                          </td>

                          <td style={td}>
                            {resultado.materialEncontrado
                              ? "🟢 OK"
                              : "🔴 No existe"}
                          </td>

                          <td style={td}>
                            {resultado.tienePB00
                              ? "⚠️ Sí"
                              : "-"}
                          </td>

                          <td style={td}>
                            <Estado
                              estado={
                                resultado.estado
                              }
                            />
                          </td>

                          <td style={td}>
                            {resultado
                              .observaciones
                              .length
                              ? resultado.observaciones.join(
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
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "14px",
        padding: "22px",
        border:
          "1px solid #e4e7ec",
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
          fontSize: "30px",
          fontWeight: 700,
        }}
      >
        {valor}
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
};
