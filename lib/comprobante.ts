// Generación del comprobante de participación como imagen (canvas → PNG).
// Compartido entre el backoffice y la landing pública para que ambos usen
// exactamente el mismo render.
import { formatearMonto } from "./moneda";
import type { Moneda } from "./supabase";

export interface ComprobanteData {
  nombre: string;
  cantidad_chances: number;
  numeros_asignados: number[];
  created_at: string;
  // Campos opcionales: la consulta pública no expone contacto ni precio.
  email?: string | null;
  telefono?: string | null;
  instagram_username?: string | null;
  precio_pagado?: number | null;
  moneda?: Moneda;
}

export function generarComprobante(
  comprador: ComprobanteData,
  sorteoNombre: string,
  onSuccess?: () => void,
) {
  // Constantes para los tickets
  const ticketsPerRow = 5;
  const ticketWidth = 130;
  const ticketHeight = 65; // Mantener proporción 2:1 del ticket
  const ticketGap = 15;

  // Crear un canvas para generar la imagen
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Calcular altura dinámica basada en cantidad de números
  const numRows = Math.ceil(comprador.cantidad_chances / ticketsPerRow);
  const ticketsAreaHeight = numRows * (ticketHeight + ticketGap) + ticketGap;

  // Calcular altura total necesaria:
  // Header: ~150px
  // Info comprador: ~250px (variable según contactos)
  // Espaciado pre-tickets: ~80px
  // Tickets: ticketsAreaHeight
  // Footer: ~200px
  const estimatedHeight = 150 + 300 + 80 + ticketsAreaHeight + 200;

  // Configurar dimensiones
  canvas.width = 800;
  canvas.height = Math.max(950, estimatedHeight);

  // Fondo oscuro (acorde a la landing)
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGradient.addColorStop(0, "#0a0a0a");
  bgGradient.addColorStop(0.5, "#1a1a1a");
  bgGradient.addColorStop(1, "#0f0f0f");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Borde rojo
  ctx.strokeStyle = "#ff0040";
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  // Marca (SOSA en blanco, MOTOS en rojo)
  ctx.textAlign = "center";
  ctx.font = "bold 30px Arial";
  const marcaY = 70;
  const sosaW = ctx.measureText("SOSA ").width;
  const motosW = ctx.measureText("MOTOS 🏍️").width;
  const marcaStartX = canvas.width / 2 - (sosaW + motosW) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("SOSA ", marcaStartX, marcaY);
  ctx.fillStyle = "#ff0040";
  ctx.fillText("MOTOS 🏍️", marcaStartX + sosaW, marcaY);

  // Título
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px Arial";
  ctx.fillText("COMPROBANTE DE COMPRA", canvas.width / 2, 118);

  // Línea decorativa roja
  ctx.strokeStyle = "#ff0040";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(280, 140);
  ctx.lineTo(520, 140);
  ctx.stroke();

  // Mensaje de participación
  ctx.fillStyle = "#ff0040";
  ctx.font = "bold 23px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`¡Estás participando por: ${sorteoNombre}!`, 50, 190);

  // Información del comprador
  ctx.fillStyle = "#9ca3af";
  ctx.font = "18px Arial";
  ctx.fillText("COMPRADOR", 50, 240);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Arial";
  ctx.fillText(comprador.nombre, 50, 272);

  // Contacto
  let yPos = 308;
  ctx.font = "19px Arial";
  ctx.fillStyle = "#9ca3af";

  if (comprador.email) {
    ctx.fillText(`Email: ${comprador.email}`, 50, yPos);
    yPos += 30;
  }
  if (comprador.telefono) {
    ctx.fillText(`Teléfono/WhatsApp: ${comprador.telefono}`, 50, yPos);
    yPos += 30;
  }
  if (comprador.instagram_username) {
    ctx.fillText(`Instagram: @${comprador.instagram_username}`, 50, yPos);
    yPos += 30;
  }

  // Cantidad de chances
  yPos += 18;
  ctx.fillStyle = "#e5e5e5";
  ctx.font = "bold 26px Arial";
  ctx.fillText(`Total de Chances: ${comprador.cantidad_chances}`, 50, yPos);

  // Precio pagado (solo si está disponible)
  if (comprador.precio_pagado != null) {
    yPos += 45;
    ctx.fillStyle = "#ff0040";
    ctx.font = "bold 32px Arial";
    ctx.fillText(
      `Total Pagado: ${formatearMonto(
        comprador.precio_pagado,
        comprador.moneda || "ARS",
      )}`,
      50,
      yPos,
    );
  }

  // Números asignados
  yPos += 55;
  ctx.fillStyle = "#ff0040";
  ctx.font = "bold 28px Arial";
  ctx.fillText("Tus Números:", 50, yPos);

  // Dibujar números como tickets (estilo de la imagen)
  yPos += 50;
  const startX = 50;
  let currentX = startX;
  let currentY = yPos;

  // Ordenar números para mejor visualización
  const numerosOrdenados = [...comprador.numeros_asignados].sort(
    (a, b) => a - b,
  );

  numerosOrdenados.forEach((numero, index) => {
    // Calcular posición
    if (index > 0 && index % ticketsPerRow === 0) {
      currentX = startX;
      currentY += ticketHeight + ticketGap;
    }

    // Dibujar ticket usando el path del SVG
    ctx.save();
    ctx.translate(currentX, currentY);

    // El SVG original es 32x32 pero más ancho que alto (como un ticket)
    // Vamos a escalarlo manteniendo la proporción correcta
    const scale = ticketWidth / 32;
    ctx.scale(scale, scale);

    // Path del SVG ticket-blank
    const ticketPath = new Path2D(
      "M30 13.75c0.414-0 0.75-0.336 0.75-0.75v0-5c-0-0.414-0.336-0.75-0.75-0.75h-28c-0.414 0-0.75 0.336-0.75 0.75v0 5c0 0.414 0.336 0.75 0.75 0.75v0c1.243 0 2.25 1.007 2.25 2.25s-1.007 2.25-2.25 2.25v0c-0.414 0-0.75 0.336-0.75 0.75v0 5c0 0.414 0.336 0.75 0.75 0.75h28c0.414-0 0.75-0.336 0.75-0.75v0-5c-0-0.414-0.336-0.75-0.75-0.75v0c-1.243 0-2.25-1.007-2.25-2.25s1.007-2.25 2.25-2.25v0z",
    );

    // Gradiente rojo de marca
    const gradient = ctx.createLinearGradient(0, 8, 0, 24);
    gradient.addColorStop(0, "#ff0040"); // Rojo neón
    gradient.addColorStop(1, "#cc0033"); // Rojo más oscuro
    ctx.fillStyle = gradient;
    ctx.fill(ticketPath);

    ctx.strokeStyle = "#80001f"; // Borde rojo oscuro
    ctx.lineWidth = 0.6;
    ctx.stroke(ticketPath);

    // Número en el centro del ticket (en coordenadas del SVG escalado)
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${28 / scale}px Arial`; // Tamaño de fuente más grande
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      numero.toString(),
      16, // Centro horizontal del SVG (32/2)
      16, // Centro vertical del SVG (32/2)
    );

    ctx.restore();

    currentX += ticketWidth + ticketGap;
  });

  // Línea separadora antes del footer
  yPos = canvas.height - 130;
  ctx.strokeStyle = "#262626";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, yPos);
  ctx.lineTo(canvas.width - 50, yPos);
  ctx.stroke();

  // Fecha
  yPos = canvas.height - 95;
  ctx.fillStyle = "#9ca3af";
  ctx.font = "18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    `Fecha de compra: ${new Date(comprador.created_at).toLocaleDateString(
      "es-AR",
    )}`,
    canvas.width / 2,
    yPos,
  );

  // Convertir canvas a imagen y descargar
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `comprobante-${comprador.nombre.replace(
        /\s+/g,
        "-",
      )}-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      onSuccess?.();
    }
  });
}
