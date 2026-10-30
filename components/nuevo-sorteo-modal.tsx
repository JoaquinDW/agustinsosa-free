"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

interface NuevoSorteoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSorteoCreado: () => void;
}

export function NuevoSorteoModal({
  open,
  onOpenChange,
  onSorteoCreado,
}: NuevoSorteoModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    totalChances: 150,
    fechaSorteo: "",
    cantidadPack1: 6,
    cantidadPack2: 12,
    cantidadPack3: 24,
    precio6: 21000,
    precio12: 42000,
    precio24: 84000,
    precioPack1Pyg: 147000,
    precioPack2Pyg: 294000,
    precioPack3Pyg: 588000,
    descripcionPack1: "",
    descripcionPack2: "",
    descripcionPack3: "",
    cantidadPack4: 0,
    precio4: 0,
    precioPack4Pyg: 0,
    descripcionPack4: "",
    pack4Visible: false,
    cantidadPack5: 0,
    precio5: 0,
    precioPack5Pyg: 0,
    descripcionPack5: "",
    pack5Visible: false,
  });

  const formatearPrecio = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    return numeros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parsearPrecio = (valor: string) => {
    return Number.parseInt(valor.replace(/\./g, "")) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/crear-sorteo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSorteoCreado();
        onOpenChange(false);
        setFormData({
          nombre: "",
          totalChances: 150,
          fechaSorteo: "",
          cantidadPack1: 6,
          cantidadPack2: 12,
          cantidadPack3: 24,
          precio6: 21000,
          precio12: 42000,
          precio24: 84000,
          precioPack1Pyg: 147000,
          precioPack2Pyg: 294000,
          precioPack3Pyg: 588000,
          descripcionPack1: "",
          descripcionPack2: "",
          descripcionPack3: "",
          cantidadPack4: 0,
          precio4: 0,
          precioPack4Pyg: 0,
          descripcionPack4: "",
          pack4Visible: false,
          cantidadPack5: 0,
          precio5: 0,
          precioPack5Pyg: 0,
          descripcionPack5: "",
          pack5Visible: false,
        });
      }
    } catch (error) {
      console.error("Error creando sorteo:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card-dark border-gray-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-400" />
            Crear Nuevo Sorteo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-gray-300">
              Nombre del Sorteo
            </Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="Ej: T-SHIRT PREMIUM - SORTEO EXCLUSIVO"
              required
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalChances" className="text-gray-300">
                Total Chances
              </Label>
              <Input
                id="totalChances"
                type="number"
                value={formData.totalChances}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    totalChances: Number(e.target.value),
                  })
                }
                min="1"
                required
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaSorteo" className="text-gray-300">
                Fecha del Sorteo
              </Label>
              <Input
                id="fechaSorteo"
                type="date"
                value={formData.fechaSorteo}
                onChange={(e) =>
                  setFormData({ ...formData, fechaSorteo: e.target.value })
                }
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Pack 1 */}
          <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
            <h3 className="font-semibold text-green-400">Pack 1</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pack1-descripcion" className="text-gray-300">
                  Línea principal
                </Label>
                <Input
                  id="pack1-descripcion"
                  type="text"
                  value={formData.descripcionPack1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descripcionPack1: e.target.value,
                    })
                  }
                  placeholder="Ej: Honda Wave 2025"
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="pack1-cantidad" className="text-gray-300">
                    Cantidad de chances
                  </Label>
                  <Input
                    id="pack1-cantidad"
                    type="number"
                    min="1"
                    value={formData.cantidadPack1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cantidadPack1: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="pack1-precio" className="text-gray-300">
                    Precio ARS
                  </Label>
                  <Input
                    id="pack1-precio"
                    type="text"
                    value={formatearPrecio(formData.precio6.toString())}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precio6: parsearPrecio(e.target.value),
                      })
                    }
                    placeholder="21.000"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="pack1-precio-pyg" className="text-gray-300">
                    Precio PYG
                  </Label>
                  <Input
                    id="pack1-precio-pyg"
                    type="text"
                    value={formatearPrecio(formData.precioPack1Pyg.toString())}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precioPack1Pyg: parsearPrecio(e.target.value),
                      })
                    }
                    placeholder="147.000"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pack 2 */}
          <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
            <h3 className="font-semibold text-lime-400">Pack 2 (Popular)</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pack2-descripcion" className="text-gray-300">
                  Línea principal
                </Label>
                <Input
                  id="pack2-descripcion"
                  type="text"
                  value={formData.descripcionPack2}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descripcionPack2: e.target.value,
                    })
                  }
                  placeholder="Ej: Honda Wave 2025 + 5 oportunidades en pre-venta"
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="pack2-cantidad" className="text-gray-300">
                    Cantidad de chances
                  </Label>
                  <Input
                    id="pack2-cantidad"
                    type="number"
                    min="1"
                    value={formData.cantidadPack2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cantidadPack2: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="pack2-precio" className="text-gray-300">
                    Precio ARS
                  </Label>
                  <Input
                    id="pack2-precio"
                    type="text"
                    value={formatearPrecio(formData.precio12.toString())}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precio12: parsearPrecio(e.target.value),
                      })
                    }
                    placeholder="42.000"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="pack2-precio-pyg" className="text-gray-300">
                    Precio PYG
                  </Label>
                  <Input
                    id="pack2-precio-pyg"
                    type="text"
                    value={formatearPrecio(formData.precioPack2Pyg.toString())}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precioPack2Pyg: parsearPrecio(e.target.value),
                      })
                    }
                    placeholder="294.000"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pack 3 */}
          <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
            <h3 className="font-semibold text-emerald-400">Pack 3</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pack3-descripcion" className="text-gray-300">
                  Línea principal
                </Label>
                <Input
                  id="pack3-descripcion"
                  type="text"
                  value={formData.descripcionPack3}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descripcionPack3: e.target.value,
                    })
                  }
                  placeholder="Ej: Honda Wave 2025 + 5 chances pre-venta"
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="pack3-cantidad" className="text-gray-300">
                    Cantidad de chances
                  </Label>
                  <Input
                    id="pack3-cantidad"
                    type="number"
                    min="1"
                    value={formData.cantidadPack3}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cantidadPack3: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="pack3-precio" className="text-gray-300">
                    Precio ARS
                  </Label>
                  <Input
                    id="pack3-precio"
                    type="text"
                    value={formatearPrecio(formData.precio24.toString())}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precio24: parsearPrecio(e.target.value),
                      })
                    }
                    placeholder="84.000"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="pack3-precio-pyg" className="text-gray-300">
                    Precio PYG
                  </Label>
                  <Input
                    id="pack3-precio-pyg"
                    type="text"
                    value={formatearPrecio(formData.precioPack3Pyg.toString())}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precioPack3Pyg: parsearPrecio(e.target.value),
                      })
                    }
                    placeholder="588.000"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pack 4 */}
          <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-teal-400">Pack 4 (opcional)</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="nuevo-pack4-visible"
                  checked={formData.pack4Visible}
                  onChange={(e) =>
                    setFormData({ ...formData, pack4Visible: e.target.checked })
                  }
                  className="w-4 h-4 cursor-pointer"
                />
                <Label
                  htmlFor="nuevo-pack4-visible"
                  className="text-sm text-gray-300 cursor-pointer"
                >
                  Visible
                </Label>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="nuevo-pack4-descripcion"
                  className="text-gray-300"
                >
                  Línea principal
                </Label>
                <Input
                  id="nuevo-pack4-descripcion"
                  type="text"
                  value={formData.descripcionPack4}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descripcionPack4: e.target.value,
                    })
                  }
                  placeholder="Descripción del pack 4"
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label
                    htmlFor="nuevo-pack4-cantidad"
                    className="text-gray-300"
                  >
                    Cantidad de chances
                  </Label>
                  <Input
                    id="nuevo-pack4-cantidad"
                    type="number"
                    min="0"
                    value={formData.cantidadPack4}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cantidadPack4: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="nuevo-pack4-precio" className="text-gray-300">
                    Precio ARS
                  </Label>
                  <Input
                    id="nuevo-pack4-precio"
                    type="text"
                    value={formatearPrecio(formData.precio4.toString())}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precio4: parsearPrecio(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="nuevo-pack4-precio-pyg"
                    className="text-gray-300"
                  >
                    Precio PYG
                  </Label>
                  <Input
                    id="nuevo-pack4-precio-pyg"
                    type="text"
                    value={formatearPrecio(formData.precioPack4Pyg.toString())}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precioPack4Pyg: parsearPrecio(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pack 5 */}
          <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-cyan-400">Pack 5 (opcional)</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="nuevo-pack5-visible"
                  checked={formData.pack5Visible}
                  onChange={(e) =>
                    setFormData({ ...formData, pack5Visible: e.target.checked })
                  }
                  className="w-4 h-4 cursor-pointer"
                />
                <Label
                  htmlFor="nuevo-pack5-visible"
                  className="text-sm text-gray-300 cursor-pointer"
                >
                  Visible
                </Label>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="nuevo-pack5-descripcion"
                  className="text-gray-300"
                >
                  Línea principal
                </Label>
                <Input
                  id="nuevo-pack5-descripcion"
                  type="text"
                  value={formData.descripcionPack5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descripcionPack5: e.target.value,
                    })
                  }
                  placeholder="Descripción del pack 5"
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label
                    htmlFor="nuevo-pack5-cantidad"
                    className="text-gray-300"
                  >
                    Cantidad de chances
                  </Label>
                  <Input
                    id="nuevo-pack5-cantidad"
                    type="number"
                    min="0"
                    value={formData.cantidadPack5}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cantidadPack5: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="nuevo-pack5-precio" className="text-gray-300">
                    Precio ARS
                  </Label>
                  <Input
                    id="nuevo-pack5-precio"
                    type="text"
                    value={formatearPrecio(formData.precio5.toString())}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precio5: parsearPrecio(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="nuevo-pack5-precio-pyg"
                    className="text-gray-300"
                  >
                    Precio PYG
                  </Label>
                  <Input
                    id="nuevo-pack5-precio-pyg"
                    type="text"
                    value={formatearPrecio(formData.precioPack5Pyg.toString())}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precioPack5Pyg: parsearPrecio(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Sorteo
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
