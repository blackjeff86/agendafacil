import type { ProfessionalRow } from "../types";

function normalizeTime(value: string | null | undefined): string | null {
  const time = String(value || "").slice(0, 5);
  return /^\d{2}:\d{2}$/.test(time) ? time : null;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export function isProfessionalBlockedForDate(professional: ProfessionalRow | null | undefined, date: string): boolean {
  if (!professional || !date) return false;

  const weekday = new Date(`${date}T12:00:00`).getDay();
  if (professional.day_off_weekday !== null && professional.day_off_weekday !== undefined && professional.day_off_weekday === weekday) {
    return true;
  }

  return Boolean(
    professional.vacation_start &&
      professional.vacation_end &&
      date >= professional.vacation_start &&
      date <= professional.vacation_end
  );
}

export function isProfessionalSlotBlocked(params: {
  professional: ProfessionalRow | null | undefined;
  date: string;
  time: string;
  durationMinutes: number;
}): boolean {
  const { professional, date, time, durationMinutes } = params;
  if (!professional || !date || !time) return false;
  if (isProfessionalBlockedForDate(professional, date)) return true;

  const lunchStart = normalizeTime(professional.lunch_start);
  const lunchEnd = normalizeTime(professional.lunch_end);
  const slotStart = normalizeTime(time);
  if (!lunchStart || !lunchEnd || !slotStart) return false;

  const slotDuration = Math.max(Number(durationMinutes) || 0, 1);
  const slotStartMinutes = timeToMinutes(slotStart);
  const slotEndMinutes = slotStartMinutes + slotDuration;
  return intervalsOverlap(slotStartMinutes, slotEndMinutes, timeToMinutes(lunchStart), timeToMinutes(lunchEnd));
}
