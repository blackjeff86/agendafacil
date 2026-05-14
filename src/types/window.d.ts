import type { LastBookingPayload } from "./index";

export {};

declare global {
  interface Window {
    _lastBooking?: LastBookingPayload;
    _waMsg?: string;
    startFromServicePreview: (serviceId: string) => void;
    startFromProfessionalPreview: (professionalId: string) => void;
    showCustomerPortal: () => void;
    selectCustomerPortalDate: (dateIso: string) => void;
    clearCustomerPortalDateFilter: () => void;
    selectCustomerPortalStatusFilter: (status: string) => void;
    openCustomerPortalReschedule: (appointmentId: string) => void;
    selectCustomerPortalRescheduleDate: (dateIso: string) => void;
    selectCustomerPortalRescheduleTime: (time: string) => void;
    confirmCustomerPortalReschedule: () => Promise<void>;
    approveCustomerPortalAppointment: (appointmentId: string) => Promise<void>;
    closeCustomerPortalRescheduleModal: () => void;
    nextOnboardingStep: () => void;
    closeOnboarding: () => void;
    selectSecondDate: (dateIso: string) => void;
    selectSecondTime: (time: string) => void;
  }
}
