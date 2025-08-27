import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Return predefined automation jobs
    const jobs = [
      {
        id: 'hourly-reminders',
        type: 'hourly' as const,
        name: 'Schedule Reminders',
        description: 'Schedule reminders for the next hour based on user preferences and task due dates',
        schedule: '0 * * * *', // Every hour at minute 0
        enabled: true,
        lastRun: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        nextRun: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        status: 'idle' as const,
        errorCount: 0,
        maxRetries: 3,
        metadata: { category: 'notifications' }
      },
      {
        id: 'hourly-due-tasks',
        type: 'hourly' as const,
        name: 'Process Due Tasks',
        description: 'Process tasks that are due and send notifications to users',
        schedule: '0 * * * *', // Every hour at minute 0
        enabled: true,
        lastRun: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        nextRun: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        status: 'idle' as const,
        errorCount: 0,
        maxRetries: 3,
        metadata: { category: 'task_management' }
      },
      {
        id: 'hourly-cleanup',
        type: 'hourly' as const,
        name: 'Cleanup Expired Sessions',
        description: 'Clean up expired focus sessions and temporary data',
        schedule: '0 * * * *', // Every hour at minute 0
        enabled: true,
        lastRun: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        nextRun: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        status: 'idle' as const,
        errorCount: 0,
        maxRetries: 3,
        metadata: { category: 'maintenance' }
      },
      {
        id: 'minutely-transitions',
        type: 'minutely' as const,
        name: 'Check Focus Transitions',
        description: 'Check and process focus session state transitions (focus to break, break to focus)',
        schedule: '* * * * *', // Every minute
        enabled: true,
        lastRun: new Date(Date.now() - 60 * 1000), // 1 minute ago
        nextRun: new Date(Date.now() + 60 * 1000), // 1 minute from now
        status: 'idle' as const,
        errorCount: 0,
        maxRetries: 3,
        metadata: { category: 'focus_management' }
      },
      {
        id: 'minutely-sessions',
        type: 'minutely' as const,
        name: 'Update Active Sessions',
        description: 'Update active focus sessions and track progress',
        schedule: '* * * * *', // Every minute
        enabled: true,
        lastRun: new Date(Date.now() - 60 * 1000), // 1 minute ago
        nextRun: new Date(Date.now() + 60 * 1000), // 1 minute from now
        status: 'idle' as const,
        errorCount: 0,
        maxRetries: 3,
        metadata: { category: 'focus_management' }
      },
      {
        id: 'minutely-breaks',
        type: 'minutely' as const,
        name: 'Process Break Timers',
        description: 'Process break timers and transition users back to focus mode',
        schedule: '* * * * *', // Every minute
        enabled: true,
        lastRun: new Date(Date.now() - 60 * 1000), // 1 minute ago
        nextRun: new Date(Date.now() + 60 * 1000), // 1 minute from now
        status: 'idle' as const,
        errorCount: 0,
        maxRetries: 3,
        metadata: { category: 'focus_management' }
      },
      {
        id: 'daily-streaks',
        type: 'daily' as const,
        name: 'Calculate Streaks',
        description: 'Calculate daily streaks for all users based on focus sessions and task completion',
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        status: 'idle' as const,
        errorCount: 0,
        maxRetries: 3,
        metadata: { category: 'gamification' }
      },
      {
        id: 'daily-rollups',
        type: 'daily' as const,
        name: 'Generate Daily Rollups',
        description: 'Generate daily productivity rollups and statistics for all users',
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        status: 'idle' as const,
        errorCount: 0,
        maxRetries: 3,
        metadata: { category: 'analytics' }
      },
      {
        id: 'daily-limits',
        type: 'daily' as const,
        name: 'Reset Daily Limits',
        description: 'Reset daily limits, counters, and refresh user quotas',
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        status: 'idle' as const,
        errorCount: 0,
        maxRetries: 3,
        metadata: { category: 'user_management' }
      },
      {
        id: 'daily-archive',
        type: 'daily' as const,
        name: 'Archive Old Data',
        description: 'Archive old data and perform database maintenance',
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        status: 'idle' as const,
        errorCount: 0,
        maxRetries: 3,
        metadata: { category: 'maintenance' }
      }
    ];

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Failed to fetch automation jobs:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch automation jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, description, schedule, enabled = true } = body;

    if (!name || !type || !description || !schedule) {
      return NextResponse.json({ 
        error: 'Name, type, description, and schedule are required' 
      }, { status: 400 });
    }

    // Create new automation job
    const job = {
      id: `${type}-${Date.now()}`,
      type,
      name,
      description,
      schedule,
      enabled,
      lastRun: undefined,
      nextRun: new Date(),
      status: 'idle' as const,
      errorCount: 0,
      maxRetries: 3,
      metadata: {}
    };

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Failed to create automation job:', error);
    return NextResponse.json({ 
      error: 'Failed to create automation job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
