import type { LastBookingPayload } from "./index";

export {};

declare global {
  interface Window {
    _lastBooking?: LastBookingPayload;
    _waMsg?: string;
  }
}
