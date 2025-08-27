import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscription } = body;

    if (!userId || !subscription) {
      return NextResponse.json({ error: 'userId and subscription required' }, { status: 400 });
    }

    // Save or update push subscription
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscription.endpoint
        }
      },
      update: {
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
        updated_at: new Date()
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
        user_agent: req.headers.get('user-agent') || '',
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, endpoint } = body;

    if (!userId || !endpoint) {
      return NextResponse.json({ error: 'userId and endpoint required' }, { status: 400 });
    }

    await prisma.pushSubscription.delete({
      where: {
        userId_endpoint: {
          userId,
          endpoint
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
