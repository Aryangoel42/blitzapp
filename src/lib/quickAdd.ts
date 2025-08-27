// Parse strings like: "Pay bills tomorrow 5pm #finance 30m"
// Returns structured fields for task creation.
export type QuickAddParse = {
  title: string;
  due_at?: string; // ISO
  estimate_min?: number;
  tags?: string[];
};

const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
const durationRegex = /\b(\d+)\s*(m|min|minutes)\b/i;
const tagRegex = /(^|\s)#(\w+)/g;

function parseNaturalDate(text: string): Date | undefined {
  const lower = text.toLowerCase();
  const now = new Date();
  if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(now.getDate() + 1);
    return d;
  }
  if (lower.includes('today')) {
    return new Date(now);
  }
  return undefined;
}

export function parseQuickAdd(input: string): QuickAddParse {
  let text = input.trim();

  // Tags
  const tags: string[] = [];
  text = text.replace(tagRegex, (_m, _sp, tag) => {
    tags.push('#' + tag);
    return ' ';
  });

  // Duration
  let estimate_min: number | undefined;
  const dur = text.match(durationRegex);
  if (dur) {
    estimate_min = parseInt(dur[1], 10);
    text = text.replace(dur[0], '');
  }

  // Due date/time
  let due_at: string | undefined;
  const baseDate = parseNaturalDate(text);
  const time = text.match(timeRegex);
  if (baseDate || time) {
    const d = baseDate ?? new Date();
    if (time) {
      let hour = parseInt(time[1], 10);
      const minute = time[2] ? parseInt(time[2], 10) : 0;
      const suffix = time[3]?.toLowerCase();
      if (suffix === 'pm' && hour < 12) hour += 12;
      if (suffix === 'am' && hour === 12) hour = 0;
      d.setHours(hour, minute, 0, 0);
    } else {
      d.setHours(17, 0, 0, 0); // default 5pm
    }
    due_at = d.toISOString();
  }

  const title = text.replace(timeRegex, '').replace(/\s+/g, ' ').trim();
  return { title, due_at, estimate_min, tags };
}


