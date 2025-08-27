import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextReminder } from '@/lib/reminders';

// This endpoint simulates a minutely background scheduler when invoked by an external cron (e.g., GitHub Actions, Windows Task Scheduler)
export async function POST() {
  const now = new Date();
  const due = await prisma.task.findMany({ where: { reminder_time: { lte: now } } });
  for (const t of due) {
    // In a real system, enqueue push/local notifications here
    const next = nextReminder(t.reminder_time ? t.reminder_time.toISOString() : null, t.reminder_frequency);
    await prisma.task.update({ where: { id: t.id }, data: { reminder_time: next ? new Date(next) : null } });
  }
  return NextResponse.json({ ok: true, processed: due.length });
}


