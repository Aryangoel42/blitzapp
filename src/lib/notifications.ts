// Notification Management System
// Handles Web Push, Local Notifications, Schedulers, and Daily Email

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

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationSchedule {
  id: string;
  type: 'task_due' | 'focus_end' | 'streak_milestone' | 'daily_summary' | 'focus_completed';
  userId: string;
  scheduledAt: Date;
  payload: NotificationPayload;
  channel: 'push' | 'email' | 'local';
  taskId?: string;
  sessionId?: string;
}

export interface DailySummaryData {
  tasksCompleted: number;
  focusMinutes: number;
  streakDays: number;
  pointsEarned: number;
  tasksDueToday: number;
  overdueTasks: number;
  topTags: Array<{ tag: string; count: number }>;
  focusSessions: number;
}

// Local Notification Service
export class LocalNotificationService {
  private static instance: LocalNotificationService;
  private notificationQueue: NotificationPayload[] = [];
  private isSupported = typeof window !== 'undefined' && 'Notification' in window;

  static getInstance(): LocalNotificationService {
    if (!LocalNotificationService.instance) {
      LocalNotificationService.instance = new LocalNotificationService();
    }
    return LocalNotificationService.instance;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.isSupported || Notification.permission !== 'granted') {
      this.notificationQueue.push(payload);
      return;
    }

    const notification = new Notification(payload.title, {
      body: payload.message,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      tag: payload.tag,
      data: payload.data,
      ...(payload.actions && { actions: payload.actions }),
      requireInteraction: payload.requireInteraction,
      silent: payload.silent
    });

    // Handle notification clicks
    notification.onclick = (event) => {
      event.preventDefault();
      this.handleNotificationClick(payload);
      notification.close();
    };

    // Auto-close after 5 seconds unless requireInteraction is true
    if (!payload.requireInteraction) {
      setTimeout(() => notification.close(), 5000);
    }
  }

  private handleNotificationClick(payload: NotificationPayload): void {
    // Focus the app window
    if (window.focus) {
      window.focus();
    }

    // Handle different notification types
    if (payload.data?.type === 'task_due' && payload.data?.taskId) {
      // Navigate to task
      window.location.href = `/tasks/${payload.data.taskId}`;
    } else if (payload.data?.type === 'focus_end') {
      // Navigate to focus page
      window.location.href = '/focus';
    } else if (payload.data?.type === 'streak_milestone') {
      // Navigate to forest page
      window.location.href = '/forest';
    }
  }

  getQueuedNotifications(): NotificationPayload[] {
    return [...this.notificationQueue];
  }

  clearQueue(): void {
    this.notificationQueue = [];
  }
}

// Main Notification Manager
export class NotificationManager {
  private static instance: NotificationManager;
  private localService: LocalNotificationService;

  private constructor() {
    this.localService = LocalNotificationService.getInstance();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Initialize notification system
  async initialize(): Promise<void> {
    if (typeof window !== 'undefined') {
      await this.localService.requestPermission();
    }
  }

  // Request notification permissions
  async requestPermissions(): Promise<NotificationPermission> {
    return await this.localService.requestPermission();
  }

  // Send immediate notification
  async sendNotification(payload: NotificationPayload): Promise<void> {
    await this.localService.showNotification(payload);
  }

  // Send task due reminder
  async sendTaskDueReminder(taskId: string, userId: string, taskTitle: string, dueDate: Date): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Task Due Soon',
      message: `"${taskTitle}" is due ${this.formatDueDate(dueDate)}`,
      icon: '/icons/task-due.png',
      tag: `task-due-${taskId}`,
      data: { type: 'task_due', taskId },
      requireInteraction: true
    };

    await this.sendNotification(payload);
  }

  // Send focus session end notification
  async sendFocusEndNotification(sessionId: string, userId: string, taskTitle: string, focusMinutes: number): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Focus Session Complete!',
      message: `Great job! You focused for ${focusMinutes} minutes on "${taskTitle}"`,
      icon: '/icons/focus-complete.png',
      tag: `focus-end-${sessionId}`,
      data: { type: 'focus_end', sessionId, taskTitle, focusMinutes }
    };

    await this.sendNotification(payload);
  }

  // Send streak milestone notification
  async sendStreakMilestoneNotification(userId: string, streakDays: number): Promise<void> {
    const payload: NotificationPayload = {
      title: '🔥 Streak Milestone!',
      message: `Congratulations! You've maintained a ${streakDays}-day focus streak!`,
      icon: '/icons/streak-milestone.png',
      tag: `streak-${streakDays}`,
      data: { type: 'streak_milestone', streakDays },
      requireInteraction: true
    };

    await this.sendNotification(payload);
  }

  // Helper methods
  private formatDueDate(dueDate: Date): string {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return 'now';
    }
  }
}

// Export singleton instances
export const notificationManager = NotificationManager.getInstance();
export const localNotificationService = LocalNotificationService.getInstance();
