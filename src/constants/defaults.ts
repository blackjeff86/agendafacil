import type { BusinessHourDraft, ProfessionalDraft, ServiceDraft } from "../types";

export const DEFAULT_SERVICES: ServiceDraft[] = [
  {
    name: "Corte Feminino",
    description: "Corte personalizado com finalizacao profissional",
    price: 85,
    duration: 60,
    category: "Corte",
    icon: "✂️",
    active: true,
  },
  {
    name: "Escova",
    description: "Escova lisa ou modelada para qualquer ocasiao",
    price: 55,
    duration: 45,
    category: "Tratamento",
    icon: "💨",
    active: true,
  },
  {
    name: "Coloracao",
    description: "Coloracao profissional com consultoria de tom",
    price: 160,
    duration: 120,
    category: "Coloracao",
    icon: "🎨",
    active: true,
  },
  {
    name: "Manicure",
    description: "Cuidado completo para unhas e cuticulas",
    price: 40,
    duration: 40,
    category: "Tratamento",
    icon: "💅",
    active: true,
  },
];

export const DEFAULT_PROFESSIONALS: ProfessionalDraft[] = [
  {
    name: "Ana Souza",
    role: "Cabeleireira",
    emoji: "👩",
    active: true,
    serviceNames: ["Corte Feminino", "Escova", "Coloracao", "Manicure"],
  },
];

export const DEFAULT_HOURS: BusinessHourDraft[] = [
  { day_of_week: 0, day_name: "Domingo", open_time: null, close_time: null, active: false, frozen: false, frozen_date: null, frozen_time: null, frozen_until_time: null },
  { day_of_week: 1, day_name: "Segunda", open_time: "09:00", close_time: "19:00", active: true, frozen: false, frozen_date: null, frozen_time: null, frozen_until_time: null },
  { day_of_week: 2, day_name: "Terca", open_time: "09:00", close_time: "19:00", active: true, frozen: false, frozen_date: null, frozen_time: null, frozen_until_time: null },
  { day_of_week: 3, day_name: "Quarta", open_time: "09:00", close_time: "19:00", active: true, frozen: false, frozen_date: null, frozen_time: null, frozen_until_time: null },
  { day_of_week: 4, day_name: "Quinta", open_time: "09:00", close_time: "19:00", active: true, frozen: false, frozen_date: null, frozen_time: null, frozen_until_time: null },
  { day_of_week: 5, day_name: "Sexta", open_time: "09:00", close_time: "20:00", active: true, frozen: false, frozen_date: null, frozen_time: null, frozen_until_time: null },
  { day_of_week: 6, day_name: "Sabado", open_time: "08:00", close_time: "18:00", active: true, frozen: false, frozen_date: null, frozen_time: null, frozen_until_time: null },
];
