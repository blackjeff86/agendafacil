import type { Session, User } from "@supabase/supabase-js";
import { buildFallbackPublic } from "../constants/fallbackPublic";
import type {
  AppointmentRow,
  AppointmentSeriesRow,
  BookingState,
  Business,
  BusinessHourRow,
  CustomerRow,
  ProfessionalRow,
  ProfessionalServiceRow,
  PublicData,
  ServiceRow,
  SupportEventRow,
} from "../types";

export const FALLBACK_PUBLIC: PublicData = buildFallbackPublic();

export const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  confirmado: { label: "Confirmado", cls: "badge-success" },
  pendente: { label: "Pendente", cls: "badge-warning" },
  cancelado: { label: "Cancelado", cls: "badge-danger" },
  concluido: { label: "Concluido", cls: "badge-brand" },
};

export interface AppState {
  session: Session | null;
  user: User | null;
  isPlatformAdmin: boolean;
  business: Business | null;
  services: ServiceRow[];
  professionals: ProfessionalRow[];
  professionalServices: ProfessionalServiceRow[];
  customers: CustomerRow[];
  appointmentSeries: AppointmentSeriesRow[];
  appointments: AppointmentRow[];
  hours: BusinessHourRow[];
  currentFilter: string;
  selectedAppointment: AppointmentRow | null;
  editingAppointmentId: string | null;
  /** Snapshot ao abrir "Editar" — usado para WhatsApp de reagendamento e validação. */
  editingAppointmentOriginal: AppointmentRow | null;
  editingServiceId: string | null;
  editingProfessionalId: string | null;
  pendingConfirmAction: (() => Promise<void>) | null;
  supportBusinesses: Business[];
  supportEvents: SupportEventRow[];
  supportSelectedBusinessId: string | null;
  supportContextBusinessId: string | null;
  supportFilter: string;
  supportPage: number;
  publicData: PublicData;
}

export const state: AppState = {
  session: null,
  user: null,
  isPlatformAdmin: false,
  business: null,
  services: [],
  professionals: [],
  professionalServices: [],
  customers: [],
  appointmentSeries: [],
  appointments: [],
  hours: [],
  currentFilter: "todos",
  selectedAppointment: null,
  editingAppointmentId: null,
  editingAppointmentOriginal: null,
  editingServiceId: null,
  editingProfessionalId: null,
  pendingConfirmAction: null,
  supportBusinesses: [],
  supportEvents: [],
  supportSelectedBusinessId: null,
  supportContextBusinessId: null,
  supportFilter: "todos",
  supportPage: 1,
  publicData: {
    business: null,
    services: [],
    professionals: [],
    hours: [],
  },
};

export let bookingState: BookingState = {
  mode: "service",
  serviceId: null,
  profId: null,
  date: null,
  time: null,
};

export function setBookingState(next: BookingState): void {
  bookingState = next;
}

export let pubStepHistory: number[] = [0];

export function setPubStepHistory(next: number[]): void {
  pubStepHistory = next;
}

export let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function setToastTimer(t: ReturnType<typeof setTimeout> | null): void {
  toastTimer = t;
}
