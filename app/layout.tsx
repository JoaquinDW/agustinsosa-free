import type { Metadata } from "next"
import { Bebas_Neue, DM_Sans } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { headers } from "next/headers"
import { PreviewBanner } from "@/components/preview-banner"
import "./globals.css"

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const TITULO = "Sorteos gratis | Agustín Sosa"
const DESCRIPCION =
  "Participá gratis en los sorteos de Agustín Sosa y Sosa Motos. Dejá tus datos y recibí tu número al instante."

export const metadata: Metadata = {
  metadataBase: new URL("https://www.agustinsosa.online"),
  title: TITULO,
  description: DESCRIPCION,
  generator: "v0.dev",
  icons: {
    icon: "/sosamotos.jpeg",
    shortcut: "/sosamotos.jpeg",
    apple: "/sosamotos.jpeg",
  },
  openGraph: {
    type: "website",
    url: "https://www.agustinsosa.online",
    siteName: "Agustín Sosa",
    title: TITULO,
    description: DESCRIPCION,
    images: [
      {
        url: "/sosamotos.jpeg",
        width: 1200,
        height: 630,
        alt: "Logo de Sosa Motos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
    images: ["/sosamotos.jpeg"],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const requestHeaders = await headers()
  const isPreview = requestHeaders.get("x-sosa-admin-preview") === "true"

  return (
    <html lang="es" className={`${bebasNeue.variable} ${dmSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="icon" href="/sosamotos.jpeg" />
      </head>
      <body
        className={`font-sans ${isPreview ? "pt-8" : ""}`}
        data-sosa-preview={isPreview ? "true" : "false"}
      >
        {isPreview ? <PreviewBanner /> : null}
        {children}
      </body>
    </html>
  )
}
