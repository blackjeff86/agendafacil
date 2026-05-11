export type AppointmentStatus = "confirmado" | "pendente" | "cancelado" | "concluido";

export interface Business {
  id: string;
  owner_id: string;
  owner_email?: string | null;
  name: string;
  slug: string;
  category?: string | null;
  description?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  address?: string | null;
  logo_emoji?: string | null;
  logo_image_url?: string | null;
  cover_image_url?: string | null;
  plan_name?: string | null;
  /** starter | pro — null = conta legada (app trata como Pro). */
  plan_tier?: "starter" | "pro" | null;
  /** Fim do período de testes (7 dias), usado com billing_status trial. */
  trial_ends_at?: string | null;
  /** Próxima data de renovação (mensalidade) após o trial; editável pelo suporte. */
  next_billing_at?: string | null;
  billing_status?: string | null;
  blocked_reason?: string | null;
  support_notes?: string | null;
  active?: boolean;
  created_at?: string;
}

export interface ServiceRow {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  price: number;
  duration: number;
  category?: string | null;
  icon?: string | null;
  active: boolean;
  created_at?: string;
}

export interface ProfessionalRow {
  id: string;
  business_id: string;
  name: string;
  role?: string | null;
  emoji?: string | null;
  active: boolean;
  created_at?: string;
  serviceIds?: string[];
  serviceNames?: string[];
}

export interface ProfessionalServiceRow {
  professional_id: string;
  service_id: string;
}

export interface CustomerRow {
  id: string;
  business_id: string;
  name: string;
  email?: string | null;
  phone: string;
  last_booking_at?: string | null;
}

export interface AppointmentSeriesRow {
  id: string;
  business_id: string;
  service_id: string;
  professional_id?: string | null;
  start_date: string;
  appointment_time: string;
  recurrence_type: string;
  occurrences: number;
  notes?: string | null;
  created_at?: string;
}

export interface AppointmentRow {
  id: string;
  business_id: string;
  customer_id?: string | null;
  service_id: string;
  professional_id?: string | null;
  client_name: string;
  client_phone: string;
  client_email?: string | null;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  series_id?: string | null;
  /** Lembrete automático (D-1) já enviado ao cliente. */
  reminder_sent_at?: string | null;
  /** Token opaco para link da página “meus horários” (sem telefone na URL). */
  client_portal_token?: string | null;
}

export interface BusinessHourRow {
  id?: string;
  business_id?: string;
  day_of_week: number;
  day_name: string;
  open_time?: string | null;
  close_time?: string | null;
  active: boolean;
}

export interface SupportEventRow {
  id: string;
  business_id: string;
  actor_user_id?: string | null;
  actor_email?: string | null;
  event_type: string;
  title: string;
  details?: string | null;
  created_at?: string;
}

/** Retorno de get_public_client_snapshot (histórico público por telefone). */
export interface PublicClientAppointmentSnapshot {
  id: string;
  service_id: string;
  professional_id: string | null;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  service_name: string;
  professional_name: string;
}

export interface PublicClientSnapshotStats {
  total_visitas: number;
  total_reservados: number;
  top_services: { service_id: string; service_name: string; cnt: number }[];
}

export interface ServiceDraft {
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  icon: string;
  active: boolean;
}

export interface ProfessionalDraft {
  name: string;
  role: string;
  emoji: string;
  active: boolean;
  serviceNames: string[];
}

export interface BusinessHourDraft {
  day_of_week: number;
  day_name: string;
  open_time: string | null;
  close_time: string | null;
  active: boolean;
}

export interface PendingBusinessDraft {
  name: string;
  slug: string;
  category: string;
  email?: string;
  password?: string;
  description?: string;
  whatsapp?: string;
  instagram?: string;
  address?: string;
  logo_emoji?: string;
  logo_image_url?: string;
  cover_image_url?: string;
  plan_name?: string;
  billing_status?: string;
}

export interface PublicData {
  business: Business | null;
  services: ServiceRow[];
  professionals: ProfessionalRow[];
  hours: BusinessHourRow[];
}

export interface BookingState {
  mode: "service" | "prof";
  serviceId: string | null;
  profId: string | number | null;
  date: string | null;
  time: string | null;
}

export interface LastBookingPayload {
  name: string;
  email: string;
  phone: string;
  notes: string;
  recurrenceType: string;
  recurrenceCount: number;
  service: ServiceRow;
  professional?: ProfessionalRow;
  date: string;
  time: string;
  business: Business;
  /** Token para link de histórico público (mensagem WhatsApp pós-reserva). */
  portalToken?: string | null;
}
