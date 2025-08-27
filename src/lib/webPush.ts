// Web Push Notification Service
// Handles VAPID keys, subscription management, and push notification sending

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export class WebPushService {
  private vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || ''
  };

  async sendPushNotification(
    subscription: PushSubscription,
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `vapid t=${this.generateVAPIDToken(subscription)}`
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

      return response.ok;
    } catch (error) {
      console.error('Push notification error:', error);
      return false;
    }
  }

  private generateVAPIDToken(subscription: PushSubscription): string {
    // This is a simplified VAPID token generation
    // In production, use a proper VAPID library like web-push
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

  async subscribeToPushNotifications(userId: string): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return null;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidKeys.publicKey)
      });

      // Save subscription to server
      await this.saveSubscription(userId, subscription);

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        }
      };
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribeFromPushNotifications(userId: string, endpoint: string): Promise<boolean> {
    try {
      // Remove subscription from server
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, endpoint })
      });

      // Unsubscribe from push manager
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  private async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
          }
        }
      })
    });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const webPushService = new WebPushService();
