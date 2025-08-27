import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextReminder } from '@/lib/reminders';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { taskId, snoozeMinutes } = body;

  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // If snoozing, calculate new reminder time
  let newReminderTime: Date | null = null;
  if (snoozeMinutes && task.reminder_time) {
    const current = new Date(task.reminder_time);
    current.setMinutes(current.getMinutes() + snoozeMinutes);
    newReminderTime = current;
  } else if (task.reminder_time && task.reminder_frequency) {
    // Calculate next reminder based on frequency
    const next = nextReminder(task.reminder_time.toISOString(), task.reminder_frequency);
    newReminderTime = next ? new Date(next) : null;
  }

  if (newReminderTime) {
    await prisma.task.update({
      where: { id: taskId },
      data: { reminder_time: newReminderTime }
    });
  }

  // Create notification record
  await prisma.notification.create({
    data: {
      userId: task.userId,
      type: 'task_due',
      channel: 'push',
      payload_json: JSON.stringify({
        task_id: taskId,
        message: `Task due: ${task.title}`
      }),
      scheduled_at: newReminderTime || task.reminder_time || new Date()
    }
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const now = new Date();
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      type: 'task_due',
      scheduled_at: { lte: now },
      sent_at: null
    },
    include: {
      user: {
        select: { notification_task_due: true }
      }
    }
  });

  return NextResponse.json(notifications);
}


