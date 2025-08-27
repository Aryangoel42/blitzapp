import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, scheduledAt, payload, channel = 'local', taskId, sessionId } = body;

    if (!userId || !type || !scheduledAt || !payload) {
      return NextResponse.json({ 
        error: 'userId, type, scheduledAt, and payload are required' 
      }, { status: 400 });
    }

    // Create scheduled notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        channel,
        payload_json: JSON.stringify(payload),
        scheduled_at: new Date(scheduledAt),
        sent_at: null // Will be set when sent
      }
    });

    return NextResponse.json({ success: true, notification }, { status: 201 });
  } catch (error) {
    console.error('Schedule notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to schedule notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const type = url.searchParams.get('type');
    const unsentOnly = url.searchParams.get('unsentOnly') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const where: any = { userId };
    if (type) where.type = type;
    if (unsentOnly) where.sent_at = null;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { scheduled_at: 'asc' },
      take: 100
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Schedule fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch scheduled notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ 
        error: 'notificationId is required' 
      }, { status: 400 });
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete scheduled notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete scheduled notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
