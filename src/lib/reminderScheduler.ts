// Reminder scheduling system with background job support

export type ReminderJob = {
    id: string;
    userId: string;
    taskId: string;
    taskTitle: string;
    reminderTime: Date;
    frequency: 'once' | 'hourly' | 'daily' | 'weekly' | 'custom';
    nextReminder: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  
  export type ReminderNotification = {
    type: 'task_due' | 'reminder' | 'overdue';
    title: string;
    message: string;
    taskId: string;
    userId: string;
    scheduledFor: Date;
  };
  
  class ReminderScheduler {
    private jobs: Map<string, ReminderJob> = new Map();
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private isRunning = false;
  
    constructor() {
      this.start();
    }
  
    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      
      // Check for due reminders every minute
      setInterval(() => {
        this.checkDueReminders();
      }, 60000);
      
      console.log('Reminder scheduler started');
    }
  
    stop() {
      this.isRunning = false;
      this.intervals.forEach(interval => clearInterval(interval));
      this.intervals.clear();
      console.log('Reminder scheduler stopped');
    }
  
    async scheduleReminder(job: ReminderJob): Promise<void> {
      try {
        // Store the job
        this.jobs.set(job.id, job);
        
        // Calculate next reminder time
        const nextReminder = this.calculateNextReminder(job.reminderTime, job.frequency);
        job.nextReminder = nextReminder;
        
        // Schedule the reminder
        this.scheduleJob(job);
        
        console.log(`Scheduled reminder for task ${job.taskTitle} at ${nextReminder}`);
      } catch (error) {
        console.error('Failed to schedule reminder:', error);
      }
    }
  
    private calculateNextReminder(baseTime: Date, frequency: string): Date {
      const next = new Date(baseTime);
      
      switch (frequency) {
        case 'once':
          return next;
          
        case 'hourly':
          next.setHours(next.getHours() + 1);
          return next;
          
        case 'daily':
          next.setDate(next.getDate() + 1);
          return next;
          
        case 'weekly':
          next.setDate(next.getDate() + 7);
          return next;
          
        case 'custom':
          // For custom frequency, advance by 24 hours as default
          next.setDate(next.getDate() + 1);
          return next;
          
        default:
          return next;
      }
    }
  
    private scheduleJob(job: ReminderJob): void {
      const now = new Date();
      const delay = Math.max(0, job.nextReminder.getTime() - now.getTime());
      
      // Clear existing interval if any
      if (this.intervals.has(job.id)) {
        clearTimeout(this.intervals.get(job.id)!);
      }
      
      // Schedule new reminder
      const timeout = setTimeout(() => {
        this.triggerReminder(job);
      }, delay);
      
      this.intervals.set(job.id, timeout as any);
    }
  
    private async triggerReminder(job: ReminderJob): Promise<void> {
      try {
        // Create notification
        const notification: ReminderNotification = {
          type: 'reminder',
          title: 'Task Reminder',
          message: `Reminder: ${job.taskTitle}`,
          taskId: job.taskId,
          userId: job.userId,
          scheduledFor: new Date()
        };
        
        // Send notification (web push, in-app, etc.)
        await this.sendNotification(notification);
        
        // Schedule next reminder if recurring
        if (job.frequency !== 'once') {
          job.reminderTime = job.nextReminder;
          const nextReminder = this.calculateNextReminder(job.reminderTime, job.frequency);
          job.nextReminder = nextReminder;
          job.updatedAt = new Date();
          
          // Reschedule
          this.scheduleJob(job);
        } else {
          // Remove one-time reminder
          this.jobs.delete(job.id);
          this.intervals.delete(job.id);
        }
        
        console.log(`Reminder triggered for task ${job.taskTitle}`);
      } catch (error) {
        console.error('Failed to trigger reminder:', error);
      }
    }
  
    private async sendNotification(notification: ReminderNotification): Promise<void> {
      try {
        // Try web push first
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          await this.sendWebPushNotification(notification);
        }
        
        // Fallback to in-app notification
        await this.sendInAppNotification(notification);
        
        // Store notification in database
        await this.storeNotification(notification);
        
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  
    private async sendWebPushNotification(notification: ReminderNotification): Promise<void> {
      // Implementation for web push notifications
      // This would integrate with your push service
      console.log('Web push notification sent:', notification);
    }
  
    private async sendInAppNotification(notification: ReminderNotification): Promise<void> {
      // Implementation for in-app notifications
      // This could use a global state management system
      console.log('In-app notification sent:', notification);
    }
  
    private async storeNotification(notification: ReminderNotification): Promise<void> {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification)
        });
      } catch (error) {
        console.error('Failed to store notification:', error);
      }
    }
  
    async checkDueReminders(): Promise<void> {
      const now = new Date();
      
      for (const [jobId, job] of this.jobs) {
        if (job.nextReminder <= now && job.isActive) {
          await this.triggerReminder(job);
        }
      }
    }
  
    async cancelReminder(jobId: string): Promise<void> {
      const job = this.jobs.get(jobId);
      if (job) {
        job.isActive = false;
        this.jobs.delete(jobId);
        
        if (this.intervals.has(jobId)) {
          clearTimeout(this.intervals.get(jobId)!);
          this.intervals.delete(jobId);
        }
        
        console.log(`Cancelled reminder for task ${job.taskTitle}`);
      }
    }
  
    async updateReminder(jobId: string, updates: Partial<ReminderJob>): Promise<void> {
      const job = this.jobs.get(jobId);
      if (job) {
        Object.assign(job, updates);
        job.updatedAt = new Date();
        
        // Reschedule if time changed
        if (updates.reminderTime || updates.frequency) {
          this.scheduleJob(job);
        }
        
        console.log(`Updated reminder for task ${job.taskTitle}`);
      }
    }
  
    getActiveReminders(userId: string): ReminderJob[] {
      return Array.from(this.jobs.values()).filter(job => 
        job.userId === userId && job.isActive
      );
    }
  }
  
  // Export singleton instance
  export const reminderScheduler = new ReminderScheduler();
  
  // Helper functions for external use
  export async function scheduleTaskReminder(
    userId: string, 
    taskId: string, 
    taskTitle: string, 
    reminderTime: Date, 
    frequency: ReminderJob['frequency'] = 'once'
  ): Promise<string> {
    const jobId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ReminderJob = {
      id: jobId,
      userId,
      taskId,
      taskTitle,
      reminderTime,
      frequency,
      nextReminder: reminderTime,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await reminderScheduler.scheduleReminder(job);
    return jobId;
  }
  
  export async function cancelTaskReminder(jobId: string): Promise<void> {
    await reminderScheduler.cancelReminder(jobId);
  }
  
  export async function updateTaskReminder(
    jobId: string, 
    updates: Partial<ReminderJob>
  ): Promise<void> {
    await reminderScheduler.updateReminder(jobId, updates);
  }


