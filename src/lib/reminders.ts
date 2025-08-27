// Minimal reminder scheduler placeholder: computes next reminder time from a base reminder and frequency.

export function nextReminder(baseISO?: string | null, frequency?: string | null): string | null {
  if (!baseISO || !frequency) return null;
  const d = new Date(baseISO);
  switch (frequency) {
    case 'once':
      return baseISO;
    case 'hourly':
      d.setHours(d.getHours() + 1); return d.toISOString();
    case 'daily':
      d.setDate(d.getDate() + 1); return d.toISOString();
    case 'weekly':
      d.setDate(d.getDate() + 7); return d.toISOString();
    case 'custom':
    default:
      return baseISO;
  }
}


