import { describe, expect, it } from "vitest";
import { friendlyError } from "@/lib/errors";
import { formatMoney, slugify, whatsappLink } from "@/lib/format";
import { renderEmail, renderText } from "@/lib/notifications/templates";
import { addDays, dayRangeUtc, localTime, startOfWeek, weekdayOf, zonedToUtcISO } from "@/lib/time";
import { createBookingSchema } from "@/lib/validation";

describe("time", () => {
  it("convierte hora local de Santiago a UTC respetando horario de verano", () => {
    expect(zonedToUtcISO("2026-11-26", "10:00", "America/Santiago")).toBe("2026-11-26T13:00:00.000Z"); // UTC-3
    expect(zonedToUtcISO("2026-07-15", "10:00", "America/Santiago")).toBe("2026-07-15T14:00:00.000Z"); // UTC-4
    expect(localTime("2026-11-26T13:00:00Z", "America/Santiago")).toBe("10:00");
  });
  it("aritmética de fechas", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekdayOf("2026-11-22")).toBe(0);
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16");
    const r = dayRangeUtc("2026-11-26", "America/Santiago");
    expect(r.from).toBe("2026-11-26T03:00:00.000Z");
    expect(r.to).toBe("2026-11-27T03:00:00.000Z");
  });
});

describe("format", () => {
  it("formatea CLP sin decimales", () => {
    expect(formatMoney(14000, "CLP", "es-CL").replace(/\s/g, "")).toBe("$14.000");
  });
  it("slug y whatsapp", () => {
    expect(slugify("Matías Rojas ")).toBe("matias-rojas");
    expect(whatsappLink("+56 9 1234 5678", "Hola")).toBe("https://wa.me/56912345678?text=Hola");
    expect(whatsappLink("")).toBeNull();
  });
});

describe("errores", () => {
  it("traduce códigos de la base de datos", () => {
    expect(friendlyError({ message: "SLOT_UNAVAILABLE" })).toMatch(/ocuparse/);
    expect(friendlyError({ message: 'conflicting key value violates exclusion constraint "bookings_no_overlap"' })).toMatch(/ocuparse/);
    expect(friendlyError({ message: "algo raro" })).toMatch(/inesperado/);
  });
});

describe("validación de reservas", () => {
  const base = {
    serviceId: "11111111-0000-0000-0000-000000000001",
    startsAt: "2026-11-26T13:00:00+00:00",
    name: "Juan Pérez",
    phone: "+56 9 1234 5678",
  };
  it("acepta una reserva válida y normaliza opcionales", () => {
    const r = createBookingSchema.parse({ ...base, email: "" });
    expect(r.email).toBeNull();
  });
  it("rechaza teléfono, correo y honeypot inválidos", () => {
    expect(createBookingSchema.safeParse({ ...base, phone: "123" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, email: "x@" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, website: "spam" }).success).toBe(false);
  });
});

describe("plantillas de notificación", () => {
  const d = {
    businessName: "Onyx <Barber>",
    businessAddress: "Calle 1",
    businessPhone: null,
    customerName: "Juan Pérez",
    serviceName: "Fade",
    barberName: "Tomás",
    startsAt: "2026-11-26T13:00:00Z",
    total: 14000,
    code: "ABC123",
    status: "confirmed",
    timezone: "America/Santiago",
    currency: "CLP",
    locale: "es-CL",
    manageUrl: "https://x/reserva/ABC123",
    bookUrl: "https://x/reservar",
    cancellationPolicy: null,
  };
  it("incluye los datos de la cita y escapa HTML", () => {
    const t = renderText("reminder", d);
    expect(t).toContain("10:00");
    expect(t).toContain("ABC123");
    const e = renderEmail("confirmation", d);
    expect(e.subject).toContain("confirmada");
    expect(e.html).toContain("Onyx &lt;Barber&gt;");
    expect(e.html).not.toContain("<Barber>");
  });
});
