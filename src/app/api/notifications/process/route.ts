import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Get all unsent notifications that are due
    const dueNotifications = await prisma.notification.findMany({
      where: {
        sent_at: null,
        scheduled_at: {
          lte: new Date()
        }
      },
      orderBy: { scheduled_at: 'asc' },
      take: 50
    });

    const results = [];

    for (const notification of dueNotifications) {
      try {
        // Send notification based on channel
        let sent = false;
        
        switch (notification.channel) {
          case 'push':
            sent = await sendPushNotification(notification);
            break;
          case 'email':
            sent = await sendEmailNotification(notification);
            break;
          case 'local':
            // Local notifications are handled by the client
            sent = true;
            break;
        }

        // Mark as sent
        if (sent) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { sent_at: new Date() }
          });
        }

        results.push({
          id: notification.id,
          success: sent,
          channel: notification.channel
        });
      } catch (error) {
        console.error(`Failed to process notification ${notification.id}:`, error);
        results.push({
          id: notification.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Process notifications error:', error);
    return NextResponse.json({ 
      error: 'Failed to process notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function sendPushNotification(notification: any): Promise<boolean> {
  try {
    // Get user's push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: notification.userId }
    });

    if (subscriptions.length === 0) {
      return false;
    }

    const payload = JSON.parse(notification.payload_json);
    
    // Send to all subscriptions
    for (const subscription of subscriptions) {
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

    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}

async function sendEmailNotification(notification: any): Promise<boolean> {
  try {
    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: notification.userId }
    });

    if (!user?.email) {
      return false;
    }

    const payload = JSON.parse(notification.payload_json);
    
    // Send email via your email service
    // This is a placeholder - implement with your email service
    console.log('Sending email to:', user.email, 'with payload:', payload);
    
    // Example with a hypothetical email service:
    // await emailService.send({
    //   to: user.email,
    //   subject: payload.title,
    //   html: generateEmailContent(payload)
    // });

    return true;
  } catch (error) {
    console.error('Email notification error:', error);
    return false;
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
