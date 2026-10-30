"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type {
  ConfiguracionTransferencia,
  CuentaTransferencia,
} from "@/lib/supabase";

interface EditarCuentaTransferenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  argentina: CuentaTransferencia;
  paraguay: CuentaTransferencia;
  avisoTitulo: string;
  avisoTexto: string;
  onGuardado: (config: ConfiguracionTransferencia) => void;
}

export function EditarCuentaTransferenciaModal({
  isOpen,
  onClose,
  argentina,
  paraguay,
  avisoTitulo,
  avisoTexto,
  onGuardado,
}: EditarCuentaTransferenciaModalProps) {
  const [argentinaValue, setArgentinaValue] = useState(argentina);
  const [paraguayValue, setParaguayValue] = useState(paraguay);
  const [avisoTituloValue, setAvisoTituloValue] = useState(avisoTitulo);
  const [avisoTextoValue, setAvisoTextoValue] = useState(avisoTexto);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setArgentinaValue(argentina);
    setParaguayValue(paraguay);
    setAvisoTituloValue(avisoTitulo);
    setAvisoTextoValue(avisoTexto);
  }, [isOpen, argentina, paraguay, avisoTitulo, avisoTexto]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !argentinaValue.etiqueta.trim() ||
      !argentinaValue.identificador.trim() ||
      !argentinaValue.titular.trim()
    ) {
      toast({
        variant: "destructive",
        title: "Cuenta argentina incompleta",
        description: "Completá la etiqueta, el dato bancario y el titular.",
      });
      return;
    }

    const paraguayTieneDatos = Boolean(
      paraguayValue.banco.trim() ||
        paraguayValue.identificador.trim() ||
        paraguayValue.titular.trim(),
    );
    if (
      paraguayTieneDatos &&
      (!paraguayValue.etiqueta.trim() ||
        !paraguayValue.identificador.trim() ||
        !paraguayValue.titular.trim())
    ) {
      toast({
        variant: "destructive",
        title: "Cuenta paraguaya incompleta",
        description:
          "Completá todos los datos para habilitar Paraguay en la compra.",
      });
      return;
    }

    if (!avisoTituloValue.trim() || !avisoTextoValue.trim()) {
      toast({
        variant: "destructive",
        title: "Aviso incompleto",
        description: "El título y el texto del aviso no pueden estar vacíos.",
      });
      return;
    }

    setLoading(true);
    try {
      const nuevaConfig: ConfiguracionTransferencia = {
        argentina: limpiarCuenta(argentinaValue),
        paraguay: limpiarCuenta(paraguayValue),
        avisoTitulo: avisoTituloValue.trim(),
        avisoTexto: avisoTextoValue.trim(),
      };

      const response = await fetch("/api/configuracion-transferencia", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaConfig),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Error al guardar");
      }

      toast({
        title: "Cuentas actualizadas",
        description: paraguayTieneDatos
          ? "Argentina y Paraguay ya están disponibles para transferencias."
          : "Se actualizó la cuenta argentina. Paraguay seguirá deshabilitado.",
      });
      onGuardado(nuevaConfig);
      onClose();
    } catch (error) {
      console.error("Error actualizando cuentas de transferencia:", error);
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description:
          error instanceof Error ? error.message : "Intentá nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const paraguayHabilitado = Boolean(
    paraguayValue.identificador.trim() && paraguayValue.titular.trim(),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-gray-700 bg-card-dark sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            Cuentas para transferencias
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            La compra mostrará los datos bancarios del país elegido por el
            cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AccountFields
            flag="🇦🇷"
            title="Argentina"
            description="Cuenta principal en pesos argentinos (ARS)."
            value={argentinaValue}
            onChange={setArgentinaValue}
          />

          <AccountFields
            flag="🇵🇾"
            title="Paraguay"
            description={
              paraguayHabilitado
                ? "Cuenta habilitada en guaraníes (PYG)."
                : "Se habilita automáticamente al completar cuenta y titular."
            }
            value={paraguayValue}
            onChange={setParaguayValue}
            optional
          />

          <div className="space-y-3 border-t border-gray-700 pt-5">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Aviso previo a la transferencia
              </h3>
              <p className="mt-0.5 text-xs text-gray-400">
                Este mensaje se muestra después de elegir el país.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avisoTitulo" className="text-white">
                Título del aviso
              </Label>
              <Input
                id="avisoTitulo"
                value={avisoTituloValue}
                onChange={(event) => setAvisoTituloValue(event.target.value)}
                className="border-gray-600 bg-gray-800 text-white"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avisoTexto" className="text-white">
                Texto del aviso
              </Label>
              <Textarea
                id="avisoTexto"
                value={avisoTextoValue}
                onChange={(event) => setAvisoTextoValue(event.target.value)}
                className="min-h-[110px] border-gray-600 bg-gray-800 text-white"
                maxLength={600}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="btn-neon">
              {loading ? "Guardando..." : "Guardar cuentas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountFields({
  flag,
  title,
  description,
  value,
  onChange,
  optional = false,
}: {
  flag: string;
  title: string;
  description: string;
  value: CuentaTransferencia;
  onChange: (value: CuentaTransferencia) => void;
  optional?: boolean;
}) {
  return (
    <section className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">
            <span className="mr-2" aria-hidden="true">
              {flag}
            </span>
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        </div>
        {optional ? (
          <span className="rounded-full border border-gray-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Opcional
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Banco</Label>
          <Input
            value={value.banco}
            onChange={(event) =>
              onChange({ ...value, banco: event.target.value })
            }
            placeholder="Ej: Banco Nacional"
            className="border-gray-600 bg-gray-800 text-white"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Titular</Label>
          <Input
            value={value.titular}
            onChange={(event) =>
              onChange({ ...value, titular: event.target.value })
            }
            placeholder="Nombre y apellido"
            className="border-gray-600 bg-gray-800 text-white"
            maxLength={150}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Etiqueta del dato</Label>
          <Input
            value={value.etiqueta}
            onChange={(event) =>
              onChange({ ...value, etiqueta: event.target.value })
            }
            placeholder="Alias, CBU o Número de cuenta"
            className="border-gray-600 bg-gray-800 text-white"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Dato para copiar</Label>
          <Input
            value={value.identificador}
            onChange={(event) =>
              onChange({ ...value, identificador: event.target.value })
            }
            placeholder="Alias, CBU o número"
            className="border-gray-600 bg-gray-800 font-mono text-white"
            maxLength={120}
          />
        </div>
      </div>
    </section>
  );
}

function limpiarCuenta(cuenta: CuentaTransferencia): CuentaTransferencia {
  return {
    banco: cuenta.banco.trim(),
    etiqueta: cuenta.etiqueta.trim(),
    identificador: cuenta.identificador.trim(),
    titular: cuenta.titular.trim(),
  };
}
