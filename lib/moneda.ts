import type { Moneda, PaisTransferencia } from "./supabase";

export const PAISES_TRANSFERENCIA: Record<
  PaisTransferencia,
  { nombre: string; bandera: string; moneda: Moneda }
> = {
  AR: { nombre: "Argentina", bandera: "🇦🇷", moneda: "ARS" },
  PY: { nombre: "Paraguay", bandera: "🇵🇾", moneda: "PYG" },
};

export function formatearMonto(monto: number, moneda: Moneda = "ARS"): string {
  const locale = moneda === "PYG" ? "es-PY" : "es-AR";
  const prefijo = moneda === "PYG" ? "₲" : "AR$";

  return `${prefijo} ${monto.toLocaleString(locale, {
    maximumFractionDigits: 0,
  })}`;
}

export function monedaDePais(pais: PaisTransferencia): Moneda {
  return PAISES_TRANSFERENCIA[pais].moneda;
}
