// Script para verificar datos en Supabase
const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = "https://ambvsbgwukdhnxfvdgeh.supabase.co"
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtYnZzYmd3dWtkaG54ZnZkZ2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYzMzYyMCwiZXhwIjoyMDY5MjA5NjIwfQ.FtzabRaRNfjTb98lmmL39Mrg_HLrzCTw98cNpFnYs6Y"

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verificarDatos() {
  console.log("🔍 Verificando sorteos activos...")
  const { data: sorteos } = await supabase
    .from("sorteos")
    .select("*")
    .order("created_at", { ascending: false })

  console.log("📊 Sorteos encontrados:", sorteos?.length || 0)
  sorteos?.forEach((sorteo) => {
    console.log(`- ${sorteo.nombre} (${sorteo.id}) - Estado: ${sorteo.estado}`)
  })

  console.log("\n🛒 Verificando compradores...")
  const { data: compradores } = await supabase
    .from("compradores")
    .select("*")
    .order("created_at", { ascending: false })

  console.log("👥 Compradores encontrados:", compradores?.length || 0)
  compradores?.forEach((comprador) => {
    console.log(
      `- ${comprador.nombre} (${comprador.sorteo_id}) - Estado: ${comprador.estado_pago}`
    )
    if (comprador.mercadopago_id && comprador.mercadopago_id.includes("blob")) {
      console.log(`  📎 Comprobante: ${comprador.mercadopago_id}`)
    }
  })
}

verificarDatos()
