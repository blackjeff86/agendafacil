export function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "Algo deu errado. Tente novamente.";
}

export function getFriendlyAppointmentError(error: unknown): string {
  const message = getErrorMessage(error);
  if (
    message.includes("Horario indisponivel") ||
    message.includes("Nao existe profissional disponivel") ||
    message.includes("Horario fora do expediente") ||
    message.includes("fechado nesta data")
  ) {
    return message;
  }
  return getErrorMessage(error);
}
