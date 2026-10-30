import { redirect } from "next/navigation"

export default async function PromoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  redirect(`/?promo=${encodeURIComponent(codigo)}`)
}
