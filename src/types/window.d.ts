import type { LastBookingPayload } from "./index";

export {};

declare global {
  interface Window {
    _lastBooking?: LastBookingPayload;
    _waMsg?: string;
    startFromServicePreview: (serviceId: string) => void;
    startFromProfessionalPreview: (professionalId: string) => void;
    selectSecondDate: (dateIso: string) => void;
    selectSecondTime: (time: string) => void;
  }
}
