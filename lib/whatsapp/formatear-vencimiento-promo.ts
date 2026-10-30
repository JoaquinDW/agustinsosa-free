export function formatearVencimientoPromo(fecha: Date | string): string {
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(fecha))
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value || "-"
  return `${valor("day").padStart(2, "0")}/${valor("month").padStart(2, "0")} a las ${valor("hour")}:${valor("minute")}`
}
