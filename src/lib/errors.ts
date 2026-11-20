const MESSAGES: Record<string, string> = {
  SLOT_UNAVAILABLE: "Ese horario acaba de ocuparse o ya no está disponible. Elige otra hora.",
  INVALID_NAME: "Ingresa un nombre válido (2 a 80 caracteres).",
  INVALID_PHONE: "Ingresa un teléfono válido, con código de país (p. ej. +56 9 1234 5678).",
  INVALID_EMAIL: "El correo electrónico no es válido.",
  INVALID_NOTES: "El comentario es demasiado largo (máx. 500 caracteres).",
  INVALID_SERVICE: "El servicio seleccionado no está disponible.",
  INVALID_COUPON: "El cupón no es válido o ya expiró.",
  TOO_MANY_BOOKINGS: "Ya tienes 3 reservas activas. Cancela una o contáctanos por WhatsApp.",
  TOO_MANY_REQUESTS: "Ya tienes solicitudes pendientes en la lista de espera.",
  BARBER_REQUIRED: "Selecciona un barbero.",
  FORBIDDEN: "No tienes permisos para realizar esta acción.",
  NOT_FOUND: "No encontramos la reserva. Revisa el código y el teléfono.",
  INVALID_STATUS: "La reserva ya no se puede modificar en su estado actual.",
  CANCELLATION_WINDOW: "Tu cita está muy próxima para cancelarla online. Escríbenos por WhatsApp.",
  FEATURE_DISABLED: "Esta función no está disponible en este momento.",
  INVALID_DATE: "La fecha no es válida.",
  INVALID_RATING: "Selecciona una calificación de 1 a 5.",
  INVALID_COMMENT: "El comentario es demasiado largo.",
  INVALID_BOOKING: "El código de reserva no corresponde a una visita atendida.",
  ALREADY_REVIEWED: "Esta visita ya tiene una reseña. ¡Gracias!",
};

export function errorCode(err: unknown) {
  if (typeof err === "string") return err;
  return err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
}

/** Traduce errores de Postgres/RPC (raise exception 'CODE') a mensajes legibles. */
export function friendlyError(err: unknown, fallback = "Ocurrió un error inesperado. Inténtalo nuevamente.") {
  const msg = errorCode(err);
  if (MESSAGES[msg]) return MESSAGES[msg];
  if (/violates foreign key/.test(msg)) return "No se puede eliminar porque tiene registros asociados. Desactívalo en su lugar.";
  if (/duplicate key/.test(msg)) return "Ya existe un registro con ese valor.";
  if (/bookings_no_overlap/.test(msg)) return MESSAGES.SLOT_UNAVAILABLE;
  if (/row-level security|permission denied/.test(msg)) return MESSAGES.FORBIDDEN;
  return fallback;
}
