// Automation System
// Handles scheduled jobs, focus session transitions, and daily rollups

export interface AutomationJob {
  id: string;
  type: 'hourly' | 'minutely' | 'daily';
  name: string;
  description: string;
  schedule: string; // Cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
  status: 'idle' | 'running' | 'failed' | 'completed';
  errorCount: number;
  maxRetries: number;
  metadata?: any;
}

export interface JobExecution {
  id: string;
  jobId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  result?: any;
  duration: number; // milliseconds
}

export interface ReminderSchedule {
  id: string;
  userId: string;
  taskId?: string;
  type: 'task_due' | 'focus_break' | 'daily_summary' | 'streak_milestone';
  title: string;
  message: string;
  scheduledFor: Date;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  lastSent?: Date;
  nextSend: Date;
  metadata?: any;
}

export interface FocusTransition {
  id: string;
  sessionId: string;
  userId: string;
  fromState: 'idle' | 'focusing' | 'break' | 'long_break';
  toState: 'idle' | 'focusing' | 'break' | 'long_break';
  transitionAt: Date;
  duration: number; // minutes
  autoTransition: boolean;
  metadata?: any;
}

export interface DailyRollup {
  id: string;
  userId: string;
  date: Date;
  totalFocusTime: number; // minutes
  focusSessions: number;
  completedTasks: number;
  streakDays: number;
  pointsEarned: number;
  treesPlanted: number;
  productivityScore: number; // 0-100
  metadata?: any;
}

export class AutomationManager {
  private static instance: AutomationManager;
  private jobs: Map<string, AutomationJob> = new Map();
  private isRunning: boolean = false;
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): AutomationManager {
    if (!AutomationManager.instance) {
      AutomationManager.instance = new AutomationManager();
    }
    return AutomationManager.instance;
  }

  // Initialize automation system
  async initialize(): Promise<void> {
    await this.loadJobs();
    await this.scheduleJobs();
    this.startScheduler();
  }

  // Load automation jobs from database
  private async loadJobs(): Promise<void> {
    try {
      const response = await fetch('/api/automations/jobs');
      if (response.ok) {
        const jobs = await response.json();
        jobs.forEach((job: AutomationJob) => {
          this.jobs.set(job.id, job);
        });
      }
    } catch (error) {
      console.error('Failed to load automation jobs:', error);
    }
  }

  // Schedule all jobs
  private async scheduleJobs(): Promise<void> {
    for (const [jobId, job] of this.jobs) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }
  }

  // Schedule a single job
  private scheduleJob(job: AutomationJob): void {
    // Clear existing interval if any
    if (this.intervals.has(job.id)) {
      clearInterval(this.intervals.get(job.id)!);
    }

    // Calculate next run time based on schedule
    const nextRun = this.calculateNextRun(job.schedule);
    job.nextRun = nextRun;

    // Schedule the job
    const interval = setInterval(async () => {
      await this.executeJob(job);
    }, this.getIntervalMs(job.schedule));

    this.intervals.set(job.id, interval);
  }

  // Calculate next run time based on cron expression
  private calculateNextRun(schedule: string): Date {
    // Simple cron parsing for demo - in production use a proper cron library
    const now = new Date();
    
    if (schedule === '0 * * * *') { // Hourly
      return new Date(now.getTime() + 60 * 60 * 1000);
    } else if (schedule === '* * * * *') { // Minutely
      return new Date(now.getTime() + 60 * 1000);
    } else if (schedule === '0 0 * * *') { // Daily
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
    
    return now;
  }

  // Get interval in milliseconds
  private getIntervalMs(schedule: string): number {
    if (schedule === '0 * * * *') { // Hourly
      return 60 * 60 * 1000;
    } else if (schedule === '* * * * *') { // Minutely
      return 60 * 1000;
    } else if (schedule === '0 0 * * *') { // Daily
      return 24 * 60 * 60 * 1000;
    }
    return 60 * 1000; // Default to minutely
  }

  // Start the scheduler
  private startScheduler(): void {
    this.isRunning = true;
    console.log('Automation scheduler started');
  }

  // Stop the scheduler
  stopScheduler(): void {
    this.isRunning = false;
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    console.log('Automation scheduler stopped');
  }

  // Execute a job
  private async executeJob(job: AutomationJob): Promise<void> {
    if (!this.isRunning || job.status === 'running') {
      return;
    }

    job.status = 'running';
    job.lastRun = new Date();
    const startTime = Date.now();

    try {
      switch (job.type) {
        case 'hourly':
          await this.executeHourlyJob(job);
          break;
        case 'minutely':
          await this.executeMinutelyJob(job);
          break;
        case 'daily':
          await this.executeDailyJob(job);
          break;
      }

      job.status = 'completed';
      job.errorCount = 0;
      job.nextRun = this.calculateNextRun(job.schedule);
    } catch (error) {
      console.error(`Job ${job.name} failed:`, error);
      job.status = 'failed';
      job.errorCount++;
      
      if (job.errorCount >= job.maxRetries) {
        job.enabled = false;
        console.error(`Job ${job.name} disabled after ${job.maxRetries} failures`);
      }
    }

    // Log execution
    await this.logJobExecution(job, startTime);
  }

  // Execute hourly jobs (reminder scheduling)
  private async executeHourlyJob(job: AutomationJob): Promise<void> {
    switch (job.name) {
      case 'schedule_reminders':
        await this.scheduleReminders();
        break;
      case 'process_due_tasks':
        await this.processDueTasks();
        break;
      case 'cleanup_expired_sessions':
        await this.cleanupExpiredSessions();
        break;
      default:
        console.log(`Unknown hourly job: ${job.name}`);
    }
  }

  // Execute minutely jobs (focus session transitions)
  private async executeMinutelyJob(job: AutomationJob): Promise<void> {
    switch (job.name) {
      case 'check_focus_transitions':
        await this.checkFocusTransitions();
        break;
      case 'update_active_sessions':
        await this.updateActiveSessions();
        break;
      case 'process_break_timers':
        await this.processBreakTimers();
        break;
      default:
        console.log(`Unknown minutely job: ${job.name}`);
    }
  }

  // Execute daily jobs (streak calculations and rollups)
  private async executeDailyJob(job: AutomationJob): Promise<void> {
    switch (job.name) {
      case 'calculate_streaks':
        await this.calculateStreaks();
        break;
      case 'generate_daily_rollups':
        await this.generateDailyRollups();
        break;
      case 'reset_daily_limits':
        await this.resetDailyLimits();
        break;
      case 'archive_old_data':
        await this.archiveOldData();
        break;
      default:
        console.log(`Unknown daily job: ${job.name}`);
    }
  }

  // Schedule reminders for the next hour
  private async scheduleReminders(): Promise<void> {
    try {
      const response = await fetch('/api/automations/schedule-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe: 'next_hour' })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule reminders');
      }

      const result = await response.json();
      console.log(`Scheduled ${result.scheduledCount} reminders`);
    } catch (error) {
      console.error('Failed to schedule reminders:', error);
      throw error;
    }
  }

  // Process due tasks and send notifications
  private async processDueTasks(): Promise<void> {
    try {
      const response = await fetch('/api/automations/process-due-tasks', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to process due tasks');
      }

      const result = await response.json();
      console.log(`Processed ${result.processedCount} due tasks`);
    } catch (error) {
      console.error('Failed to process due tasks:', error);
      throw error;
    }
  }

  // Clean up expired focus sessions
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const response = await fetch('/api/automations/cleanup-expired-sessions', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup expired sessions');
      }

      const result = await response.json();
      console.log(`Cleaned up ${result.cleanedCount} expired sessions`);
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      throw error;
    }
  }

  // Check and process focus session transitions
  private async checkFocusTransitions(): Promise<void> {
    try {
      const response = await fetch('/api/automations/check-focus-transitions', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to check focus transitions');
      }

      const result = await response.json();
      if (result.transitions.length > 0) {
        console.log(`Processed ${result.transitions.length} focus transitions`);
      }
    } catch (error) {
      console.error('Failed to check focus transitions:', error);
      throw error;
    }
  }

  // Update active focus sessions
  private async updateActiveSessions(): Promise<void> {
    try {
      const response = await fetch('/api/automations/update-active-sessions', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to update active sessions');
      }

      const result = await response.json();
      if (result.updatedCount > 0) {
        console.log(`Updated ${result.updatedCount} active sessions`);
      }
    } catch (error) {
      console.error('Failed to update active sessions:', error);
      throw error;
    }
  }

  // Process break timers
  private async processBreakTimers(): Promise<void> {
    try {
      const response = await fetch('/api/automations/process-break-timers', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to process break timers');
      }

      const result = await response.json();
      if (result.completedBreaks > 0) {
        console.log(`Completed ${result.completedBreaks} break timers`);
      }
    } catch (error) {
      console.error('Failed to process break timers:', error);
      throw error;
    }
  }

  // Calculate daily streaks for all users
  private async calculateStreaks(): Promise<void> {
    try {
      const response = await fetch('/api/automations/calculate-streaks', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to calculate streaks');
      }

      const result = await response.json();
      console.log(`Calculated streaks for ${result.userCount} users`);
    } catch (error) {
      console.error('Failed to calculate streaks:', error);
      throw error;
    }
  }

  // Generate daily rollups for all users
  private async generateDailyRollups(): Promise<void> {
    try {
      const response = await fetch('/api/automations/generate-rollups', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to generate daily rollups');
      }

      const result = await response.json();
      console.log(`Generated rollups for ${result.userCount} users`);
    } catch (error) {
      console.error('Failed to generate daily rollups:', error);
      throw error;
    }
  }

  // Reset daily limits and counters
  private async resetDailyLimits(): Promise<void> {
    try {
      const response = await fetch('/api/automations/reset-daily-limits', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to reset daily limits');
      }

      const result = await response.json();
      console.log(`Reset daily limits for ${result.userCount} users`);
    } catch (error) {
      console.error('Failed to reset daily limits:', error);
      throw error;
    }
  }

  // Archive old data
  private async archiveOldData(): Promise<void> {
    try {
      const response = await fetch('/api/automations/archive-old-data', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to archive old data');
      }

      const result = await response.json();
      console.log(`Archived ${result.archivedCount} records`);
    } catch (error) {
      console.error('Failed to archive old data:', error);
      throw error;
    }
  }

  // Log job execution
  private async logJobExecution(job: AutomationJob, startTime: number): Promise<void> {
    try {
      const execution: Omit<JobExecution, 'id'> = {
        jobId: job.id,
        startedAt: job.lastRun!,
        completedAt: new Date(),
        status: job.status,
        duration: Date.now() - startTime,
        error: job.status === 'failed' ? 'Job execution failed' : undefined,
        result: job.status === 'completed' ? { nextRun: job.nextRun } : undefined
      };

      await fetch('/api/automations/log-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(execution)
      });
    } catch (error) {
      console.error('Failed to log job execution:', error);
    }
  }

  // Get job status
  getJobStatus(jobId: string): AutomationJob | undefined {
    return this.jobs.get(jobId);
  }

  // Get all jobs
  getAllJobs(): AutomationJob[] {
    return Array.from(this.jobs.values());
  }

  // Enable/disable a job
  async toggleJob(jobId: string, enabled: boolean): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.enabled = enabled;
    if (enabled) {
      this.scheduleJob(job);
    } else if (this.intervals.has(jobId)) {
      clearInterval(this.intervals.get(jobId)!);
      this.intervals.delete(jobId);
    }

    // Update in database
    await fetch(`/api/automations/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
  }

  // Manually trigger a job
  async triggerJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    await this.executeJob(job);
  }

  // Get scheduler status
  getSchedulerStatus(): { isRunning: boolean; activeJobs: number; totalJobs: number } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.intervals.size,
      totalJobs: this.jobs.size
    };
  }
}

// Export singleton instance
export const automationManager = AutomationManager.getInstance();
