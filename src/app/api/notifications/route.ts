import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, title, message, taskId, userId, scheduledFor } = body;

    if (!type || !title || !message || !taskId || !userId) {
      return NextResponse.json({ 
        error: 'type, title, message, taskId, and userId are required' 
      }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        channel: 'push',
        payload_json: JSON.stringify({
          task_id: taskId,
          message,
          title
        }),
        scheduled_at: scheduledFor ? new Date(scheduledFor) : new Date(),
        sent_at: new Date()
      }
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Notification creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const type = url.searchParams.get('type');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const where: any = { userId };
    if (type) where.type = type;
    if (unreadOnly) where.sent_at = null;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { scheduled_at: 'desc' },
      take: 50
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Notification fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
