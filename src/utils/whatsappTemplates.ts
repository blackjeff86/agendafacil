import type { AppointmentRow } from "../types";
import { formatCurrency, formatLongDate, formatTime } from "./formatters";

export function buildAppointmentConfirmationMessage(params: {
  clientName: string;
  businessName: string;
  serviceName: string;
  professionalName: string;
  appointmentDate: string;
  appointmentTime: string;
  priceLabel: string;
  /** Link da página pública com seus horários e histórico com o salão. */
  historicoUrl?: string | null;
}): string {
  const {
    clientName,
    businessName,
    serviceName,
    professionalName,
    appointmentDate,
    appointmentTime,
    priceLabel,
    historicoUrl,
  } = params;
  const first = clientName.split(/\s+/)[0] || clientName;
  const head = [
    `Olá, ${first}! 👋`,
    "",
    `Seu agendamento em *${businessName}* foi *confirmado*.`,
    "",
    `📅 ${formatLongDate(appointmentDate)}`,
    `🕐 ${formatTime(appointmentTime)}`,
    `✂️ ${serviceName}`,
    professionalName && professionalName !== "Sem preferencia" ? `👤 ${professionalName}` : "",
    `💰 ${priceLabel}`,
  ].filter(Boolean);
  const tail = ["", "Qualquer dúvida, responda esta mensagem."];
  const historicoBlock = historicoUrl ? ["", "Acompanhe seus horários com a gente:", historicoUrl] : [];
  return [...head, ...historicoBlock, ...tail].join("\n");
}

export function buildAppointmentConfirmationFromRow(
  appt: AppointmentRow,
  businessName: string,
  serviceName: string,
  professionalName: string,
  price: number,
  historicoUrl?: string | null
): string {
  return buildAppointmentConfirmationMessage({
    clientName: appt.client_name,
    businessName,
    serviceName: serviceName || "Serviço",
    professionalName: professionalName || "",
    appointmentDate: appt.appointment_date,
    appointmentTime: appt.appointment_time,
    priceLabel: formatCurrency(price),
    historicoUrl: historicoUrl ?? undefined,
  });
}

/** Lembrete no dia anterior ao agendamento (envio automático via cron + API WhatsApp). */
export function buildAppointmentDayBeforeReminderMessage(params: {
  clientName: string;
  businessName: string;
  serviceName: string;
  professionalName: string;
  appointmentDate: string;
  appointmentTime: string;
}): string {
  const { clientName, businessName, serviceName, professionalName, appointmentDate, appointmentTime } = params;
  const first = clientName.split(/\s+/)[0] || clientName;
  return [
    `Olá, ${first}! 👋`,
    "",
    `Lembrete: *amanhã* você tem horário em *${businessName}*.`,
    "",
    `📅 ${formatLongDate(appointmentDate)}`,
    `🕐 ${formatTime(appointmentTime)}`,
    `✂️ ${serviceName}`,
    professionalName && professionalName !== "Sem preferencia" ? `👤 ${professionalName}` : "",
    "",
    `Te esperamos! Se não puder comparecer, avise com antecedência.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export type AppointmentCancellationKind = "status_cancelado" | "deleted";

/** Cliente final: cancelamento / recusa (status cancelado) ou exclusão da agenda. */
export function buildAppointmentCancellationMessage(params: {
  clientName: string;
  businessName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  kind: AppointmentCancellationKind;
}): string {
  const { clientName, businessName, serviceName, appointmentDate, appointmentTime, kind } = params;
  const first = clientName.split(/\s+/)[0] || clientName;
  const bodyLine =
    kind === "deleted"
      ? "Seu agendamento foi *removido* da nossa agenda."
      : "Informamos que seu horário *não está mais confirmado* (cancelado ou não aceito).";
  return [
    `Olá, ${first}!`,
    "",
    bodyLine,
    "",
    `🏷️ *${businessName}*`,
    `📅 ${formatLongDate(appointmentDate)}`,
    `🕐 ${formatTime(appointmentTime)}`,
    `✂️ ${serviceName}`,
    "",
    `Dúvidas ou remarcação, fale conosco por aqui.`,
  ].join("\n");
}

export function buildAppointmentCancellationFromRow(
  appt: AppointmentRow,
  businessName: string,
  serviceName: string,
  kind: AppointmentCancellationKind
): string {
  return buildAppointmentCancellationMessage({
    clientName: appt.client_name,
    businessName,
    serviceName: serviceName || "Serviço",
    appointmentDate: appt.appointment_date,
    appointmentTime: appt.appointment_time,
    kind,
  });
}

/** Dono do salão reagendou — avisa o cliente com link para o histórico público. */
export function buildAppointmentRescheduledBySalonMessage(params: {
  clientName: string;
  businessName: string;
  serviceName: string;
  professionalName: string;
  newAppointmentDate: string;
  newAppointmentTime: string;
  historicoUrl: string;
}): string {
  const {
    clientName,
    businessName,
    serviceName,
    professionalName,
    newAppointmentDate,
    newAppointmentTime,
    historicoUrl,
  } = params;
  const first = clientName.split(/\s+/)[0] || clientName;
  const profLine =
    professionalName && professionalName !== "Sem preferencia" && professionalName !== "Sem preferência"
      ? `👤 ${professionalName}`
      : "";
  return [
    `Olá, ${first}!`,
    "",
    `Seu horário em *${businessName}* foi *reagendado* pelo salão.`,
    "",
    `✂️ ${serviceName}`,
    profLine,
    `📅 ${formatLongDate(newAppointmentDate)}`,
    `🕐 ${formatTime(newAppointmentTime)}`,
    "",
    `Quer ver seus horários e serviços com a gente?`,
    historicoUrl,
  ]
    .filter(Boolean)
    .join("\n");
}
