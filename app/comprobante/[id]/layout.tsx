import type { Metadata } from "next"

// El comprobante es público (link del WhatsApp) pero personal: que no se indexe.
export const metadata: Metadata = {
  title: "Tu comprobante",
  robots: { index: false, follow: false },
}

export default function ComprobanteLayout({ children }: { children: React.ReactNode }) {
  return children
}
