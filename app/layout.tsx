import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FATUR4U",
  description: "Emissão de NFS-e e cobrança para autônomos e pequenos negócios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
