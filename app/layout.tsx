import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sistema de Precios SAP",
  description: "Análisis y validación de precios SAP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
