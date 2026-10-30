import { type NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/admin-api"
import { getWhatsAppBrandConfig } from "@/lib/whatsapp"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminRequest(request)
  if (unauthorized) return unauthorized
  const config = getWhatsAppBrandConfig()
  return NextResponse.json({ rankingTemplateDisponible: Boolean(config.contentSidPromoRanking), marca: config.brandName }, { headers: { "Cache-Control": "no-store" } })
}
