export function emptyStateHtml(message: string): string {
  return `
    <div class="empty-state">
      <div class="empty-state-icon" aria-hidden="true">✨</div>
      <div class="empty-state-copy">${message}</div>
    </div>`;
}
