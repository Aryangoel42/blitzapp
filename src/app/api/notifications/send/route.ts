import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, payload, channel = 'local', subscription } = body;

    if (!userId || !payload) {
      return NextResponse.json({ 
        error: 'userId and payload are required' 
      }, { status: 400 });
    }

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: payload.data?.type || 'general',
        channel,
        payload_json: JSON.stringify(payload),
        scheduled_at: new Date(),
        sent_at: new Date()
      }
    });

    // Send based on channel
    switch (channel) {
      case 'push':
        if (subscription) {
          await sendPushNotification(subscription, payload);
        } else {
          // Get user's push subscriptions
          const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId }
          });
          
          for (const sub of subscriptions) {
            await sendPushNotification(sub, payload);
          }
        }
        break;
      
      case 'email':
        await sendEmailNotification(userId, payload);
        break;
      
      case 'local':
      default:
        // Local notifications are handled by the client
        break;
    }

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Notification send error:', error);
    return NextResponse.json({ 
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function sendPushNotification(subscription: any, payload: any): Promise<void> {
  try {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `vapid t=${generateVAPIDToken(subscription)}`
      },
      body: JSON.stringify({
        title: payload.title,
        body: payload.message,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        tag: payload.tag,
        data: payload.data,
        actions: payload.actions,
        requireInteraction: payload.requireInteraction,
        silent: payload.silent
      })
    });

    if (!response.ok) {
      console.error('Push notification failed:', response.status);
    }
  } catch (error) {
    console.error('Push notification error:', error);
  }
}

async function sendEmailNotification(userId: string, payload: any): Promise<void> {
  try {
    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.email) {
      console.error('No email found for user:', userId);
      return;
    }

    // Send email via your email service
    // This is a placeholder - implement with your email service
    console.log('Sending email to:', user.email, 'with payload:', payload);
    
    // Example with a hypothetical email service:
    // await emailService.send({
    //   to: user.email,
    //   subject: payload.title,
    //   html: generateEmailContent(payload)
    // });
  } catch (error) {
    console.error('Email notification error:', error);
  }
}

function generateVAPIDToken(subscription: any): string {
  // Simplified VAPID token generation
  // In production, use a proper VAPID library
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: new URL(subscription.endpoint).origin,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: 'mailto:notifications@blitzitapp.com'
  };

  // Simplified JWT generation (use proper library in production)
  return btoa(JSON.stringify(header)) + '.' + btoa(JSON.stringify(payload)) + '.signature';
}
