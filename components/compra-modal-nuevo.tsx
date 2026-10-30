"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, LockKeyhole, ShoppingCart } from "lucide-react";
import { TransferenciaModal } from "./transferencia-modal";
import type {
  ConfiguracionTransferencia,
  PaisTransferencia,
} from "@/lib/supabase";
import { formatearMonto } from "@/lib/moneda";
import { aplicarDescuento } from "@/lib/promos";

interface CompraModalProps {
  promoPorcentaje?: number;
  isOpen: boolean;
  onClose: () => void;
  pack: {
    chances: number;
    precio: number;
    precioParaguay: number;
    sorteoId?: string;
  } | null;
  // Mercado Pago deshabilitado: no volver a exponer este callback.
  // onCompraMercadoPago: (nombre: string, email: string, contacto: string) => void;
  onCompraTransferencia: (data: {
    nombre: string;
    email: string;
    telefono: string;
    comprobanteFile: File;
    paisTransferencia: PaisTransferencia;
  }) => void;
}

const CONFIG_DEFAULT: ConfiguracionTransferencia = {
  argentina: {
    banco: "",
    etiqueta: "Alias",
    identificador: "sosamotos",
    titular: "Agustín Sosa",
  },
  paraguay: {
    banco: "",
    etiqueta: "Número de cuenta",
    identificador: "",
    titular: "",
  },
  avisoTitulo: "IMPORTANTE — TRANSFERENCIAS",
  avisoTexto:
    "Las transferencias deben estar emitidas a nombre de la misma persona que completa este formulario (nombre y apellido). Si el titular de la transferencia no coincide, la compra se anula directamente sin excepción.",
};

export function CompraModalNuevo({
  isOpen,
  onClose,
  pack,
  promoPorcentaje,
  onCompraTransferencia,
}: CompraModalProps) {
  const [paisTransferencia, setPaisTransferencia] =
    useState<PaisTransferencia | null>(null);
  const [configTransferencia, setConfigTransferencia] =
    useState<ConfiguracionTransferencia>(CONFIG_DEFAULT);

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/configuracion-transferencia", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.argentina && data.paraguay) setConfigTransferencia(data);
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setPaisTransferencia(null);
  }, [isOpen]);

  const handleClose = () => {
    setPaisTransferencia(null);
    onClose();
  };

  if (!pack) return null;

  const cuentaSeleccionada =
    paisTransferencia === "PY"
      ? configTransferencia.paraguay
      : configTransferencia.argentina;
  const paraguayDisponible = Boolean(
    configTransferencia.paraguay.identificador.trim() &&
      configTransferencia.paraguay.titular.trim() &&
      pack.precioParaguay > 0,
  );

  const seleccionarPais = (pais: PaisTransferencia) => {
    if (pais === "PY" && !paraguayDisponible) return;
    setPaisTransferencia(pais);
  };

  return (
    <>
      <Dialog
        open={isOpen && paisTransferencia === null}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent className="overflow-hidden border border-[#ff174d]/40 bg-[#0d0d0f] p-0 text-white shadow-[0_0_60px_rgba(255,0,64,0.18)] sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Elegí desde dónde transferís</DialogTitle>
          </DialogHeader>

          <div className="relative px-6 pb-7 pt-10 sm:px-8">
            <div className="pointer-events-none absolute inset-x-10 top-0 h-28 rounded-full bg-[#ff0040]/10 blur-3xl" />
            <div className="relative text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#ff174d]/70 bg-[#ff0040]/10 shadow-[0_0_28px_rgba(255,0,64,0.35)]">
                <ShoppingCart className="h-6 w-6 text-[#ff174d]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                ¿Desde dónde querés comprar?
              </h2>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                Elegí el país desde el que vas a hacer la transferencia.
              </p>
            </div>

            <div className="relative mt-7 space-y-3">
              {/* Mercado Pago deshabilitado: únicamente transferencia. */}
              {/* <CountryButton flag="🇦🇷" label="Pagar con MercadoPago" price={formatearMonto(promoPorcentaje ? aplicarDescuento(pack.precio, promoPorcentaje) : pack.precio, "ARS")} originalPrice={promoPorcentaje ? formatearMonto(pack.precio, "ARS") : undefined} onClick={() => setMercadoPago(true)} /> */}
              <CountryButton
                flag="🇦🇷"
                label="Comprar desde Argentina"
                price={formatearMonto(promoPorcentaje ? aplicarDescuento(pack.precio, promoPorcentaje) : pack.precio, "ARS")}
                originalPrice={promoPorcentaje ? formatearMonto(pack.precio, "ARS") : undefined}
                onClick={() => seleccionarPais("AR")}
              />
              <CountryButton
                flag="🇵🇾"
                label="Comprar desde Paraguay"
                price={
                  paraguayDisponible
                    ? formatearMonto(promoPorcentaje ? aplicarDescuento(pack.precioParaguay, promoPorcentaje) : pack.precioParaguay, "PYG")
                    : "Cuenta pendiente de configuración"
                }
                originalPrice={promoPorcentaje && paraguayDisponible ? formatearMonto(pack.precioParaguay, "PYG") : undefined}
                disabled={!paraguayDisponible}
                onClick={() => seleccionarPais("PY")}
              />
            </div>

            <div className="mt-7 flex items-center gap-3 text-center text-xs text-zinc-500">
              <span className="h-px flex-1 bg-zinc-800" />
              <LockKeyhole className="h-4 w-4 shrink-0" />
              <span>Verás los datos bancarios del país elegido</span>
              <span className="h-px flex-1 bg-zinc-800" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mercado Pago deshabilitado: el formulario queda comentado y oculto.
      <Dialog open={isOpen && mercadoPago} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="border border-[#ff174d]/40 bg-[#0d0d0f] text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Pagar con MercadoPago</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-400">{pack.chances} chances · {promoPorcentaje ? <span className="mr-2 line-through">{formatearMonto(pack.precio, "ARS")}</span> : null}<strong className="text-white">{formatearMonto(promoPorcentaje ? aplicarDescuento(pack.precio, promoPorcentaje) : pack.precio, "ARS")}</strong></p>
          <form className="space-y-4" onSubmit={(evento) => {
            evento.preventDefault();
            if (!datosMP.nombre.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datosMP.email.trim()) || !normalizarTelefono(datosMP.telefono, "AR")) { setErrorMP("Completá nombre, email y WhatsApp válido."); return; }
            setErrorMP("");
            onCompraMercadoPago(datosMP.nombre.trim(), datosMP.email.trim(), datosMP.telefono.trim());
          }}>
            <div><Label htmlFor="mp-nombre">Nombre y apellido</Label><Input id="mp-nombre" value={datosMP.nombre} onChange={(e) => setDatosMP({ ...datosMP, nombre: e.target.value })} className="bg-zinc-900" required /></div>
            <div><Label htmlFor="mp-email">Email</Label><Input id="mp-email" type="email" value={datosMP.email} onChange={(e) => setDatosMP({ ...datosMP, email: e.target.value })} className="bg-zinc-900" required /></div>
            <div><Label htmlFor="mp-telefono">WhatsApp</Label><Input id="mp-telefono" type="tel" value={datosMP.telefono} onChange={(e) => setDatosMP({ ...datosMP, telefono: e.target.value })} className="bg-zinc-900" required /></div>
            {errorMP && <p role="alert" className="text-sm text-red-400">{errorMP}</p>}
            <button type="submit" className="btn-neon-pill w-full rounded-full px-5 py-3 font-bold">Continuar a MercadoPago</button>
          </form>
        </DialogContent>
      </Dialog>
      */}

      <TransferenciaModal
        isOpen={isOpen && paisTransferencia !== null}
        onClose={handleClose}
        onChangeCountry={() => setPaisTransferencia(null)}
        pack={{
          chances: pack.chances,
          precio:
            promoPorcentaje ? aplicarDescuento(paisTransferencia === "PY" ? pack.precioParaguay : pack.precio, promoPorcentaje) : (paisTransferencia === "PY" ? pack.precioParaguay : pack.precio),
          precioLista: promoPorcentaje ? (paisTransferencia === "PY" ? pack.precioParaguay : pack.precio) : undefined,
        }}
        onSubmit={onCompraTransferencia}
        pais={paisTransferencia || "AR"}
        cuenta={cuentaSeleccionada}
        avisoTitulo={configTransferencia.avisoTitulo}
        avisoTexto={configTransferencia.avisoTexto}
      />
    </>
  );
}

function CountryButton({
  flag,
  label,
  price,
  originalPrice,
  disabled = false,
  onClick,
}: {
  flag: string;
  label: string;
  price: string;
  originalPrice?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-4 rounded-2xl border border-[#ff4d72]/70 bg-gradient-to-r from-[#ff2859] to-[#df0038] px-5 py-4 text-left shadow-[0_10px_30px_rgba(255,0,64,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5c7e] disabled:cursor-not-allowed disabled:border-zinc-700 disabled:from-zinc-800 disabled:to-zinc-900 disabled:opacity-60 disabled:shadow-none"
    >
      <span className="text-3xl" aria-hidden="true">
        {flag}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold">{label}</span>
        <span className="block text-xs text-white/75">{originalPrice ? <span className="mr-2 line-through opacity-70">{originalPrice}</span> : null}{price}</span>
      </span>
      <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
    </button>
  );
}
