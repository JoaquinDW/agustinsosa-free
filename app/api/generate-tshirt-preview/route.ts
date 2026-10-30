import { type NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { uploadToSupabase } from "@/lib/supabase-storage"
import fs from "fs"
import path from "path"
import { requireAdminRequest } from "@/lib/admin-api"

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminRequest(request, { verifyOrigin: true })
  if (unauthorized) return unauthorized

  try {
    const { designImageUrl } = await request.json()

    console.log("🎨 Generate T-shirt preview request:", { designImageUrl })

    if (!designImageUrl) {
      console.error("❌ No design image URL provided")
      return NextResponse.json({ error: "Design image URL is required" }, { status: 400 })
    }

    // Cargar la imagen base de la remera desde public
    const tshirtPath = path.join(
      process.cwd(),
      "public",
      "white-t-shirt-mockup-t-shirt-with-short-sleeves-ai-generative-free-png.webp",
    )

    console.log("📁 T-shirt base image path:", tshirtPath)
    console.log("📁 T-shirt image exists:", fs.existsSync(tshirtPath))

    if (!fs.existsSync(tshirtPath)) {
      console.error("❌ T-shirt mockup image not found at:", tshirtPath)
      return NextResponse.json({ error: "T-shirt mockup image not found" }, { status: 404 })
    }

    // Descargar la imagen del diseño
    let designImageBuffer: Buffer
    try {
      console.log("🌐 Fetching design image from:", designImageUrl)
      const designResponse = await fetch(designImageUrl)
      if (!designResponse.ok) {
        throw new Error(`Failed to fetch design image: ${designResponse.status}`)
      }
      designImageBuffer = Buffer.from(await designResponse.arrayBuffer())
      console.log("✅ Design image fetched successfully, size:", designImageBuffer.length, "bytes")
    } catch (error) {
      console.error("❌ Error fetching design image:", error)
      return NextResponse.json(
        { error: "Failed to fetch design image", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 400 },
      )
    }

    // Crear la imagen compuesta usando Sharp
    const tshirtImage = sharp(tshirtPath)
    const tshirtMetadata = await tshirtImage.metadata()

    console.log("📐 T-shirt base dimensions:", {
      width: tshirtMetadata.width,
      height: tshirtMetadata.height,
    })

    // Calcular las dimensiones del diseño basándose en el mockup
    // Basado en el componente TShirtMockup: top-[28%], width-[50%], height-[45%]
    const baseWidth = tshirtMetadata.width || 800
    const baseHeight = tshirtMetadata.height || 1000
    const designWidth = Math.round(baseWidth * 0.5)
    const designHeight = Math.round(baseHeight * 0.45)
    const designX = Math.round((baseWidth - designWidth) / 2)
    const designY = Math.round(baseHeight * 0.28)

    console.log("🎯 Design positioning:", {
      designWidth,
      designHeight,
      designX,
      designY,
    })

    // Procesar la imagen del diseño
    const processedDesign = await sharp(designImageBuffer)
      .resize(designWidth, designHeight, { fit: "cover" })
      .modulate({
        brightness: 0.96,
        saturation: 0.88,
      })
      .sharpen({ sigma: 0.3 })
      .png()
      .toBuffer()

    // Combinar las imágenes
    const compositeImage = await tshirtImage
      .composite([
        {
          input: processedDesign,
          left: designX,
          top: designY,
          blend: "multiply",
        },
      ])
      .png()
      .toBuffer()

    const timestamp = Date.now()
    const filename = `tshirt-preview-${timestamp}.png`

    console.log("☁️ Uploading composite image to Supabase Storage:", filename)

    const imageUrl = await uploadToSupabase(compositeImage, "tshirt-previews", filename, "image/png")

    console.log("✅ T-shirt preview generated successfully:", imageUrl)

    return NextResponse.json({
      success: true,
      imageUrl,
      message: "T-shirt preview generated successfully",
    })
  } catch (error) {
    console.error("❌ Error generating t-shirt preview:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
