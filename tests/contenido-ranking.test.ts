import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { obtenerTextosRanking, TEXTOS_RANKING_DEFAULTS } from "../lib/contenido-ranking"

test("los textos nuevos funcionan con contenido anterior y se guardan sin perder otras secciones", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key"
  let guardado: Record<string, unknown> = {
    rankingTitulo: "Nuestro ranking",
    hero_titulo: "Título personalizado",
    terminos: [{ titulo: "Condiciones", contenido: "Texto existente" }],
  }
  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url)
    assert.equal(url.origin, "http://127.0.0.1:54321")
    assert.equal(url.pathname, "/rest/v1/configuracion")
    if (init?.method === "POST") {
      const [fila] = JSON.parse(String(init.body))
      assert.equal(fila.clave, "contenido_sitio")
      guardado = JSON.parse(fila.valor)
      return new Response(null, { status: 201 })
    }
    assert.equal(url.searchParams.get("clave"), "eq.contenido_sitio")
    return new Response(JSON.stringify({ valor: JSON.stringify(guardado) }), {
      headers: { "Content-Type": "application/json" },
    })
  })

  try {
    const { obtenerContenido, actualizarContenido } = await import("../lib/contenido")
    const anterior = await obtenerContenido()
    assert.equal(anterior.rankingTitulo, "Nuestro ranking")
    assert.equal(anterior.rankingCtaBoton, TEXTOS_RANKING_DEFAULTS.rankingCtaBoton)
    assert.equal(anterior.rankingPremiosFinal, TEXTOS_RANKING_DEFAULTS.rankingPremiosFinal)

    const cambios = {
      rankingCtaBoton: "Quiero participar",
      rankingTopActivo: "Nuestros {cantidad} líderes",
      rankingPremiosFinal: "¡Felicitaciones a los ganadores!",
      rankingVacio: "",
    }
    assert.equal(await actualizarContenido(cambios), true)
    const recargado = await obtenerContenido()
    for (const [clave, texto] of Object.entries(cambios)) {
      assert.equal(recargado[clave as keyof typeof cambios], texto)
    }
    assert.equal(recargado.hero_titulo, anterior.hero_titulo)
    assert.deepEqual(recargado.terminos, anterior.terminos)
    assert.equal(recargado.rankingTitulo, anterior.rankingTitulo)
    assert.equal("rankingCargando" in guardado, false)

    const textos = obtenerTextosRanking(recargado)
    assert.equal(textos.rankingCtaBoton, "Quiero participar")
    assert.equal("hero_titulo" in textos, false)
    assert.equal("terminos" in textos, false)
  } finally {
    fetchMock.mock.restore()
  }
})
