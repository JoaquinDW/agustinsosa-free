import { Resend } from "resend";
import { formatearMonto } from "./moneda";
import type { Moneda } from "./supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

// Remitente de marca (configurable vía env). Dominio: agustinsosa.com
const EMAIL_FROM =
  process.env.EMAIL_FROM || "Sosa Motos <hola@agustinsosa.com>";

// Dirección a la que el usuario puede responder (mejora la confianza/deliverability).
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || "hola@agustinsosa.com";

/* ------------------------------------------------------------------ */
/*  Paleta de marca (acorde a la landing: rojo + negro + blanco)       */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#0a0a0a",
  card: "#141414",
  cardSoft: "#1b1b1b",
  border: "#262626",
  red: "#ff0040",
  redDark: "#cc0033",
  text: "#e5e5e5",
  textDim: "#9ca3af",
  white: "#ffffff",
};

/* ------------------------------------------------------------------ */
/*  Helpers de render reutilizables                                     */
/* ------------------------------------------------------------------ */

function numerosChips(numeros: number[]): string {
  const ordenados = [...numeros].sort((a, b) => a - b);
  const chips = ordenados
    .map(
      (n) =>
        `<span style="display:inline-block;background:linear-gradient(135deg,${C.red},${C.redDark});color:#ffffff;font-weight:800;font-size:18px;font-family:'Courier New',monospace;padding:9px 15px;margin:5px;border-radius:9px;box-shadow:0 2px 8px rgba(255,0,64,0.30);">${n}</span>`,
    )
    .join("");

  return `
    <div style="background:${C.bg};border:1px solid ${C.border};border-radius:14px;padding:18px 12px;margin:14px 0 4px;text-align:center;">
      ${chips}
    </div>`;
}

function infoBox(
  rows: { label: string; value: string; color?: string }[],
): string {
  const html = rows
    .map(
      (r, i) => `
      <tr>
        <td style="padding:12px 0;${
          i < rows.length - 1 ? `border-bottom:1px solid ${C.border};` : ""
        }color:${C.textDim};font-size:14px;">${r.label}</td>
        <td style="padding:12px 0;${
          i < rows.length - 1 ? `border-bottom:1px solid ${C.border};` : ""
        }color:${r.color || C.white};font-size:15px;font-weight:700;text-align:right;">${
          r.value
        }</td>
      </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardSoft};border:1px solid ${C.border};border-radius:14px;padding:6px 20px;margin:20px 0;">
      ${html}
    </table>`;
}

/**
 * Layout base compartido por todos los emails transaccionales.
 */
function baseEmail(opts: {
  preheader: string;
  badge?: string;
  badgeColor?: string;
  title: string;
  subtitle: string;
  bodyHtml: string;
}): string {
  const { preheader, badge, badgeColor, title, subtitle, bodyHtml } = opts;

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:${C.bg};-webkit-font-smoothing:antialiased;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border:1px solid ${C.border};border-radius:18px;overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#000000 0%,#1a1a1a 100%);padding:34px 30px 28px;text-align:center;border-bottom:2px solid ${C.red};">
                <div style="display:inline-block;font-size:22px;font-weight:900;letter-spacing:1px;color:${C.white};">
                  SOSA <span style="color:${C.red};">MOTOS</span> 🏍️
                </div>
                <div style="height:3px;width:54px;margin:14px auto 18px;background:${C.red};border-radius:3px;box-shadow:0 0 14px rgba(255,0,64,0.5);"></div>
                ${
                  badge
                    ? `<div style="display:inline-block;background:${
                        badgeColor || C.red
                      };color:#ffffff;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:999px;margin-bottom:14px;">${badge}</div><br/>`
                    : ""
                }
                <h1 style="margin:6px 0 0;font-size:26px;font-weight:800;color:${C.white};">${title}</h1>
                <p style="margin:8px 0 0;color:${C.textDim};font-size:14px;">${subtitle}</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px;color:${C.text};font-size:15px;line-height:1.7;">
                ${bodyHtml}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 30px;border-top:1px solid ${C.border};text-align:center;">
                <p style="margin:0 0 4px;color:${C.white};font-size:13px;font-weight:700;letter-spacing:.5px;">SOSA <span style="color:${C.red};">MOTOS</span> 🏍️</p>
                <p style="margin:0;color:${C.textDim};font-size:12px;">¿Tenés alguna duda? Respondé a este email y te ayudamos.</p>
                <p style="margin:6px 0 0;color:#5f5f5f;font-size:12px;">© ${new Date().getFullYear()} Sosa Motos. Todos los derechos reservados.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

/**
 * Reescribe una URL pública de Supabase Storage para servirla a través de
 * nuestro propio dominio (/api/imagen/...). Mejora la entregabilidad: Gmail
 * desconfía de imágenes cuyo host no coincide con el dominio remitente.
 * Si no hay base configurada o la URL no es de Supabase, se devuelve tal cual.
 */
function aUrlPropia(url: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const marker = "/storage/v1/object/public/";
  const i = url.indexOf(marker);
  if (!base || i === -1) return url;
  return `${base}/api/imagen/${url.slice(i + marker.length)}`;
}

function imagenSorteo(url?: string): string {
  if (!url) return "";
  return `
    <div style="text-align:center;margin:24px 0 6px;">
      <img src="${aUrlPropia(url)}" alt="Imagen del sorteo" style="max-width:320px;width:100%;height:auto;border-radius:14px;border:3px solid ${C.red};box-shadow:0 8px 24px rgba(0,0,0,0.45);" />
    </div>`;
}

/*
 * Contenido digital retirado: se conserva el bloque anterior como referencia,
 * pero ya no se incluye ningún enlace de descarga en los correos.
 *
 * function botonDescarga(compradorId?: string): string {
 *   const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
 *   if (!compradorId || !baseUrl) return "";
 *
 *   const url = `${baseUrl.replace(/\/$/, "")}/api/descargar/${compradorId}`;
 *   return `
 *     <div style="background:rgba(255,0,64,0.06);border:1px solid rgba(255,0,64,0.30);border-radius:14px;padding:20px;margin:24px 0;text-align:center;">
 *       <p style="margin:0 0 14px;color:${C.white};font-size:15px;font-weight:700;">📥 ¡Tu contenido digital está listo!</p>
 *       <p style="margin:0 0 16px;color:${C.textDim};font-size:13px;">Descargá el material que viene con tu compra.</p>
 *       <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,${C.red},${C.redDark});color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;box-shadow:0 4px 14px rgba(255,0,64,0.35);">Descargar tu contenido</a>
 *     </div>`;
 * }
 */

const cierreSuerte = `<p style="text-align:center;font-size:17px;font-weight:600;color:${C.red};margin:26px 0 4px;">¡Mucha suerte a todos!</p>`;

/* ------------------------------------------------------------------ */
/*  Email: Confirmación de compra (MercadoPago)                         */
/* ------------------------------------------------------------------ */

export interface EmailData {
  nombre: string;
  email: string;
  cantidadChances: number;
  numerosAsignados: number[];
  precioPagado: number;
  sorteoNombre?: string;
  sorteoImagenUrl?: string;
  compradorId?: string;
  esGratuito?: boolean; // Participación gratuita (/free): cambia copy y oculta "Total pagado"
}

export async function enviarEmailConfirmacion(data: EmailData) {
  try {
    const { data: emailResult, error } = await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      to: [data.email],
      subject: data.esGratuito
        ? `🍀 ¡Participación confirmada${
            data.sorteoNombre ? ` - ${data.sorteoNombre}` : ""
          }!`
        : `🎉 ¡Compra confirmada${
            data.sorteoNombre ? ` - ${data.sorteoNombre}` : ""
          }!`,
      html: generarHTMLEmail(data),
      headers: {
        "List-Unsubscribe": "<mailto:hola@agustinsosa.com>",
      },
    });

    if (error) {
      console.error("Error enviando email:", error);
      return { success: false, error };
    }

    return { success: true, data: emailResult };
  } catch (error) {
    console.error("Error enviando email:", error);
    return { success: false, error };
  }
}

function generarHTMLEmail(data: EmailData): string {
  const esGratuito = data.esGratuito === true;

  const infoRows = [
    {
      label: esGratuito ? "Tu número" : "Chances",
      value: esGratuito
        ? `${data.numerosAsignados[0] ?? ""}`
        : `${data.cantidadChances}`,
    },
    ...(esGratuito
      ? []
      : [
          {
            label: "Total pagado",
            value: `$${data.precioPagado.toLocaleString("es-AR")}`,
            color: C.red,
          },
        ]),
    { label: "Email", value: data.email, color: C.text },
  ];

  const intro = esGratuito
    ? "¡Tu participación gratuita quedó registrada y ya tenés tu número asignado! Te deseamos la mejor de las suertes."
    : "¡Tu compra fue aprobada y tus números ya quedaron asignados! Te deseamos la mejor de las suertes.";

  const body = `
    <p style="margin:0 0 14px;">Hola <strong style="color:${C.white};">${data.nombre}</strong>,</p>
    <p style="margin:0 0 18px;color:${C.textDim};">${intro}</p>

    <p style="margin:24px 0 0;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${C.red};">${
      esGratuito ? "Tu número" : "Tus números"
    }</p>
    ${numerosChips(data.numerosAsignados)}

    ${infoBox(infoRows)}

    ${
      // El contenido digital ya no se entrega con la compra.
      ""
    }
    ${imagenSorteo(data.sorteoImagenUrl)}
    ${cierreSuerte}
  `;

  return baseEmail({
    preheader: esGratuito
      ? "Tu participación gratuita quedó registrada y tu número ya está asignado."
      : "Tu compra fue confirmada y tus números ya están asignados.",
    badge: esGratuito ? "Participación confirmada" : "Compra confirmada",
    badgeColor: C.red,
    title: esGratuito ? "¡Participación Confirmada!" : "¡Compra Confirmada!",
    subtitle: "Tu participación quedó registrada exitosamente",
    bodyHtml: body,
  });
}

/* ------------------------------------------------------------------ */
/*  Email: Transferencia aprobada                                       */
/* ------------------------------------------------------------------ */

export interface TransferenciaAprobadaData {
  nombre: string;
  email: string;
  cantidadChances: number;
  numerosAsignados: number[];
  precioPagado: number;
  moneda?: Moneda;
  nombreSorteo: string;
  sorteoImagenUrl?: string;
  compradorId?: string;
}

export interface TransferenciaRechazadaData {
  nombre: string;
  email: string;
  cantidadChances: number;
  precioPagado: number;
  moneda?: Moneda;
  nombreSorteo: string;
  motivo?: string;
}

export async function enviarEmailTransferenciaAprobada(
  data: TransferenciaAprobadaData,
) {
  try {
    const { data: emailResult, error } = await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      to: [data.email],
      subject: `✅ ¡Transferencia aprobada! - ${data.nombreSorteo}`,
      html: generarHTMLTransferenciaAprobada(data),
      headers: {
        "List-Unsubscribe": "<mailto:hola@agustinsosa.com>",
      },
    });

    if (error) {
      console.error("Error enviando email de transferencia aprobada:", error);
      return { success: false, error };
    }

    return { success: true, data: emailResult };
  } catch (error) {
    console.error("Error enviando email de transferencia aprobada:", error);
    return { success: false, error };
  }
}

export async function enviarEmailTransferenciaRechazada(
  data: TransferenciaRechazadaData,
) {
  try {
    const { data: emailResult, error } = await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      to: [data.email],
      subject: "❌ Transferencia no aprobada",
      html: generarHTMLTransferenciaRechazada(data),
      headers: {
        "List-Unsubscribe": "<mailto:hola@agustinsosa.com>",
      },
    });

    if (error) {
      console.error("Error enviando email de transferencia rechazada:", error);
      return { success: false, error };
    }

    return { success: true, data: emailResult };
  } catch (error) {
    console.error("Error enviando email de transferencia rechazada:", error);
    return { success: false, error };
  }
}

function generarHTMLTransferenciaAprobada(
  data: TransferenciaAprobadaData,
): string {
  const body = `
    <p style="margin:0 0 14px;">Hola <strong style="color:${C.white};">${data.nombre}</strong>,</p>
    <p style="margin:0 0 18px;color:${C.textDim};">Verificamos tu transferencia y todo está en orden. Tus números ya quedaron asignados para <strong style="color:${C.white};">${data.nombreSorteo}</strong>.</p>

    <p style="margin:24px 0 0;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${C.red};">Tus números</p>
    ${numerosChips(data.numerosAsignados)}

    ${infoBox([
      { label: "Chances", value: `${data.cantidadChances}` },
      {
        label: "Total pagado",
        value: formatearMonto(data.precioPagado, data.moneda || "ARS"),
        color: C.red,
      },
      { label: "Email", value: data.email, color: C.text },
    ])}

    ${
      // El contenido digital ya no se entrega con la compra.
      ""
    }
    ${imagenSorteo(data.sorteoImagenUrl)}
    ${cierreSuerte}
  `;

  return baseEmail({
    preheader: "Tu transferencia fue verificada y tus números están asignados.",
    badge: "Pago verificado",
    badgeColor: C.red,
    title: "¡Transferencia Aprobada!",
    subtitle: "Tu pago fue verificado y aprobado exitosamente",
    bodyHtml: body,
  });
}

function generarHTMLTransferenciaRechazada(
  data: TransferenciaRechazadaData,
): string {
  const body = `
    <p style="margin:0 0 14px;">Hola <strong style="color:${C.white};">${data.nombre}</strong>,</p>
    <p style="margin:0 0 18px;color:${C.textDim};">Lamentamos informarte que no pudimos aprobar tu transferencia para participar en <strong style="color:${C.white};">${data.nombreSorteo}</strong>.</p>

    ${infoBox([
      { label: "Chances solicitadas", value: `${data.cantidadChances}` },
      {
        label: "Monto esperado",
        value: formatearMonto(data.precioPagado, data.moneda || "ARS"),
        color: C.red,
      },
      { label: "Email", value: data.email, color: C.text },
    ])}

    ${
      data.motivo
        ? `<div style="background:rgba(255,0,64,0.08);border:1px solid rgba(255,0,64,0.35);border-radius:12px;padding:16px 18px;margin:20px 0;">
            <p style="margin:0 0 6px;color:${C.red};font-weight:800;font-size:13px;letter-spacing:.5px;">📋 MOTIVO</p>
            <p style="margin:0;color:${C.text};">${data.motivo}</p>
          </div>`
        : ""
    }

    <div style="background:${C.cardSoft};border:1px solid ${C.border};border-radius:12px;padding:18px 20px;margin:20px 0;">
      <p style="margin:0 0 10px;color:${C.red};font-weight:800;font-size:14px;">💬 ¿Qué podés hacer?</p>
      <ul style="margin:0;padding-left:20px;color:${C.textDim};line-height:1.8;">
        <li>Verificá que hayas enviado el comprobante correcto.</li>
        <li>Asegurate de que el monto transferido sea exacto.</li>
        <li>Podés enviar un nuevo comprobante si es necesario.</li>
        <li>Contactanos si tenés dudas sobre tu transferencia.</li>
      </ul>
    </div>

    <p style="margin:0;color:${C.textDim};">Si creés que hubo un error, no dudes en contactarnos. Estaremos encantados de ayudarte.</p>
    ${cierreSuerte}
  `;

  return baseEmail({
    preheader:
      "No pudimos verificar tu transferencia. Te contamos los pasos a seguir.",
    badge: "Acción requerida",
    badgeColor: C.red,
    title: "Transferencia No Aprobada",
    subtitle: "Necesitamos que revises tu pago",
    bodyHtml: body,
  });
}
