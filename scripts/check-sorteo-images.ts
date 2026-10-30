import { obtenerSorteoActivo } from "../lib/database"

async function checkImages() {
  const sorteo = await obtenerSorteoActivo()

  if (!sorteo) {
    console.log("❌ No se encontró sorteo activo")
    return
  }

  console.log("📊 Sorteo activo:", sorteo.nombre)
  console.log("\n🖼️ Imágenes configuradas:")
  console.log("carousel_image_1:", sorteo.carousel_image_1)
  console.log("carousel_image_2:", sorteo.carousel_image_2)
  console.log("carousel_image_3:", sorteo.carousel_image_3)
  console.log("carousel_image_4:", sorteo.carousel_image_4)
  console.log("imagen_url:", sorteo.imagen_url)

  const imagenEmail = sorteo.carousel_image_1 || sorteo.imagen_url
  console.log("\n📧 Imagen que se usará en el email:", imagenEmail)
}

checkImages()
