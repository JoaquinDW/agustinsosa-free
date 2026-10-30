import { type NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-api"

export async function GET(request: NextRequest) {
  const session = getAdminSession(request)
  return NextResponse.json(
    session
      ? { authenticated: true, expiresAt: session.expiresAt }
      : { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  )
}
