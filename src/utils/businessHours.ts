import type { BusinessHourRow } from "../types";
import { getLocalIsoDate } from "./formatters";

const FREEZE_MARKER = "__AF_FREEZE__";

type ParsedFreezeMeta = {
  displayName: string;
  frozen: boolean;
  frozenDate: string | null;
  frozenTime: string | null;
  frozenUntilTime: string | null;
};

function parseFreezeMeta(rawName: string | null | undefined): ParsedFreezeMeta {
  const value = String(rawName || "").trim();
  if (!value.includes(FREEZE_MARKER)) {
    return {
      displayName: value,
      frozen: false,
      frozenDate: null,
      frozenTime: null,
      frozenUntilTime: null,
    };
  }

  const [displayName, payload] = value.split(FREEZE_MARKER);
  const [frozenDate, timeRange] = String(payload || "").split("@");
  const [frozenTime, frozenUntilTime] = String(timeRange || "").split("-");
  return {
    displayName: String(displayName || "").trim(),
    frozen: Boolean(frozenDate && frozenTime),
    frozenDate: frozenDate || null,
    frozenTime: frozenTime || null,
    frozenUntilTime: frozenUntilTime || null,
  };
}

export function getBusinessHourDisplayName(rawName: string | null | undefined): string {
  return parseFreezeMeta(rawName).displayName;
}

export function serializeBusinessHourDayName(dayName: string, frozenDate?: string | null, frozenTime?: string | null, frozenUntilTime?: string | null): string {
  const clean = getBusinessHourDisplayName(dayName);
  if (!frozenDate || !frozenTime) return clean;
  const range = frozenUntilTime ? `${frozenTime}-${frozenUntilTime}` : frozenTime;
  return `${clean}${FREEZE_MARKER}${frozenDate}@${range}`;
}

export function normalizeBusinessHourRow<T extends BusinessHourRow>(row: T): T {
  const meta = parseFreezeMeta(row.day_name);
  return {
    ...row,
    day_name: meta.displayName,
    frozen: meta.frozen,
    frozen_date: row.frozen_date || meta.frozenDate,
    frozen_time: row.frozen_time || meta.frozenTime,
    frozen_until_time: row.frozen_until_time || meta.frozenUntilTime,
  };
}

export function normalizeBusinessHourRows<T extends BusinessHourRow>(rows: T[]): T[] {
  return (rows || []).map((row) => normalizeBusinessHourRow(row));
}

export function isBusinessHourFrozenForDate(row: BusinessHourRow | null | undefined, date: string): boolean {
  if (!row?.frozen || !row.frozen_date || !row.frozen_time) return false;
  return row.frozen_date === date;
}

export function isSlotBlockedByFreeze(row: BusinessHourRow | null | undefined, date: string, slot: string): boolean {
  if (!isBusinessHourFrozenForDate(row, date) || !row?.frozen_time) return false;
  if (slot < row.frozen_time) return false;
  if (row.frozen_until_time && slot >= row.frozen_until_time) return false;
  return true;
}

export function formatFreezeMetaLabel(row: BusinessHourRow | null | undefined): string {
  if (!row?.frozen || !row.frozen_time) return "";
  const labelDate = row.frozen_date === getLocalIsoDate()
    ? "hoje"
    : row.frozen_date
      ? new Date(`${row.frozen_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      : "";
  const rangeLabel = row.frozen_until_time ? ` de ${row.frozen_time} até ${row.frozen_until_time}` : ` às ${row.frozen_time}`;
  return `Pausado ${labelDate}${rangeLabel}`;
}
