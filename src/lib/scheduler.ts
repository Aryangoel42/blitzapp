// Notification Scheduler
export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private scheduledNotifications: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  scheduleNotification(schedule: any): void {
    const now = new Date();
    const delay = schedule.scheduledAt.getTime() - now.getTime();

    if (delay <= 0) {
      this.sendNotification(schedule);
      return;
    }

    const timeoutId = setTimeout(() => {
      this.sendNotification(schedule);
      this.scheduledNotifications.delete(schedule.id);
    }, delay);

    this.scheduledNotifications.set(schedule.id, timeoutId);
  }

  cancelNotification(scheduleId: string): boolean {
    const timeoutId = this.scheduledNotifications.get(scheduleId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledNotifications.delete(scheduleId);
      return true;
    }
    return false;
  }

  private async sendNotification(schedule: any): Promise<void> {
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });
    } catch (error) {
      console.error('Failed to send scheduled notification:', error);
    }
  }
}

export const notificationScheduler = NotificationScheduler.getInstance();
