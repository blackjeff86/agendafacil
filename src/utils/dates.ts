import type { BusinessHourRow } from "../types";
import { isSlotBlockedByFreeze } from "./businessHours";

export function generateTimeSlotsForDate(date: string, hours: BusinessHourRow[]): string[] {
  const day = new Date(`${date}T12:00:00`).getDay();
  const rule = (hours || []).find((item) => Number(item.day_of_week) === day && item.active);
  if (!rule || !rule.open_time || !rule.close_time) {
    return [];
  }

  const slots: string[] = [];
  let [hour, minute] = rule.open_time.slice(0, 5).split(":").map(Number);
  const [closeHour, closeMinute] = rule.close_time.slice(0, 5).split(":").map(Number);
  const now = new Date();
  const isToday = new Date(`${date}T12:00:00`).toDateString() === now.toDateString();
  while (hour < closeHour || (hour === closeHour && minute < closeMinute)) {
    const slot = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const notPast = !isToday || slot > now.toTimeString().slice(0, 5);
    const notFrozen = !isSlotBlockedByFreeze(rule, date, slot);
    if (notPast && notFrozen) {
      slots.push(slot);
    }
    minute += 30;
    if (minute >= 60) {
      hour += 1;
      minute -= 60;
    }
  }
  return slots;
}
