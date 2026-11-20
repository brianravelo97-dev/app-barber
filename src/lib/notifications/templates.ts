import { formatLongDate, formatMoney, formatTime } from "@/lib/format";

export type NotificationType = "confirmation" | "reminder" | "cancellation" | "reschedule" | "waitlist";

export type TemplateData = {
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
  customerName: string;
  serviceName: string;
  barberName: string;
  startsAt: string;
  total: number;
  code: string;
  status: string;
  timezone: string;
  currency: string;
  locale: string;
  manageUrl: string;
  bookUrl: string;
  cancellationPolicy: string | null;
};

const SUBJECTS: Record<NotificationType, (d: TemplateData) => string> = {
  confirmation: (d) =>
    d.status === "pending" ? `Recibimos tu reserva · ${d.businessName}` : `Reserva confirmada · ${d.businessName}`,
  reminder: (d) => `Recordatorio: tu cita en ${d.businessName}`,
  cancellation: (d) => `Reserva cancelada · ${d.businessName}`,
  reschedule: (d) => `Tu cita fue reprogramada · ${d.businessName}`,
  waitlist: (d) => `Se liberó un horario en ${d.businessName}`,
};

function intro(type: NotificationType, d: TemplateData) {
  const first = d.customerName.split(" ")[0];
  switch (type) {
    case "confirmation":
      return d.status === "pending"
        ? `Hola ${first}, recibimos tu solicitud de reserva. Te avisaremos apenas sea confirmada.`
        : `Hola ${first}, tu reserva está confirmada. ¡Te esperamos!`;
    case "reminder":
      return `Hola ${first}, te recordamos tu próxima cita.`;
    case "cancellation":
      return `Hola ${first}, tu reserva fue cancelada. Si fue un error, puedes reservar nuevamente cuando quieras.`;
    case "reschedule":
      return `Hola ${first}, tu cita fue reprogramada. Estos son los nuevos detalles:`;
    case "waitlist":
      return `Hola ${first}, se liberó un horario para la fecha que solicitaste. Reserva antes de que se ocupe.`;
  }
}

export function renderText(type: NotificationType, d: TemplateData) {
  const date = formatLongDate(d.startsAt, d.timezone, d.locale);
  const time = formatTime(d.startsAt, d.timezone, d.locale);
  if (type === "waitlist") {
    return `${intro(type, d)}\n\nReserva aquí: ${d.bookUrl}\n\n— ${d.businessName}`;
  }
  const lines = [
    `*${d.businessName}*`,
    intro(type, d),
    "",
    `Servicio: ${d.serviceName}`,
    `Barbero: ${d.barberName}`,
    `Fecha: ${date}`,
    `Hora: ${time}`,
    type !== "cancellation" ? `Total: ${formatMoney(d.total, d.currency, d.locale)}` : null,
    `Código: ${d.code}`,
    d.businessAddress && type !== "cancellation" ? `Dirección: ${d.businessAddress}` : null,
    "",
    type !== "cancellation" ? `Gestiona tu reserva: ${d.manageUrl}` : `Reservar de nuevo: ${d.bookUrl}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderEmail(type: NotificationType, d: TemplateData) {
  const subject = SUBJECTS[type](d);
  const date = formatLongDate(d.startsAt, d.timezone, d.locale);
  const time = formatTime(d.startsAt, d.timezone, d.locale);
  const rows =
    type === "waitlist"
      ? []
      : [
          ["Servicio", d.serviceName],
          ["Barbero", d.barberName],
          ["Fecha", date],
          ["Hora", time],
          ...(type !== "cancellation" ? [["Total", formatMoney(d.total, d.currency, d.locale)]] : []),
          ["Código", d.code],
        ];
  const cta =
    type === "cancellation" || type === "waitlist"
      ? { href: d.bookUrl, label: "Reservar hora" }
      : { href: d.manageUrl, label: "Ver mi reserva" };

  const html = `<!doctype html><html><body style="margin:0;background:#0e0e0e;font-family:Helvetica,Arial,sans-serif;color:#f4efe6">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#161616;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden">
<tr><td style="padding:28px 28px 8px;text-align:center">
<div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#c8a165">${esc(d.businessName)}</div>
<h1 style="margin:14px 0 6px;font-size:22px;font-weight:600;color:#f4efe6">${esc(subject.split(" · ")[0])}</h1>
<p style="margin:0;color:#b3aea6;font-size:15px;line-height:1.5">${esc(intro(type, d))}</p>
</td></tr>
${
  rows.length
    ? `<tr><td style="padding:20px 28px"><table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a2a2a">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#8a8784;font-size:13px">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;font-size:14px;color:#f4efe6">${esc(v)}</td></tr>`,
  )
  .join("")}
</table></td></tr>`
    : ""
}
<tr><td style="padding:8px 28px 28px;text-align:center">
<a href="${esc(cta.href)}" style="display:inline-block;background:#c8a165;color:#0e0e0e;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;font-size:14px">${cta.label}</a>
${d.businessAddress ? `<p style="margin:20px 0 0;color:#8a8784;font-size:12px">${esc(d.businessAddress)}${d.businessPhone ? ` · ${esc(d.businessPhone)}` : ""}</p>` : ""}
${d.cancellationPolicy && type !== "cancellation" ? `<p style="margin:12px 0 0;color:#5a5a5a;font-size:11px;line-height:1.5">${esc(d.cancellationPolicy)}</p>` : ""}
</td></tr></table></td></tr></table></body></html>`;

  return { subject, html, text: renderText(type, d).replace(/\*/g, "") };
}
