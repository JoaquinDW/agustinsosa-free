import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { put } from "@vercel/blob"
import fs from "fs"
import path from "path"
import { requireAdminRequest } from "@/lib/admin-api"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminRequest(request)
  if (unauthorized) return unauthorized

  try {
    console.log("🎽 Generating fallback t-shirt image...")
    
    // Cargar la imagen base de la remera desde public
    const tshirtPath = path.join(process.cwd(), "public", "white-t-shirt-mockup-t-shirt-with-short-sleeves-ai-generative-free-png.webp")
    
    if (!fs.existsSync(tshirtPath)) {
      return NextResponse.json(
        { error: "T-shirt mockup image not found" },
        { status: 404 }
      )
    }

    // Crear la imagen de la remera base sin diseño
    const tshirtImage = sharp(tshirtPath)
    const tshirtMetadata = await tshirtImage.metadata()
    
    const baseWidth = tshirtMetadata.width || 800
    const baseHeight = tshirtMetadata.height || 1000
    
    // Crear un texto/logo en el área del diseño
    const textSvg = `
      <svg width="${Math.round(baseWidth * 0.5)}" height="${Math.round(baseHeight * 0.45)}">
        <rect width="100%" height="100%" fill="#f3f4f6" rx="20" opacity="0.8"/>
        <text x="50%" y="35%" text-anchor="middle" font-family="Arial" font-size="32" font-weight="bold" fill="#10b981">🎽</text>
        <text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">REMERA</text>
        <text x="50%" y="75%" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#1f2937">DIGITAL</text>
      </svg>
    `
    
    const designX = Math.round((baseWidth - Math.round(baseWidth * 0.5)) / 2)
    const designY = Math.round(baseHeight * 0.28)
    
    // Combinar las imágenes
    const compositeImage = await tshirtImage
      .composite([
        {
          input: Buffer.from(textSvg),
          left: designX,
          top: designY,
          blend: 'over'
        }
      ])
      .png()
      .toBuffer()

    // Subir la imagen compuesta a Vercel Blob
    const filename = `tshirt-fallback-static.png`
    
    const blob = await put(filename, compositeImage, {
      access: "public",
      contentType: "image/png"
    })
    
    console.log("✅ Fallback t-shirt image generated:", blob.url)

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
      message: "Fallback t-shirt image generated successfully"
    })

  } catch (error) {
    console.error("❌ Error generating fallback t-shirt image:", error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
