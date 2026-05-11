import * as appointmentService from "../services/appointmentService";
import { state } from "../state/store";
import { generateTimeSlotsForDate } from "../utils/dates";
import { formatTime } from "../utils/formatters";

/** Grade de horários livres no modal do lojista (respeita conflitos; ignora o próprio agendamento ao editar). */
export async function renderMerchantApptTimeGrid(): Promise<void> {
  const container = document.getElementById("merchantApptTimeGrid");
  if (!container || !state.business) return;

  const serviceId = (document.getElementById("newApptService") as HTMLSelectElement)?.value;
  const profVal = (document.getElementById("newApptProfessional") as HTMLSelectElement)?.value;
  const dateVal = (document.getElementById("newApptDate") as HTMLInputElement)?.value;
  const professionalId = profVal === "" ? null : profVal;

  if (!serviceId || !dateVal) {
    container.innerHTML = `<div class="text-sm text-sub">Selecione serviço e data para ver horários livres.</div>`;
    return;
  }

  const slots = generateTimeSlotsForDate(dateVal, state.hours);
  if (!slots.length) {
    container.innerHTML = `<div class="text-sm text-sub">Este dia está fora do expediente cadastrado.</div>`;
    return;
  }

  const excludeId = state.editingAppointmentId || undefined;

  container.innerHTML = `<div class="text-sm text-sub">Carregando horários…</div>`;

  const availability = await Promise.all(
    slots.map(async (slot) => ({
      slot,
      available: await appointmentService.isSlotAvailable({
        businessId: state.business!.id,
        serviceId,
        professionalId,
        date: dateVal,
        time: slot,
        excludeAppointmentId: excludeId,
      }),
    }))
  );

  const timeEl = document.getElementById("newApptTime") as HTMLInputElement | null;
  const selectedNorm = timeEl?.value ? formatTime(timeEl.value) : "";

  container.innerHTML = availability
    .map(({ slot, available }) => {
      const isSel = Boolean(available && selectedNorm === slot);
      const cls = isSel ? "time-btn selected" : "time-btn";
      return `<button type="button" class="${cls}" ${available ? "" : "disabled"} onclick="merchantSelectApptSlot('${slot}')">${slot}</button>`;
    })
    .join("");
}

export function merchantSelectApptSlot(slot: string): void {
  const timeEl = document.getElementById("newApptTime") as HTMLInputElement | null;
  if (timeEl) timeEl.value = slot;
  void renderMerchantApptTimeGrid();
}
