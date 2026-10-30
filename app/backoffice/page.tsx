"use client";

import { useState, useEffect, useCallback } from "react";
import { CUENTAS_INSTAGRAM } from "@/lib/consentimientos";
import * as XLSX from "xlsx";

// Helper function para detectar si un string es un número de teléfono o un usuario de Instagram
const esNumeroTelefono = (valor: string | undefined): boolean => {
  if (!valor) return false;
  // Si contiene solo números, espacios, +, -, (, ) es un teléfono
  return /^[\d\s+()-]+$/.test(valor);
};
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  DollarSign,
  Pencil,
  Trophy,
  Plus,
  Play,
  History,
  Crown,
  Mail,
  Hash,
  Clock,
  LogOut,
  Info,
  Calendar,
  Target,
  Edit,
  Type,
  MessageCircle,
  ImageIcon,
  Download,
  Trash2,
  Banknote,
  Flag,
  Star,
  Settings,
  ChevronDown,
  ExternalLink,
  Eye,
  Globe2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminLogin } from "@/components/admin-login";
import { CompradoresSearch } from "@/components/compradores-search";
import { TablaPaginacion } from "@/components/tabla-paginacion";
import { ImageUpload } from "@/components/image-upload";
import { NuevoSorteoModal } from "@/components/nuevo-sorteo-modal";
import { RealizarSorteoModal } from "@/components/realizar-sorteo-modal";
import { TransferenciasPendientes } from "@/components/transferencias-pendientes";
import { TShirtMockup } from "@/components/tshirt-mockup";
import { EditarDetallesModal } from "@/components/editar-detalles-modal";
import { EditarPacksModal } from "@/components/editar-packs-modal";
import { EditarTituloModal } from "@/components/editar-titulo-modal";
import { EditarCuentaTransferenciaModal } from "@/components/editar-cuenta-transferencia-modal";
import { EditarFechaSorteoModal } from "@/components/editar-fecha-sorteo-modal";
import { TestSorteos } from "@/components/test-sorteos";
import { CarouselManager } from "@/components/carousel-manager";
import { GestionGanadores } from "@/components/gestion-ganadores";
import { GanadoresExpressModal } from "@/components/ganadores-express-modal";
import { ConfirmarEliminarModal } from "@/components/confirmar-eliminar-modal";
import { FinalizarSorteoModal } from "@/components/finalizar-sorteo-modal";
import { PremiosSecundariosManager } from "@/components/premios-secundarios-manager";
import { ContenidoManager } from "@/components/contenido-manager";
import { ReporteWhatsapp } from "@/components/reporte-whatsapp";
import { RankingBackoffice } from "@/components/ranking-backoffice";
import { generarComprobante as generarComprobanteImagen } from "@/lib/comprobante";
import {
  obtenerSorteoActivo,
  obtenerTodosSorteos,
  obtenerCompradores,
  obtenerCompradoresSorteoActual,
  obtenerEstadisticasSorteo,
  obtenerTransferenciasPendientes,
  aprobarTransferencia,
  rechazarTransferencia,
  actualizarImagenSorteo,
  realizarSorteo,
  finalizarSorteoManual,
  actualizarDetallesSorteo,
  eliminarComprador,
  obtenerConfiguracionTransferencia,
  obtenerPremiosSecundarios,
} from "@/lib/database";
import type {
  Sorteo,
  Comprador,
  ConfiguracionTransferencia,
} from "@/lib/supabase";
import { formatearMonto } from "@/lib/moneda";
import type { PremiosSecundarios } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Switch } from "@/components/ui/switch";

export default function BackofficePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [sitePublished, setSitePublished] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [sorteoActual, setSorteoActual] = useState<Sorteo | null>(null);
  const [todosSorteos, setTodosSorteos] = useState<Sorteo[]>([]);

  // Compradores del sorteo actual (para tab "Compradores")
  const [compradoresActuales, setCompradoresActuales] = useState<Comprador[]>(
    [],
  );
  const [compradoresActualesFiltrados, setCompradoresActualesFiltrados] =
    useState<Comprador[]>([]);

  // Compradores del sorteo seleccionado en histórico
  const [compradoresHistorico, setCompradoresHistorico] = useState<Comprador[]>(
    [],
  );
  const [compradoresHistoricoFiltrados, setCompradoresHistoricoFiltrados] =
    useState<Comprador[]>([]);
  const [sorteoSeleccionadoHistorico, setSorteoSeleccionadoHistorico] =
    useState<string>("");

  // Paginación de las tablas (solo afecta lo renderizado, no la búsqueda/export)
  const [paginaActuales, setPaginaActuales] = useState(1);
  const [porPaginaActuales, setPorPaginaActuales] = useState(50);
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const [porPaginaHistorico, setPorPaginaHistorico] = useState(50);

  // Transferencias pendientes
  const [transferenciasPendientes, setTransferenciasPendientes] = useState<
    Comprador[]
  >([]);

  const [estadisticas, setEstadisticas] = useState({
    totalCompradores: 0,
    chancesVendidas: 0,
    totalRecaudado: 0,
  });
  const [loading, setLoading] = useState(true);
  const [nuevoSorteoModalAbierto, setNuevoSorteoModalAbierto] = useState(false);
  const [realizarSorteoModalAbierto, setRealizarSorteoModalAbierto] =
    useState(false);
  const [finalizarSorteoModalAbierto, setFinalizarSorteoModalAbierto] =
    useState(false);
  const [editarDetallesModalAbierto, setEditarDetallesModalAbierto] =
    useState(false);
  const [editarPacksModalAbierto, setEditarPacksModalAbierto] = useState(false);
  const [editarTituloModalAbierto, setEditarTituloModalAbierto] =
    useState(false);
  const [editarFechaModalAbierto, setEditarFechaModalAbierto] = useState(false);
  const [
    editarCuentaTransferenciaModalAbierto,
    setEditarCuentaTransferenciaModalAbierto,
  ] = useState(false);
  const [configTransferencia, setConfigTransferencia] =
    useState<ConfiguracionTransferencia>({
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
    });
  const [premiosSecundarios, setPremiosSecundarios] =
    useState<PremiosSecundarios>({
      numeros: [],
      monto: "$50 mil",
      titulo: "NÚMEROS BENDECIDOS",
      visible: true,
    });
  const [activeTab, setActiveTab] = useState("informacion");
  const [confirmarEliminarModalAbierto, setConfirmarEliminarModalAbierto] =
    useState(false);
  const [compradorAEliminar, setCompradorAEliminar] =
    useState<Comprador | null>(null);
  const [eliminandoComprador, setEliminandoComprador] = useState(false);
  const { toast } = useToast();

  // La sesión se valida siempre en el servidor; nunca se confía en localStorage.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((session) => {
        if (active) setIsAuthenticated(session.authenticated === true);
      })
      .catch(() => {
        if (active) setIsAuthenticated(false);
      })
      .finally(() => {
        if (active) {
          setAuthChecked(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Cargar datos cuando esté autenticado
  useEffect(() => {
    if (isAuthenticated) {
      cargarDatos();
      cargarVisibilidad();
    }
  }, [isAuthenticated]);

  const cargarVisibilidad = async () => {
    try {
      const response = await fetch("/api/admin/site-visibility", {
        cache: "no-store",
      });
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (!response.ok) throw new Error("No se pudo cargar la visibilidad");
      const result = await response.json();
      setSitePublished(result.published === true);
    } catch (error) {
      console.error("Error cargando visibilidad:", error);
      toast({
        variant: "destructive",
        title: "No se pudo leer el estado del sitio",
        description: "Por seguridad se considera que el sitio está oculto.",
      });
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const [sorteoActivo, sorteos, transferencias, configTransf, premios] =
        await Promise.all([
          obtenerSorteoActivo(),
          obtenerTodosSorteos(),
          obtenerTransferenciasPendientes(),
          obtenerConfiguracionTransferencia(),
          obtenerPremiosSecundarios(),
        ]);

      setSorteoActual(sorteoActivo);
      setTodosSorteos(sorteos);
      setTransferenciasPendientes(transferencias);
      setConfigTransferencia(configTransf);
      setPremiosSecundarios(premios);

      if (sorteoActivo) {
        console.log("🎯 Sorteo Activo:", {
          id: sorteoActivo.id,
          nombre: sorteoActivo.nombre,
          estado: sorteoActivo.estado,
        });

        // Cargar compradores del sorteo actual
        const compradoresSorteoActual = await obtenerCompradoresSorteoActual();
        console.log(
          `📊 Compradores cargados: ${compradoresSorteoActual.length} (filtrando por sorteo: ${sorteoActivo.id})`,
        );

        // Verificar que todos los compradores sean del sorteo correcto
        const compradoresIncorrectos = compradoresSorteoActual.filter(
          (c) => c.sorteo_id !== sorteoActivo.id,
        );
        if (compradoresIncorrectos.length > 0) {
          console.error(
            `⚠️ ERROR: ${compradoresIncorrectos.length} compradores NO son del sorteo activo!`,
            compradoresIncorrectos.slice(0, 3),
          );
        }

        setCompradoresActuales(compradoresSorteoActual);
        setCompradoresActualesFiltrados(compradoresSorteoActual);

        // Cargar estadísticas del sorteo actual
        const stats = await obtenerEstadisticasSorteo(sorteoActivo.id);
        setEstadisticas(stats);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos del backoffice",
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresco liviano solo de transferencias pendientes (para el polling)
  const refrescarTransferenciasPendientes = async () => {
    try {
      const transferencias = await obtenerTransferenciasPendientes();
      setTransferenciasPendientes((prev) => {
        const nuevas = transferencias.length - prev.length;
        if (nuevas > 0) {
          toast({
            title:
              nuevas === 1
                ? "Nueva transferencia pendiente"
                : `${nuevas} nuevas transferencias pendientes`,
            description: "Revisá la pestaña de Transferencias Pendientes.",
          });
        }
        return transferencias;
      });
    } catch (error) {
      // Silencioso: si una iteración del polling falla, reintentamos en la próxima
      console.error("Error refrescando transferencias pendientes:", error);
    }
  };

  // Polling: refresca transferencias pendientes cada 20s mientras el backoffice
  // esté abierto y la pestaña visible. No recarga el resto del backoffice.
  useEffect(() => {
    if (!isAuthenticated) return;

    const INTERVALO_MS = 10000;
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") {
        refrescarTransferenciasPendientes();
      }
    }, INTERVALO_MS);

    return () => clearInterval(intervalo);
  }, [isAuthenticated]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setAuthChecked(true);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      setIsAuthenticated(false);
      setSitePublished(false);
    }
  };

  const handleVisibilityChange = async (published: boolean) => {
    const message = published
      ? "¿Publicar el sitio ahora? Las personas podrán comprar y participar."
      : "¿Ocultar el sitio ahora? El público verá únicamente la pantalla Próximamente.";

    if (!window.confirm(message)) return;

    setUpdatingVisibility(true);
    try {
      const response = await fetch("/api/admin/site-visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "No se pudo guardar");

      setSitePublished(result.published);
      toast({
        title: result.published ? "Sitio publicado" : "Sitio oculto",
        description: result.published
          ? "La web ya está disponible para todo el público."
          : "Sólo las sesiones administrativas pueden ver la web completa.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo cambiar la visibilidad",
        description:
          error instanceof Error ? error.message : "Intentá nuevamente.",
      });
    } finally {
      setUpdatingVisibility(false);
    }
  };

  // Cambiar sorteo en el histórico
  const cambiarSorteoHistorico = async (sorteoId: string) => {
    try {
      setSorteoSeleccionadoHistorico(sorteoId);
      if (sorteoId) {
        const compradoresSorteo = await obtenerCompradores(sorteoId);
        setCompradoresHistorico(compradoresSorteo);
        setCompradoresHistoricoFiltrados(compradoresSorteo);
        setPaginaHistorico(1);
      } else {
        setCompradoresHistorico([]);
        setCompradoresHistoricoFiltrados([]);
        setPaginaHistorico(1);
      }
    } catch (error) {
      console.error("Error cambiando sorteo histórico:", error);
    }
  };

  // Búsqueda para compradores actuales
  const handleSearchActuales = useCallback(
    (query: string, filter: string, numeroExacto: string) => {
      let resultado = compradoresActuales;

      if (query.trim()) {
        const terminoBusqueda = query.toLowerCase().trim();
        resultado = resultado.filter((comprador) => {
          const nombre = comprador.nombre.toLowerCase();
          const email = comprador.email?.toLowerCase() || "";
          const instagram = comprador.instagram_username?.toLowerCase() || "";
          const telefono = comprador.telefono?.toLowerCase() || "";
          return (
            nombre.includes(terminoBusqueda) ||
            email.includes(terminoBusqueda) ||
            instagram.includes(terminoBusqueda) ||
            telefono.includes(terminoBusqueda)
          );
        });
      }

      if (numeroExacto.trim()) {
        const numero = Number.parseInt(numeroExacto);
        resultado = resultado.filter((comprador) =>
          comprador.numeros_asignados.includes(numero),
        );
      }

      if (filter !== "todos") {
        const chances = Number.parseInt(filter);
        resultado = resultado.filter(
          (comprador) => comprador.cantidad_chances === chances,
        );
      }

      setCompradoresActualesFiltrados(resultado);
      setPaginaActuales(1);
    },
    [compradoresActuales],
  );

  // Búsqueda para compradores históricos
  const handleSearchHistorico = useCallback(
    (query: string, filter: string, numeroExacto: string) => {
      let resultado = compradoresHistorico;

      if (query.trim()) {
        const terminoBusqueda = query.toLowerCase().trim();
        resultado = resultado.filter((comprador) => {
          const nombre = comprador.nombre.toLowerCase();
          const email = comprador.email?.toLowerCase() || "";
          const instagram = comprador.instagram_username?.toLowerCase() || "";
          const telefono = comprador.telefono?.toLowerCase() || "";
          return (
            nombre.includes(terminoBusqueda) ||
            email.includes(terminoBusqueda) ||
            instagram.includes(terminoBusqueda) ||
            telefono.includes(terminoBusqueda)
          );
        });
      }

      if (numeroExacto.trim()) {
        const numero = Number.parseInt(numeroExacto);
        resultado = resultado.filter((comprador) =>
          comprador.numeros_asignados.includes(numero),
        );
      }

      if (filter !== "todos") {
        const chances = Number.parseInt(filter);
        resultado = resultado.filter(
          (comprador) => comprador.cantidad_chances === chances,
        );
      }

      setCompradoresHistoricoFiltrados(resultado);
      setPaginaHistorico(1);
    },
    [compradoresHistorico],
  );

  // Función para exportar compradores del sorteo actual a Excel
  const exportarCompradoresActualesExcel = () => {
    const datos = compradoresActuales.map((c) => ({
      Nombre: c.nombre,
      Email: c.email || "",
      Contacto: c.instagram_username
        ? `@${c.instagram_username}`
        : c.telefono || "",
      Chances: c.cantidad_chances,
      Números: c.numeros_asignados.join(", "),
      Precio: c.precio_pagado,
      Moneda: c.moneda || "ARS",
      País: c.pais_transferencia || "AR",
      Fecha: new Date(c.created_at).toLocaleDateString(),
      Estado: c.estado_pago,
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compradores");
    const nombreArchivo = sorteoActual
      ? `compradores-${sorteoActual.nombre.replace(/\s+/g, "-")}.xlsx`
      : "compradores.xlsx";
    XLSX.writeFile(wb, nombreArchivo);
  };

  // Función para exportar compradores del histórico a Excel
  const exportarCompradoresExcel = () => {
    const datos = compradoresHistorico.map((c) => ({
      Nombre: c.nombre,
      Email: c.email || "",
      Contacto: c.instagram_username
        ? `@${c.instagram_username}`
        : c.telefono || "",
      Chances: c.cantidad_chances,
      Precio: c.precio_pagado,
      Moneda: c.moneda || "ARS",
      País: c.pais_transferencia || "AR",
      Estado: c.estado_pago,
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compradores");
    const sorteoObj = todosSorteos.find(
      (s) => s.id === sorteoSeleccionadoHistorico,
    );
    const nombreArchivo = sorteoObj
      ? `compradores-${sorteoObj.nombre.replace(/\s+/g, "-")}.xlsx`
      : "compradores.xlsx";
    XLSX.writeFile(wb, nombreArchivo);
  };

  // Función para generar y descargar comprobante (render compartido en lib/comprobante)
  const generarComprobante = (comprador: Comprador) => {
    if (!sorteoActual) return;

    generarComprobanteImagen(comprador, sorteoActual.nombre, () => {
      toast({
        title: "Comprobante generado",
        description: "El comprobante se descargó exitosamente",
      });
    });
  };

  const handleImagenCambiada = async (nuevaImagenUrl: string) => {
    if (!sorteoActual) return;

    try {
      const exito = await actualizarImagenSorteo(
        sorteoActual.id,
        nuevaImagenUrl,
      );
      if (exito) {
        setSorteoActual({ ...sorteoActual, imagen_url: nuevaImagenUrl });
        toast({
          title: "Imagen actualizada",
          description: "La imagen del sorteo se actualizó correctamente",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar la imagen",
        });
      }
    } catch (error) {
      console.error("Error actualizando imagen:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al actualizar la imagen",
      });
    }
  };

  const handleSorteoCreado = () => {
    cargarDatos();
    setNuevoSorteoModalAbierto(false);
    toast({
      title: "Sorteo creado",
      description:
        "El nuevo sorteo se creó correctamente. Los compradores anteriores se mantuvieron.",
    });
  };

  const handleSorteoRealizado = async () => {
    if (!sorteoActual) return;

    try {
      const resultado = await realizarSorteo(sorteoActual.id);
      if (resultado) {
        await cargarDatos();
        toast({
          title: "¡Sorteo realizado! 🎉",
          description: `El ganador es ${resultado.ganador.nombre} con el número ${resultado.numeroGanador}`,
        });
      }
    } catch (error) {
      console.error("Error realizando sorteo:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo realizar el sorteo",
      });
    }
    setRealizarSorteoModalAbierto(false);
  };

  const handleFinalizarSorteoManual = async (
    ganadorNombre: string,
    numeroGanador: number,
  ) => {
    if (!sorteoActual) return;
    const exitoso = await finalizarSorteoManual(
      sorteoActual.id,
      ganadorNombre,
      numeroGanador,
    );
    if (exitoso) {
      await cargarDatos();
      toast({
        title: "Sorteo finalizado",
        description: `Ganador: ${ganadorNombre} — Número: ${numeroGanador}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo finalizar el sorteo",
      });
    }
  };

  // Handlers para transferencias
  const handleAprobarTransferencia = async (compradorId: string) => {
    try {
      // Obtener datos del comprador antes de aprobar
      const comprador = transferenciasPendientes.find(
        (t) => t.id === compradorId,
      );
      if (!comprador) {
        throw new Error("Comprador no encontrado");
      }

      const exitoso = await aprobarTransferencia(compradorId);
      if (exitoso) {
        // Recargar datos para reflejar cambios
        await cargarDatos();

        // Obtener el comprador actualizado con los números asignados
        const compradorActualizado = await obtenerCompradores(
          sorteoActual?.id || "",
        );
        const compradorConNumeros = compradorActualizado.find(
          (c) => c.id === compradorId,
        );

        // Generar preview de la remera con diseño si hay imagen
        let tshirtPreviewUrl = null;
        if (sorteoActual?.imagen_url) {
          try {
            console.log(
              "🎨 Generating t-shirt preview for:",
              sorteoActual.imagen_url,
            );
            const previewResponse = await fetch(
              "/api/generate-tshirt-preview",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  designImageUrl: sorteoActual.imagen_url,
                }),
              },
            );

            if (previewResponse.ok) {
              const previewData = await previewResponse.json();
              tshirtPreviewUrl = previewData.imageUrl;
              console.log("✅ T-shirt preview generated:", tshirtPreviewUrl);
            } else {
              const errorData = await previewResponse.text();
              console.warn(
                "❌ Failed to generate t-shirt preview:",
                previewResponse.status,
                errorData,
              );
            }
          } catch (previewError) {
            console.warn("❌ Error generating t-shirt preview:", previewError);
          }
        } else {
          console.log(
            "⚠️ No sorteo image URL available for preview generation",
          );
        }

        // Enviar email de aprobación solo si el comprador tiene email
        if (comprador.email) {
          try {
            const emailData = {
              tipo: "aprobada",
              data: {
                nombre: comprador.nombre,
                email: comprador.email,
                cantidadChances: comprador.cantidad_chances,
                numerosAsignados: compradorConNumeros?.numeros_asignados || [],
                precioPagado: comprador.precio_pagado,
                moneda: comprador.moneda || "ARS",
                nombreSorteo:
                  sorteoActual?.nombre || "T-SHIRT SORTEO EXCLUSIVO",
                sorteoImagenUrl: sorteoActual?.carousel_image_1,
                compradorId: comprador.id,
              },
            };

            console.log(
              "📧 Sending email with data:",
              JSON.stringify(emailData, null, 2),
            );

            const response = await fetch("/api/email-transferencia", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailData),
            });

            if (!response.ok) {
              console.warn(
                "Transferencia aprobada pero no se pudo enviar el email",
              );
            }
          } catch (emailError) {
            console.warn("Error enviando email de aprobación:", emailError);
          }
        } else {
          console.log(
            "⚠️ Comprador sin email, saltando envío de email de aprobación",
          );
        }

        // WhatsApp con los números (además del email), si el contacto es un teléfono.
        if (esNumeroTelefono(comprador.telefono)) {
          try {
            const response = await fetch("/api/whatsapp-transferencia", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data: {
                  compradorId: comprador.id,
                  sorteoId: comprador.sorteo_id ?? sorteoActual?.id ?? null,
                  nombre: comprador.nombre,
                  telefono: comprador.telefono,
                  pais: comprador.pais_transferencia,
                  cantidadChances: comprador.cantidad_chances,
                  numerosAsignados: compradorConNumeros?.numeros_asignados || [],
                  precioPagado: comprador.precio_pagado,
                  moneda: comprador.moneda || "ARS",
                  nombreSorteo:
                    sorteoActual?.nombre || "T-SHIRT SORTEO EXCLUSIVO",
                },
              }),
            });

            if (!response.ok) {
              console.warn(
                "Transferencia aprobada pero no se pudo enviar el WhatsApp",
              );
            }
          } catch (whatsappError) {
            console.warn("Error enviando WhatsApp de aprobación:", whatsappError);
          }
        }
      } else {
        throw new Error("No se pudo aprobar la transferencia");
      }
    } catch (error) {
      console.error("Error aprobando transferencia:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo aprobar la transferencia",
      });
    }
  };

  const handleRechazarTransferencia = async (
    compradorId: string,
    motivo?: string,
  ) => {
    try {
      // Obtener datos del comprador antes de rechazar
      const comprador = transferenciasPendientes.find(
        (t) => t.id === compradorId,
      );
      if (!comprador) {
        throw new Error("Comprador no encontrado");
      }

      const exitoso = await rechazarTransferencia(compradorId, motivo);
      if (exitoso) {
        // Enviar email de rechazo solo si el comprador tiene email
        if (comprador.email) {
          try {
            const response = await fetch("/api/email-transferencia", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                tipo: "rechazada",
                data: {
                  nombre: comprador.nombre,
                  email: comprador.email,
                  cantidadChances: comprador.cantidad_chances,
                  precioPagado: comprador.precio_pagado,
                  moneda: comprador.moneda || "ARS",
                  nombreSorteo:
                    sorteoActual?.nombre || "T-SHIRT SORTEO EXCLUSIVO",
                  motivo: motivo,
                },
              }),
            });

            if (!response.ok) {
              console.warn(
                "Transferencia rechazada pero no se pudo enviar el email",
              );
            }
          } catch (emailError) {
            console.warn("Error enviando email de rechazo:", emailError);
          }
        } else {
          console.log(
            "⚠️ Comprador sin email, saltando envío de email de rechazo",
          );
        }

        // Recargar datos para reflejar cambios
        await cargarDatos();
      } else {
        throw new Error("No se pudo rechazar la transferencia");
      }
    } catch (error) {
      console.error("Error rechazando transferencia:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo rechazar la transferencia",
      });
    }
  };

  const handleContactarComprador = (comprador: Comprador) => {
    const mensaje = encodeURIComponent(
      `Hola ${comprador.nombre}, te contacto respecto a tu transferencia para el sorteo.`,
    );

    // Prioridad: instagram_username > telefono (validado) > telefono (legacy como instagram)
    if (comprador.instagram_username) {
      const instagramUrl = `https://instagram.com/${comprador.instagram_username}`;
      window.open(instagramUrl, "_blank");
    } else if (comprador.telefono && esNumeroTelefono(comprador.telefono)) {
      const telefonoLimpio = comprador.telefono.replace(/\D/g, "");
      const codigoPais = comprador.pais_transferencia === "PY" ? "595" : "54";
      const numeroInternacional = telefonoLimpio.startsWith(codigoPais)
        ? telefonoLimpio
        : `${codigoPais}${telefonoLimpio}`;
      const whatsappUrl = `https://wa.me/${numeroInternacional}?text=${mensaje}`;
      window.open(whatsappUrl, "_blank");
    } else if (comprador.telefono) {
      // Es un username de Instagram guardado en el campo telefono (legacy)
      const instagramUrl = `https://instagram.com/${comprador.telefono}`;
      window.open(instagramUrl, "_blank");
    }
  };

  const handleEliminarComprador = (comprador: Comprador) => {
    // Abrir modal de confirmación
    setCompradorAEliminar(comprador);
    setConfirmarEliminarModalAbierto(true);
  };

  const confirmarEliminarComprador = async () => {
    if (!compradorAEliminar) return;

    setEliminandoComprador(true);

    try {
      const resultado = await eliminarComprador(compradorAEliminar.id);

      if (resultado) {
        toast({
          title: "Comprador eliminado",
          description: `${compradorAEliminar.nombre} ha sido eliminado y sus números están disponibles nuevamente.`,
        });
        // Cerrar modal
        setConfirmarEliminarModalAbierto(false);
        setCompradorAEliminar(null);
        // Recargar datos
        await cargarDatos();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "No se pudo eliminar el comprador. Puede que sea un ganador.",
        });
      }
    } catch (error) {
      console.error("Error eliminando comprador:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al eliminar el comprador",
      });
    } finally {
      setEliminandoComprador(false);
    }
  };

  const cancelarEliminarComprador = () => {
    setConfirmarEliminarModalAbierto(false);
    setCompradorAEliminar(null);
  };

  const handleDetallesActualizados = async (
    nombre: string,
    descripcion: string,
  ) => {
    if (!sorteoActual) return;

    const exitoso = await actualizarDetallesSorteo(
      sorteoActual.id,
      nombre,
      descripcion,
    );
    if (exitoso) {
      setSorteoActual({
        ...sorteoActual,
        nombre,
        descripcion,
      });
      toast({
        title: "Detalles actualizados",
        description: "El nombre y la descripción se actualizaron correctamente",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar los detalles del sorteo",
      });
      throw new Error("No se pudieron actualizar los detalles");
    }
  };

  const handlePacksActualizados = async () => {
    // Reload sorteo data to get updated values
    await cargarDatos();
    toast({
      title: "Packs actualizados",
      description: "Los packs se actualizaron correctamente",
    });
  };

  const handleTituloActualizado = async () => {
    await cargarDatos();
    toast({
      title: "Título actualizado",
      description: "El título del premio se actualizó correctamente",
    });
  };

  const handleFechaActualizada = async () => {
    await cargarDatos();
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  const sorteoCompleto =
    sorteoActual && estadisticas.chancesVendidas >= sorteoActual.total_chances;
  const puedeRealizarSorteo =
    sorteoCompleto && sorteoActual?.estado === "activo";

  // Paginación de las tablas: la búsqueda/filtro/export siguen operando
  // sobre compradoresActuales/HistoricoFiltrados completos, solo la vista se recorta
  const compradoresActualesPagina = compradoresActualesFiltrados.slice(
    (paginaActuales - 1) * porPaginaActuales,
    paginaActuales * porPaginaActuales,
  );
  const compradoresHistoricoPagina = compradoresHistoricoFiltrados.slice(
    (paginaHistorico - 1) * porPaginaHistorico,
    paginaHistorico * porPaginaHistorico,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Panel de Administración
              </h1>
              <p className="text-gray-600">
                Gestiona tus sorteos y compradores
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="mr-1 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                <div className="min-w-[112px]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                    {sitePublished ? (
                      <Globe2 className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-[#ff0040]" />
                    )}
                    {sitePublished ? "Sitio público" : "Sólo administrador"}
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    {sitePublished ? "Ventas habilitadas" : "Preview visual"}
                  </p>
                </div>
                <Switch
                  checked={sitePublished}
                  disabled={updatingVisibility}
                  onCheckedChange={handleVisibilityChange}
                  aria-label="Publicar u ocultar el sitio"
                />
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-[#ff0040]/25 text-gray-700"
              >
                <a href="/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir vista previa
                </a>
              </Button>
              <Button
                onClick={() => setNuevoSorteoModalAbierto(true)}
                className="bg-gray-900 hover:bg-gray-800"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Sorteo
              </Button>
              {sorteoActual && sorteoActual.estado === "activo" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      onClick={() => setEditarTituloModalAbierto(true)}
                    >
                      <Type className="w-4 h-4 mr-2 text-orange-600" />
                      Editar Título
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEditarFechaModalAbierto(true)}
                    >
                      <Calendar className="w-4 h-4 mr-2 text-green-600" />
                      Editar Fecha
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEditarPacksModalAbierto(true)}
                    >
                      <Edit className="w-4 h-4 mr-2 text-purple-600" />
                      Editar Packs
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setEditarCuentaTransferenciaModalAbierto(true)
                      }
                    >
                      <Banknote className="w-4 h-4 mr-2 text-green-600" />
                      Cuentas de transferencia
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!sorteoActual && (
                <Button
                  onClick={() => setEditarCuentaTransferenciaModalAbierto(true)}
                  variant="outline"
                  size="sm"
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Cuenta Transferencia
                </Button>
              )}
              {puedeRealizarSorteo && (
                <Button
                  onClick={() => setRealizarSorteoModalAbierto(true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Realizar Sorteo
                </Button>
              )}
              {(sorteoActual?.estado === "activo" ||
                sorteoActual?.estado === "completo") && (
                <Button
                  onClick={() => setFinalizarSorteoModalAbierto(true)}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Terminar Sorteo
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900 bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger
              value="informacion"
              className="data-[state=active]:bg-gray-100"
            >
              <Info className="w-4 h-4 mr-2" />
              Información del Sorteo
            </TabsTrigger>
            <TabsTrigger
              value="compradores"
              className="data-[state=active]:bg-gray-100"
            >
              <Users className="w-4 h-4 mr-2" />
              Compradores Actuales ({compradoresActuales.length})
            </TabsTrigger>
            <TabsTrigger
              value="transferencias"
              className="data-[state=active]:bg-gray-100"
            >
              <Clock className="w-4 h-4 mr-2" />
              Transferencias Pendientes ({transferenciasPendientes.length})
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="data-[state=active]:bg-gray-100"
            >
              <History className="w-4 h-4 mr-2" />
              Histórico
            </TabsTrigger>
            {/* <TabsTrigger
              value="test"
              className="data-[state=active]:bg-gray-100"
            >
              <Target className="w-4 h-4 mr-2" />
              Test
            </TabsTrigger> */}
            <TabsTrigger
              value="carousel"
              className="data-[state=active]:bg-gray-100"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Carrusel
            </TabsTrigger>
            <TabsTrigger
              value="ganadores"
              className="data-[state=active]:bg-gray-100"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Ganadores Pasados
            </TabsTrigger>
            <TabsTrigger
              value="express"
              className="data-[state=active]:bg-gray-100"
            >
              <Crown className="w-4 h-4 mr-2" />
              Premios Express
            </TabsTrigger>
            <TabsTrigger
              value="premios-sec"
              className="data-[state=active]:bg-gray-100"
            >
              <Star className="w-4 h-4 mr-2" />
              Premios Sec.
            </TabsTrigger>
            <TabsTrigger
              value="contenido"
              className="data-[state=active]:bg-gray-100"
            >
              <Type className="w-4 h-4 mr-2" />
              Contenido
            </TabsTrigger>
            <TabsTrigger
              value="whatsapp"
              className="data-[state=active]:bg-gray-100"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="ranking" className="data-[state=active]:bg-gray-100"><Trophy className="w-4 h-4 mr-2" />Ranking</TabsTrigger>
          </TabsList>

          <TabsContent value="informacion" className="space-y-6">
            {sorteoActual ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Participantes</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {estadisticas.totalCompradores}
                          </p>
                          {(() => {
                            const gratuitos = compradoresActuales.filter(
                              (c) => c.metodo_pago === "gratuito",
                            ).length;
                            return gratuitos > 0 ? (
                              <p className="text-xs text-emerald-600 mt-1">
                                🍀 {gratuitos} gratuito
                                {gratuitos === 1 ? "" : "s"} ·{" "}
                                {estadisticas.totalCompradores - gratuitos} de
                                pago
                              </p>
                            ) : null;
                          })()}
                        </div>
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">
                            Chances Vendidas
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {estadisticas.chancesVendidas}/
                            {sorteoActual.total_chances}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(
                              (estadisticas.chancesVendidas /
                                sorteoActual.total_chances) *
                              100
                            ).toFixed(1)}
                            % completado
                          </p>
                        </div>
                        <Target className="w-8 h-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">
                            Total Recaudado
                          </p>
                          {(() => {
                            const pagos = compradoresActuales.filter(
                              (comprador) =>
                                comprador.estado_pago === "pagado" &&
                                comprador.metodo_pago !== "gratuito",
                            );
                            const ars = pagos
                              .filter((comprador) => comprador.moneda !== "PYG")
                              .reduce(
                                (total, comprador) =>
                                  total + comprador.precio_pagado,
                                0,
                              );
                            const pyg = pagos
                              .filter((comprador) => comprador.moneda === "PYG")
                              .reduce(
                                (total, comprador) =>
                                  total + comprador.precio_pagado,
                                0,
                              );
                            return (
                              <div className="space-y-0.5">
                                <p className="text-lg font-bold text-gray-900">
                                  {formatearMonto(ars, "ARS")}
                                </p>
                                <p className="text-sm font-semibold text-gray-600">
                                  {formatearMonto(pyg, "PYG")}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                        <DollarSign className="w-8 h-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Estado</p>
                          <Badge
                            className={
                              sorteoActual.estado === "activo"
                                ? "bg-green-100 text-green-800"
                                : sorteoActual.estado === "sorteado"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }
                          >
                            {sorteoActual.estado.toUpperCase()}
                          </Badge>
                          {sorteoCompleto &&
                            sorteoActual.estado === "activo" && (
                              <p className="text-xs text-green-600 mt-1">
                                ¡Listo para sortear!
                              </p>
                            )}
                        </div>
                        <Trophy className="w-8 h-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Información y Imagen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Detalles del Sorteo
                        </CardTitle>
                        {sorteoActual.estado === "activo" && (
                          <Button
                            onClick={() => setEditarDetallesModalAbierto(true)}
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {sorteoActual.nombre}
                        </h3>
                        <p className="text-gray-600">
                          {sorteoActual.descripcion}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total chances:</span>
                          <span className="text-gray-900 ml-2 font-medium">
                            {sorteoActual.total_chances}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Sorteo:</span>
                          <span className="text-gray-900 ml-2 font-medium">
                            Al llegar al 100%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            Precios:
                          </h4>
                          {sorteoActual.estado === "activo" && (
                            <Button
                              onClick={() => setEditarPacksModalAbierto(true)}
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                          {[
                            {
                              cantidad: sorteoActual.cantidad_pack_1,
                              ars: sorteoActual.precio_6_chances,
                              pyg:
                                sorteoActual.precio_pack_1_pyg ??
                                sorteoActual.precio_6_chances * 7,
                            },
                            {
                              cantidad: sorteoActual.cantidad_pack_2,
                              ars: sorteoActual.precio_12_chances,
                              pyg:
                                sorteoActual.precio_pack_2_pyg ??
                                sorteoActual.precio_12_chances * 7,
                            },
                            {
                              cantidad: sorteoActual.cantidad_pack_3,
                              ars: sorteoActual.precio_24_chances,
                              pyg:
                                sorteoActual.precio_pack_3_pyg ??
                                sorteoActual.precio_24_chances * 7,
                            },
                          ].map((pack, index) => (
                            <div key={index} className="rounded bg-gray-50 p-2">
                              <div className="text-gray-500">
                                {pack.cantidad} chances
                              </div>
                              <div className="font-medium">
                                {formatearMonto(pack.ars, "ARS")}
                              </div>
                              <div className="font-medium text-gray-600">
                                {formatearMonto(pack.pyg, "PYG")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Información del ganador */}
                      {sorteoActual.estado === "sorteado" &&
                        sorteoActual.numero_ganador && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Crown className="w-5 h-5 text-yellow-600" />
                              <h4 className="font-semibold text-yellow-800">
                                ¡Ganador!
                              </h4>
                            </div>
                            <p className="text-yellow-800">
                              <strong>Número ganador:</strong>{" "}
                              {sorteoActual.numero_ganador}
                            </p>
                            {sorteoActual.fecha_sorteo_realizado && (
                              <p className="text-yellow-700 text-sm">
                                Sorteado el:{" "}
                                {new Date(
                                  sorteoActual.fecha_sorteo_realizado,
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                        Imágenes del Sorteo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {sorteoActual.carousel_image_1 ? (
                          <div className="flex justify-center">
                            <img
                              src={sorteoActual.carousel_image_1}
                              alt="Imagen principal del sorteo"
                              className="max-h-48 rounded-lg object-contain border border-gray-200"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <ImageIcon className="w-10 h-10 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-400">
                              Sin imágenes cargadas
                            </p>
                          </div>
                        )}
                        <Button
                          onClick={() => setActiveTab("carousel")}
                          variant="outline"
                          className="w-full"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Gestionar imágenes en Carrusel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay sorteos activos
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Crea tu primer sorteo para comenzar
                  </p>
                  <Button
                    onClick={() => setNuevoSorteoModalAbierto(true)}
                    className="bg-gray-900 hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Sorteo
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="compradores" className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Nota:</strong> Esta sección muestra únicamente los
                compradores del sorteo actual/más reciente. Para ver compradores
                de sorteos anteriores, ve a la pestaña "Histórico".
              </p>
            </div>

            <CompradoresSearch
              onSearch={handleSearchActuales}
              totalResults={compradoresActualesFiltrados.length}
              totalCompradores={compradoresActuales.length}
            />

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Compradores del Sorteo Actual
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarCompradoresActualesExcel}
                  disabled={compradoresActuales.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {compradoresActualesFiltrados.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {compradoresActuales.length === 0
                        ? "No hay compradores registrados en el sorteo actual"
                        : "No se encontraron compradores con los filtros aplicados"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100 hover:bg-gray-100">
                          <TableHead className="font-semibold text-gray-700">
                            Nombre
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Email
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Contacto
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Chances
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Números
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Precio
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Fecha
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Estado
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Acciones
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compradoresActualesPagina.map((comprador) => (
                          <TableRow key={comprador.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2 flex-wrap">
                                {comprador.es_ganador && (
                                  <Crown className="w-4 h-4 text-yellow-500" />
                                )}
                                {comprador.nombre}
                                {comprador.metodo_pago === "gratuito" && (
                                  <Badge className="bg-emerald-100 text-emerald-800">
                                    🍀 Gratuito
                                  </Badge>
                                )}
                              </div>
                              {comprador.datos_encuesta?.capturas_instagram && (
                                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                  {CUENTAS_INSTAGRAM.filter(
                                    (cuenta) =>
                                      comprador.datos_encuesta?.capturas_instagram?.[cuenta.id],
                                  ).map((cuenta) => (
                                    <a
                                      key={cuenta.id}
                                      href={`/api/admin/capturas/${comprador.id}?cuenta=${encodeURIComponent(cuenta.id)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 underline"
                                    >
                                      📸 @{cuenta.id}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {comprador.email ? (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Mail className="w-4 h-4" />
                                  {comprador.email}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {comprador.instagram_username ? (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <span className="text-sm">
                                    📷 @{comprador.instagram_username}
                                  </span>
                                </div>
                              ) : comprador.telefono &&
                                esNumeroTelefono(comprador.telefono) ? (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <span className="text-sm">
                                    📱 {comprador.telefono}
                                  </span>
                                </div>
                              ) : comprador.telefono ? (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <span className="text-sm">
                                    📷 @{comprador.telefono}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {comprador.cantidad_chances} chances
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-2 text-gray-600">
                                <Hash className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span className="font-mono text-sm break-all">
                                  {comprador.numeros_asignados.join(", ")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              {formatearMonto(
                                comprador.precio_pagado,
                                comprador.moneda || "ARS",
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">
                                  {new Date(
                                    comprador.created_at,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  comprador.estado_pago === "pagado"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {comprador.estado_pago}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2">
                                <Button
                                  onClick={() => generarComprobante(comprador)}
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Comprobante
                                </Button>
                                {comprador.instagram_username ? (
                                  <a
                                    href={`https://instagram.com/${comprador.instagram_username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-purple-600 hover:underline w-full"
                                    >
                                      Ir a perfil
                                    </Button>
                                  </a>
                                ) : comprador.telefono &&
                                  esNumeroTelefono(comprador.telefono) ? (
                                  <a
                                    href={`https://wa.me/${
                                      comprador.telefono
                                    }?text=${encodeURIComponent(
                                      `Hola ${comprador.nombre}! Te hablo de Sosa Motos...`,
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-green-600 hover:underline w-full"
                                    >
                                      Contactar
                                    </Button>
                                  </a>
                                ) : comprador.telefono ? (
                                  <a
                                    href={`https://instagram.com/${comprador.telefono}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-purple-600 hover:underline w-full"
                                    >
                                      Ir a perfil
                                    </Button>
                                  </a>
                                ) : null}
                                {!comprador.es_ganador && (
                                  <Button
                                    onClick={() =>
                                      handleEliminarComprador(comprador)
                                    }
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <TablaPaginacion
                  pagina={paginaActuales}
                  totalItems={compradoresActualesFiltrados.length}
                  porPagina={porPaginaActuales}
                  onPaginaChange={setPaginaActuales}
                  onPorPaginaChange={(valor) => {
                    setPorPaginaActuales(valor);
                    setPaginaActuales(1);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transferencias" className="space-y-6">
            <TransferenciasPendientes
              transferencias={transferenciasPendientes}
              onApprobar={handleAprobarTransferencia}
              onRechazar={handleRechazarTransferencia}
              onContactar={handleContactarComprador}
            />
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Sorteos Históricos</CardTitle>
                  <select
                    onChange={(e) => cambiarSorteoHistorico(e.target.value)}
                    value={sorteoSeleccionadoHistorico}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <option value="">
                      Seleccionar sorteo para ver compradores
                    </option>
                    {todosSorteos.map((sorteo) => (
                      <option key={sorteo.id} value={sorteo.id}>
                        {sorteo.nombre} - {sorteo.estado}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Creación</TableHead>
                        <TableHead>Ganador</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todosSorteos.map((sorteo) => (
                        <TableRow key={sorteo.id}>
                          <TableCell className="font-medium">
                            {sorteo.nombre}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                sorteo.estado === "activo"
                                  ? "bg-green-100 text-green-800"
                                  : sorteo.estado === "sorteado"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                              }
                            >
                              {sorteo.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {new Date(sorteo.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {sorteo.numero_ganador ? (
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-yellow-500" />
                                <span className="font-mono">
                                  #{sorteo.numero_ganador}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Compradores del sorteo seleccionado */}
            {sorteoSeleccionadoHistorico && compradoresHistorico.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">
                    Compradores del Sorteo Seleccionado (
                    {compradoresHistorico.length})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportarCompradoresExcel}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Excel
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CompradoresSearch
                    onSearch={handleSearchHistorico}
                    totalResults={compradoresHistoricoFiltrados.length}
                    totalCompradores={compradoresHistorico.length}
                  />
                  {compradoresHistoricoFiltrados.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        No se encontraron compradores con los filtros aplicados
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Chances</TableHead>
                            <TableHead>Números</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {compradoresHistoricoPagina.map((comprador) => (
                            <TableRow key={comprador.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {comprador.es_ganador && (
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                  )}
                                  {comprador.nombre}
                                </div>
                              </TableCell>
                              <TableCell>
                                {comprador.email ? (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="w-4 h-4" />
                                    {comprador.email}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {comprador.instagram_username ? (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <span className="text-sm">
                                      📷 @{comprador.instagram_username}
                                    </span>
                                  </div>
                                ) : comprador.telefono &&
                                  esNumeroTelefono(comprador.telefono) ? (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <span className="text-sm">
                                      📱 {comprador.telefono}
                                    </span>
                                  </div>
                                ) : comprador.telefono ? (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <span className="text-sm">
                                      📷 @{comprador.telefono}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {comprador.cantidad_chances} chances
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-start gap-2 text-gray-600">
                                  <Hash className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <span className="font-mono text-sm break-all">
                                    {comprador.numeros_asignados.join(", ")}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-green-600">
                                {formatearMonto(
                                  comprador.precio_pagado,
                                  comprador.moneda || "ARS",
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-sm">
                                    {new Date(
                                      comprador.created_at,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    comprador.estado_pago === "pagado"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }
                                >
                                  {comprador.estado_pago}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-2">
                                  <Button
                                    onClick={() =>
                                      generarComprobante(comprador)
                                    }
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Comprobante
                                  </Button>
                                  {comprador.instagram_username ? (
                                    <a
                                      href={`https://instagram.com/${comprador.instagram_username}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="text-purple-600 hover:underline w-full"
                                      >
                                        Ir a perfil
                                      </Button>
                                    </a>
                                  ) : comprador.telefono &&
                                    esNumeroTelefono(comprador.telefono) ? (
                                    <a
                                      href={`https://wa.me/${
                                        comprador.telefono
                                      }?text=${encodeURIComponent(
                                        `Hola ${comprador.nombre}! Te hablo de Sosa Motos...`,
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="text-green-600 hover:underline w-full"
                                      >
                                        Contactar
                                      </Button>
                                    </a>
                                  ) : comprador.telefono ? (
                                    <a
                                      href={`https://instagram.com/${comprador.telefono}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="text-purple-600 hover:underline w-full"
                                      >
                                        Ir a perfil
                                      </Button>
                                    </a>
                                  ) : null}
                                  {!comprador.es_ganador && (
                                    <Button
                                      onClick={() =>
                                        handleEliminarComprador(comprador)
                                      }
                                      variant="destructive"
                                      size="sm"
                                      className="w-full"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Eliminar
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <TablaPaginacion
                    pagina={paginaHistorico}
                    totalItems={compradoresHistoricoFiltrados.length}
                    porPagina={porPaginaHistorico}
                    onPaginaChange={setPaginaHistorico}
                    onPorPaginaChange={(valor) => {
                      setPorPaginaHistorico(valor);
                      setPaginaHistorico(1);
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            <TestSorteos sorteoActivo={sorteoActual} />
          </TabsContent>

          <TabsContent value="carousel" className="space-y-6">
            {sorteoActual ? (
              <CarouselManager
                sorteo={sorteoActual}
                onImagenesActualizadas={(sorteoActualizado) =>
                  setSorteoActual(sorteoActualizado)
                }
              />
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No hay sorteo activo para gestionar el carrusel
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ganadores" className="space-y-6">
            <GestionGanadores />
          </TabsContent>

          <TabsContent value="premios-sec" className="space-y-6">
            <PremiosSecundariosManager
              premios={premiosSecundarios}
              onActualizado={setPremiosSecundarios}
            />
          </TabsContent>

          <TabsContent value="express" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      Ganadores de Premios Express
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gestiona los ganadores de premios instantáneos del sorteo
                      actual
                    </p>
                  </div>
                  {sorteoActual && (
                    <GanadoresExpressModal sorteoId={sorteoActual.id} />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!sorteoActual ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay sorteo activo
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Haz clic en el botón "Ganadores Express" para gestionar los
                    premios instantáneos
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contenido" className="space-y-6">
            <ContenidoManager />
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <ReporteWhatsapp sorteos={todosSorteos} />
          </TabsContent>
          <TabsContent value="ranking" className="space-y-6"><RankingBackoffice sorteo={sorteoActual} /></TabsContent>
        </Tabs>
      </div>

      {sorteoActual && (
        <EditarTituloModal
          isOpen={editarTituloModalAbierto}
          onClose={() => setEditarTituloModalAbierto(false)}
          sorteo={sorteoActual}
          onTituloActualizado={handleTituloActualizado}
        />
      )}

      {sorteoActual && (
        <EditarFechaSorteoModal
          isOpen={editarFechaModalAbierto}
          onClose={() => setEditarFechaModalAbierto(false)}
          sorteo={sorteoActual}
          onFechaActualizada={handleFechaActualizada}
        />
      )}

      <EditarCuentaTransferenciaModal
        isOpen={editarCuentaTransferenciaModalAbierto}
        onClose={() => setEditarCuentaTransferenciaModalAbierto(false)}
        argentina={configTransferencia.argentina}
        paraguay={configTransferencia.paraguay}
        avisoTitulo={configTransferencia.avisoTitulo}
        avisoTexto={configTransferencia.avisoTexto}
        onGuardado={(config) => setConfigTransferencia(config)}
      />

      <NuevoSorteoModal
        open={nuevoSorteoModalAbierto}
        onOpenChange={setNuevoSorteoModalAbierto}
        onSorteoCreado={handleSorteoCreado}
      />

      <RealizarSorteoModal
        open={realizarSorteoModalAbierto}
        onOpenChange={setRealizarSorteoModalAbierto}
        sorteoId={sorteoActual?.id || ""}
        onSorteoRealizado={handleSorteoRealizado}
      />

      {sorteoActual && (
        <EditarDetallesModal
          key={`${sorteoActual.id}-${sorteoActual.nombre}-${sorteoActual.descripcion}`}
          open={editarDetallesModalAbierto}
          onOpenChange={setEditarDetallesModalAbierto}
          detallesActuales={{
            nombre: sorteoActual.nombre,
            descripcion: sorteoActual.descripcion || "",
          }}
          onDetallesActualizados={handleDetallesActualizados}
        />
      )}

      {sorteoActual && (
        <EditarPacksModal
          isOpen={editarPacksModalAbierto}
          onClose={() => setEditarPacksModalAbierto(false)}
          sorteo={sorteoActual}
          onSuccess={handlePacksActualizados}
        />
      )}

      <ConfirmarEliminarModal
        isOpen={confirmarEliminarModalAbierto}
        onClose={cancelarEliminarComprador}
        onConfirm={confirmarEliminarComprador}
        comprador={compradorAEliminar}
        isLoading={eliminandoComprador}
      />

      <FinalizarSorteoModal
        open={finalizarSorteoModalAbierto}
        onOpenChange={setFinalizarSorteoModalAbierto}
        porcentajeVendido={
          sorteoActual
            ? (estadisticas.chancesVendidas / sorteoActual.total_chances) * 100
            : 0
        }
        onFinalizado={handleFinalizarSorteoManual}
      />

      <Toaster />
    </div>
  );
}
