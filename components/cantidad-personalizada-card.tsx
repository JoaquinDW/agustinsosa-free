"use client";

import { useState } from "react";
import { Info, Minus, Pencil, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatearMonto } from "@/lib/moneda";
import { aplicarDescuento } from "@/lib/promos";
import {
  MAX_CHANCES_PERSONALIZADAS,
  obtenerPrecioTransferencia,
} from "@/lib/precios-transferencia";
import type { PaisTransferencia, Sorteo } from "@/lib/supabase";

function precioSeguro(sorteo: Sorteo, cantidad: number, pais: PaisTransferencia) {
  try {
    return obtenerPrecioTransferencia(sorteo, cantidad, pais).monto;
  } catch {
    return 0;
  }
}

export function CantidadPersonalizadaCard({
  sorteo,
  chancesRestantes,
  promoPorcentaje,
  onComprar,
}: {
  sorteo: Sorteo;
  chancesRestantes: number;
  promoPorcentaje: (cantidad: number) => number | undefined;
  onComprar: (pack: {
    chances: number;
    precio: number;
    precioParaguay: number;
  }) => void;
}) {
  const maximo = Math.max(
    1,
    Math.min(MAX_CHANCES_PERSONALIZADAS, Math.floor(chancesRestantes)),
  );
  const [cantidad, setCantidad] = useState(1);
  const [texto, setTexto] = useState("1");

  const fijar = (valor: number) => {
    const limitado = Math.min(maximo, Math.max(1, Math.round(valor) || 1));
    setCantidad(limitado);
    setTexto(String(limitado));
  };

  const precioArgentina = precioSeguro(sorteo, cantidad, "AR");
  const precioParaguay = precioSeguro(sorteo, cantidad, "PY");
  const porcentaje = promoPorcentaje(cantidad);
  const conPromo = (monto: number) =>
    porcentaje ? aplicarDescuento(monto, porcentaje) : monto;

  if (precioArgentina <= 0) return null;

  return (
    <div className="pack-card cantidad-libre-card relative">
      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="mb-5 flex items-center gap-4">
          <span className="cantidad-libre-icono" aria-hidden="true">
            <Pencil className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="cantidad-libre-titulo">Elegí tu propia cantidad</h3>
            <p className="text-sm text-zinc-400">
              Comprá la cantidad de chances que quieras
            </p>
          </div>
        </div>

        <div className="cantidad-libre-panel">
          <div className="flex flex-col justify-center gap-3">
            <label
              htmlFor="cantidad-libre-input"
              className="text-xs font-bold uppercase tracking-wider text-zinc-300"
            >
              Cantidad de chances
            </label>
            <div className="cantidad-libre-stepper">
              <button
                type="button"
                className="cantidad-libre-btn cantidad-libre-btn-menos"
                onClick={() => fijar(cantidad - 1)}
                disabled={cantidad <= 1}
                aria-label="Restar una chance"
              >
                <Minus className="h-5 w-5" />
              </button>
              <input
                id="cantidad-libre-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={maximo}
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  const valor = Number(e.target.value);
                  if (Number.isInteger(valor) && valor >= 1 && valor <= maximo) {
                    setCantidad(valor);
                  }
                }}
                onBlur={() => fijar(Number(texto))}
                className="cantidad-libre-input"
              />
              <button
                type="button"
                className="cantidad-libre-btn cantidad-libre-btn-mas"
                onClick={() => fijar(cantidad + 1)}
                disabled={cantidad >= maximo}
                aria-label="Sumar una chance"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="cantidad-libre-precios">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Precio total
            </span>
            <div className="fixed-prices">
              <div className="fixed-price fixed-price-ar">
                <span className="fixed-price-flag" aria-hidden="true">
                  🇦🇷
                </span>
                <span className="sr-only">Argentina:</span>
                <span className="fixed-price-divider" aria-hidden="true" />
                <span className="fixed-price-amount">
                  {formatearMonto(conPromo(precioArgentina), "ARS")}
                </span>
              </div>
              {precioParaguay > 0 ? (
                <div className="fixed-price fixed-price-py">
                  <span className="fixed-price-flag" aria-hidden="true">
                    🇵🇾
                  </span>
                  <span className="sr-only">Paraguay:</span>
                  <span className="fixed-price-divider" aria-hidden="true" />
                  <span className="fixed-price-amount">
                    {formatearMonto(conPromo(precioParaguay), "PYG")}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <Button
            onClick={() =>
              onComprar({ chances: cantidad, precio: precioArgentina, precioParaguay })
            }
            className="btn-neon-pill col-span-full h-auto w-full whitespace-nowrap rounded-full px-5 py-3 text-sm sm:px-8 sm:text-base"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Comprar ahora
          </Button>

          <p className="col-span-full flex items-start gap-2 text-xs text-zinc-500">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            El precio se calcula automáticamente según la cantidad de chances
            que elijas.
          </p>
        </div>
      </div>
    </div>
  );
}
