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
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] =
    useState<ResumenAnalisis | null>(null);

  async function procesarExcel(file: File) {
    setCargando(true);
    setError("");
    setResultado(null);

    try {
      const buffer = await file.arrayBuffer();

      const filas = leerExcel(buffer);

      const resultados: ResultadoValidacion[] =
        validarExcel(filas);

      const resumen =
        analizarResultados(resultados);

      setResultado(resumen);
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo procesar el archivo Excel. Verificá que sea un archivo válido."
      );
    } finally {
      setCargando(false);
    }
  }

  function seleccionarArchivo(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setArchivo(file);
    procesarExcel(file);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "32px",
            color: "#172033",
          }}
        >
          Sistema de Análisis de Precios
        </h1>

        <p
          style={{
            color: "#667085",
            fontSize: "16px",
            marginTop: "8px",
          }}
        >
          Análisis automático de archivos Excel
        </p>

        <section
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginTop: "30px",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#172033",
            }}
          >
            Cargar Excel
          </h2>

          <p style={{ color: "#667085" }}>
            Seleccioná un archivo Excel para iniciar
            el análisis.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={seleccionarArchivo}
          />

          {archivo && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                background: "#f2f4f7",
                borderRadius: "10px",
              }}
            >
              <strong>Archivo:</strong>{" "}
              {archivo.name}
            </div>
          )}

          {cargando && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                borderRadius: "10px",
                background: "#eef4ff",
              }}
            >
              Procesando Excel...
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                borderRadius: "10px",
                background: "#fff1f0",
                color: "#b42318",
              }}
            >
              {error}
            </div>
          )}
        </section>

        {resultado && (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, 1fr)",
                gap: "20px",
                marginTop: "25px",
              }}
            >
              <div
                style={{
                  background: "white",
                  padding: "25px",
                  borderRadius: "14px",
                }}
              >
                <h3>Total filas</h3>

                <strong
                  style={{ fontSize: "28px" }}
                >
                  {resultado.totalFilas}
                </strong>
              </div>

              <div
                style={{
                  background: "white",
                  padding: "25px",
                  borderRadius: "14px",
                }}
              >
                <h3>Con PB00</h3>

                <strong
                  style={{ fontSize: "28px" }}
                >
                  {resultado.filasConPB00}
                </strong>
              </div>

              <div
                style={{
                  background: "white",
                  padding: "25px",
                  borderRadius: "14px",
                }}
              >
                <h3>Sin PB00</h3>

                <strong
                  style={{ fontSize: "28px" }}
                >
                  {resultado.filasSinPB00}
                </strong>
              </div>

              <div
                style={{
                  background: "white",
                  padding: "25px",
                  borderRadius: "14px",
                }}
              >
                <h3>% PB00</h3>

                <strong
                  style={{ fontSize: "28px" }}
                >
                  {resultado.porcentajePB00.toFixed(
                    2
                  )}
                  %
                </strong>
              </div>
            </section>

            <section
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "30px",
                marginTop: "25px",
                boxShadow:
                  "0 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              <h2>Detalle del análisis</h2>

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
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                          borderBottom:
                            "1px solid #ddd",
                        }}
                      >
                        Fila
                      </th>

                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                          borderBottom:
                            "1px solid #ddd",
                        }}
                      >
                        PB00
                      </th>

                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                          borderBottom:
                            "1px solid #ddd",
                        }}
                      >
                        Observaciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {resultado.resultados.map(
                      (fila) => (
                        <tr key={fila.fila}>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            {fila.fila}
                          </td>

                          <td
                            style={{
                              padding: "12px",
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            {fila.tienePB00
                              ? "Sí"
                              : "No"}
                          </td>

                          <td
                            style={{
                              padding: "12px",
                              borderBottom:
                                "1px solid #eee",
                            }}
                          >
                            {fila.observaciones
                              .length > 0
                              ? fila.observaciones.join(
                                  " "
                                )
                              : "Sin observaciones"}
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
