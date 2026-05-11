export interface ServiceIconOption {
  icon: string;
  label: string;
}

const BEAUTY_SERVICE_ICONS: ServiceIconOption[] = [
  { icon: "✂️", label: "Corte" },
  { icon: "💇‍♀️", label: "Escova" },
  { icon: "💇‍♂️", label: "Corte masculino" },
  { icon: "💨", label: "Escova modelada" },
  { icon: "🎨", label: "Coloração" },
  { icon: "☀️", label: "Luzes" },
  { icon: "🌈", label: "Mechas" },
  { icon: "🪮", label: "Penteado" },
  { icon: "💄", label: "Maquiagem" },
  { icon: "💅", label: "Manicure" },
  { icon: "👣", label: "Pedicure" },
  { icon: "🖐️", label: "Cutilagem" },
  { icon: "🦶", label: "Spa dos pés" },
  { icon: "🪒", label: "Barba" },
  { icon: "💈", label: "Barbearia" },
  { icon: "👁️", label: "Sobrancelha" },
  { icon: "👄", label: "Lábios" },
  { icon: "🧴", label: "Tratamento" },
  { icon: "💧", label: "Hidratação" },
  { icon: "🫧", label: "Limpeza" },
  { icon: "🧼", label: "Higienização" },
  { icon: "🧽", label: "Esfoliação" },
  { icon: "💆‍♀️", label: "Massagem facial" },
  { icon: "💆‍♂️", label: "Massagem corporal" },
  { icon: "🧖‍♀️", label: "Spa facial" },
  { icon: "🪷", label: "Relaxamento" },
  { icon: "🌿", label: "Terapias naturais" },
  { icon: "🍃", label: "Bem-estar" },
  { icon: "✨", label: "Finalização" },
  { icon: "💫", label: "Glow" },
  { icon: "🔥", label: "Progressiva" },
  { icon: "⭐", label: "Pacote destaque" },
  { icon: "🌟", label: "Premium" },
  { icon: "💎", label: "Luxo" },
  { icon: "👑", label: "Noiva" },
  { icon: "🎀", label: "Penteado especial" },
  { icon: "🤍", label: "Clareamento" },
  { icon: "🪞", label: "Autocuidado" },
  { icon: "🕯️", label: "Aromaterapia" },
  { icon: "🛁", label: "Spa corporal" },
  { icon: "🧬", label: "Rejuvenescimento" },
];

export function getServiceIconLibrary(): ServiceIconOption[] {
  return BEAUTY_SERVICE_ICONS;
}
