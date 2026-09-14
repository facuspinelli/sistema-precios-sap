"use client";

import { useState } from "react";

export default function Home() {
  const [archivo, setArchivo] = useState<File | null>(null);

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
          Carga y análisis automático de archivos Excel
        </p>

        <section
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            marginTop: "30px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
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
            Subí el archivo Excel para comenzar el análisis.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setArchivo(file);
            }}
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
              <strong>Archivo seleccionado:</strong>{" "}
              {archivo.name}
            </div>
          )}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
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
            <h3>Base histórica</h3>
            <p style={{ color: "#667085" }}>
              Datos históricos utilizados como referencia.
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "14px",
            }}
          >
            <h3>Base actual</h3>
            <p style={{ color: "#667085" }}>
              Datos actuales para validar y comparar.
            </p>
          </div>

          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "14px",
            }}
          >
            <h3>Resultados</h3>
            <p style={{ color: "#667085" }}>
              Análisis, diferencias y reportes generados.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
