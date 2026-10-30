"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { actualizarPreciosYCantidadesSorteo } from "@/lib/database";
import type { Sorteo } from "@/lib/supabase";
import {
  actualizarContenido,
  CONTENIDO_DEFAULTS,
  obtenerContenido,
} from "@/lib/contenido";

interface EditarPacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  sorteo: Sorteo;
  onSuccess: () => void;
}

const formatearPrecio = (valor: string) => {
  const numeros = valor.replace(/\D/g, "");
  return numeros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parsearPrecio = (valor: string) => {
  return Number.parseInt(valor.replace(/\./g, "")) || 0;
};

const PackCard = ({
  id,
  label,
  color,
  pack,
  setPack,
  placeholderDesc,
  placeholderPrecio,
  minCantidad = 1,
}: {
  id: string;
  label: string;
  color: string;
  pack: {
    cantidad: number;
    precio: number;
    precioParaguay: number;
    visible: boolean;
    descripcion: string;
  };
  setPack: (p: typeof pack) => void;
  placeholderDesc: string;
  placeholderPrecio: string;
  minCantidad?: number;
}) => (
  <div className="space-y-3 p-3 border rounded-lg">
    <div className="flex items-center justify-between">
      <h3 className={`font-semibold text-sm ${color}`}>{label}</h3>
      <div className="flex items-center space-x-1.5">
        <input
          type="checkbox"
          id={`${id}-visible`}
          checked={pack.visible}
          onChange={(e) => setPack({ ...pack, visible: e.target.checked })}
          className="w-3.5 h-3.5 cursor-pointer"
        />
        <Label htmlFor={`${id}-visible`} className="text-xs cursor-pointer">
          Visible
        </Label>
      </div>
    </div>
    <div>
      <Label htmlFor={`${id}-desc`} className="text-xs">
        Línea principal
      </Label>
      <Input
        id={`${id}-desc`}
        type="text"
        value={pack.descripcion}
        onChange={(e) => setPack({ ...pack, descripcion: e.target.value })}
        placeholder={placeholderDesc}
        className="mt-1 h-8 text-sm"
      />
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label htmlFor={`${id}-cantidad`} className="text-xs">
          Cantidad (número grande)
        </Label>
        <Input
          id={`${id}-cantidad`}
          type="number"
          min={minCantidad}
          max="100"
          value={pack.cantidad}
          onChange={(e) =>
            setPack({
              ...pack,
              cantidad: Number.parseInt(e.target.value) || 0,
            })
          }
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label htmlFor={`${id}-precio`} className="text-xs">
          Precio ARS
        </Label>
        <Input
          id={`${id}-precio`}
          type="text"
          value={formatearPrecio(pack.precio.toString())}
          onChange={(e) =>
            setPack({ ...pack, precio: parsearPrecio(e.target.value) })
          }
          placeholder={placeholderPrecio}
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div>
        <Label htmlFor={`${id}-precio-pyg`} className="text-xs">
          Precio PYG
        </Label>
        <Input
          id={`${id}-precio-pyg`}
          type="text"
          value={formatearPrecio(pack.precioParaguay.toString())}
          onChange={(e) =>
            setPack({
              ...pack,
              precioParaguay: parsearPrecio(e.target.value),
            })
          }
          placeholder="0"
          className="mt-1 h-8 text-sm"
        />
      </div>
    </div>
  </div>
);

export function EditarPacksModal({
  isOpen,
  onClose,
  sorteo,
  onSuccess,
}: EditarPacksModalProps) {
  const [loading, setLoading] = useState(false);
  const [cargandoTextos, setCargandoTextos] = useState(false);
  const { toast } = useToast();
  const [lineaSecundariaSingular, setLineaSecundariaSingular] = useState(
    CONTENIDO_DEFAULTS.packs_linea_secundaria_singular,
  );
  const [lineaSecundariaPlural, setLineaSecundariaPlural] = useState(
    CONTENIDO_DEFAULTS.packs_linea_secundaria_plural,
  );
  const [unidadSingular, setUnidadSingular] = useState(
    CONTENIDO_DEFAULTS.packs_unidad_singular,
  );
  const [unidadPlural, setUnidadPlural] = useState(
    CONTENIDO_DEFAULTS.packs_unidad_plural,
  );

  const [pack1, setPack1] = useState({
    cantidad: sorteo.cantidad_pack_1 || 6,
    precio: sorteo.precio_6_chances || 21000,
    precioParaguay: sorteo.precio_pack_1_pyg || 147000,
    visible: sorteo.pack_1_visible ?? true,
    descripcion: sorteo.descripcion_pack_1 || "Honda Wave 2025",
  });
  const [pack2, setPack2] = useState({
    cantidad: sorteo.cantidad_pack_2 || 12,
    precio: sorteo.precio_12_chances || 42000,
    precioParaguay: sorteo.precio_pack_2_pyg || 294000,
    visible: sorteo.pack_2_visible ?? true,
    descripcion:
      sorteo.descripcion_pack_2 ||
      "Honda Wave 2025 + 5 oportunidades en pre-venta Nueva Titan 2018",
  });
  const [pack3, setPack3] = useState({
    cantidad: sorteo.cantidad_pack_3 || 24,
    precio: sorteo.precio_24_chances || 84000,
    precioParaguay: sorteo.precio_pack_3_pyg || 588000,
    visible: sorteo.pack_3_visible ?? true,
    descripcion:
      sorteo.descripcion_pack_3 ||
      "Honda Wave 2025 + 5 chances pre-venta New Titan 2018",
  });
  const [pack4, setPack4] = useState({
    cantidad: sorteo.cantidad_pack_4 || 0,
    precio: sorteo.precio_pack_4 || 0,
    precioParaguay: sorteo.precio_pack_4_pyg || 0,
    visible: sorteo.pack_4_visible ?? false,
    descripcion: sorteo.descripcion_pack_4 || "",
  });
  const [pack5, setPack5] = useState({
    cantidad: sorteo.cantidad_pack_5 || 0,
    precio: sorteo.precio_pack_5 || 0,
    precioParaguay: sorteo.precio_pack_5_pyg || 0,
    visible: sorteo.pack_5_visible ?? false,
    descripcion: sorteo.descripcion_pack_5 || "",
  });

  useEffect(() => {
    if (!isOpen) return;

    let activo = true;
    setCargandoTextos(true);
    obtenerContenido()
      .then((contenido) => {
        if (!activo) return;
        setUnidadSingular(contenido.packs_unidad_singular);
        setUnidadPlural(contenido.packs_unidad_plural);
        setLineaSecundariaSingular(contenido.packs_linea_secundaria_singular);
        setLineaSecundariaPlural(contenido.packs_linea_secundaria_plural);
      })
      .finally(() => {
        if (activo) setCargandoTextos(false);
      });

    return () => {
      activo = false;
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones
      if (pack1.cantidad <= 0 || pack2.cantidad <= 0 || pack3.cantidad <= 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Las cantidades deben ser mayores a 0",
        });
        return;
      }

      if (pack1.precio <= 0 || pack2.precio <= 0 || pack3.precio <= 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Los precios deben ser mayores a 0",
        });
        return;
      }

      if (
        pack1.precioParaguay <= 0 ||
        pack2.precioParaguay <= 0 ||
        pack3.precioParaguay <= 0
      ) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Los precios de Paraguay deben ser mayores a 0",
        });
        return;
      }

      const packOpcionalInvalido = [pack4, pack5].some(
        (pack) =>
          pack.visible &&
          (pack.cantidad <= 0 || pack.precio <= 0 || pack.precioParaguay <= 0),
      );
      if (packOpcionalInvalido) {
        toast({
          variant: "destructive",
          title: "Pack visible incompleto",
          description:
            "Todo pack visible debe tener chances y precios ARS/PYG mayores a 0.",
        });
        return;
      }

      // Verificar que las cantidades activas sean diferentes entre sí
      const packsActivos = [pack1, pack2, pack3, pack4, pack5].filter(
        (p) => p.visible || p.cantidad > 0,
      );
      const cantidades = packsActivos.map((p) => p.cantidad);
      const cantidadesUnicas = new Set(cantidades);
      if (cantidadesUnicas.size !== cantidades.length) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "Las cantidades de chances deben ser diferentes entre sí",
        });
        return;
      }

      const unidadSingularLimpia = unidadSingular.trim();
      const unidadPluralLimpia = unidadPlural.trim();
      if (!unidadSingularLimpia || !unidadPluralLimpia) {
        toast({
          variant: "destructive",
          title: "Texto de cantidad incompleto",
          description: "Completá las palabras para una y varias chances.",
        });
        return;
      }

      const [packsActualizados, textosActualizados] = await Promise.all([
        actualizarPreciosYCantidadesSorteo(
          sorteo.id,
          pack1,
          pack2,
          pack3,
          pack4,
          pack5,
        ),
        actualizarContenido({
          packs_unidad_singular: unidadSingularLimpia,
          packs_unidad_plural: unidadPluralLimpia,
          packs_linea_secundaria_singular: lineaSecundariaSingular,
          packs_linea_secundaria_plural: lineaSecundariaPlural,
        }),
      ]);

      if (packsActualizados && textosActualizados) {
        toast({
          title: "¡Actualizado!",
          description: "Los packs han sido actualizados correctamente",
        });
        onSuccess();
        onClose();
      } else {
        throw new Error("Error actualizando packs o sus textos");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar los packs",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Packs de Chances</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 overflow-hidden"
        >
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div>
              <h3 className="font-semibold text-sm">Texto de la cantidad</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                La cantidad grande se edita dentro de cada pack. Acá definís la
                palabra que aparece debajo, por ejemplo Número/Números o
                Chance/Chances.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="unidad-singular" className="text-xs">
                  Cuando la cantidad es 1
                </Label>
                <Input
                  id="unidad-singular"
                  value={unidadSingular}
                  onChange={(e) => setUnidadSingular(e.target.value)}
                  placeholder={CONTENIDO_DEFAULTS.packs_unidad_singular}
                  disabled={cargandoTextos}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="unidad-plural" className="text-xs">
                  Cuando la cantidad es mayor a 1
                </Label>
                <Input
                  id="unidad-plural"
                  value={unidadPlural}
                  onChange={(e) => setUnidadPlural(e.target.value)}
                  placeholder={CONTENIDO_DEFAULTS.packs_unidad_plural}
                  disabled={cargandoTextos}
                  className="mt-1 h-8 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div>
              <h3 className="font-semibold text-sm">Línea secundaria</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Se muestra debajo de la línea principal. Usá {"{cantidad}"} para
                insertar automáticamente la cantidad del pack.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="linea-secundaria-singular" className="text-xs">
                  Cuando la cantidad es 1
                </Label>
                <Input
                  id="linea-secundaria-singular"
                  value={lineaSecundariaSingular}
                  onChange={(e) => setLineaSecundariaSingular(e.target.value)}
                  placeholder={
                    CONTENIDO_DEFAULTS.packs_linea_secundaria_singular
                  }
                  disabled={cargandoTextos}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="linea-secundaria-plural" className="text-xs">
                  Cuando la cantidad es mayor a 1
                </Label>
                <Input
                  id="linea-secundaria-plural"
                  value={lineaSecundariaPlural}
                  onChange={(e) => setLineaSecundariaPlural(e.target.value)}
                  placeholder={CONTENIDO_DEFAULTS.packs_linea_secundaria_plural}
                  disabled={cargandoTextos}
                  className="mt-1 h-8 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
            <PackCard
              id="pack1"
              label="Pack 1"
              color="text-green-400"
              pack={pack1}
              setPack={setPack1}
              placeholderDesc="Ej: Honda Wave 2025"
              placeholderPrecio="21.000"
            />
            <PackCard
              id="pack2"
              label="Pack 2 (Popular)"
              color="text-lime-400"
              pack={pack2}
              setPack={setPack2}
              placeholderDesc="Ej: Honda Wave + extras"
              placeholderPrecio="42.000"
            />
            <PackCard
              id="pack3"
              label="Pack 3"
              color="text-emerald-400"
              pack={pack3}
              setPack={setPack3}
              placeholderDesc="Ej: Honda Wave + más extras"
              placeholderPrecio="84.000"
            />
            <PackCard
              id="pack4"
              label="Pack 4"
              color="text-teal-400"
              pack={pack4}
              setPack={setPack4}
              placeholderDesc="Descripción del pack 4"
              placeholderPrecio="0"
              minCantidad={0}
            />
            <PackCard
              id="pack5"
              label="Pack 5"
              color="text-cyan-400"
              pack={pack5}
              setPack={setPack5}
              placeholderDesc="Descripción del pack 5"
              placeholderPrecio="0"
              minCantidad={0}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || cargandoTextos}>
              {loading ? "Actualizando..." : "Actualizar Packs"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
