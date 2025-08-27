import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timeframe = 'next_hour' } = body;

    const now = new Date();
    let startTime: Date;
    let endTime: Date;

    // Calculate time range based on timeframe
    switch (timeframe) {
      case 'next_hour':
        startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
        break;
      case 'next_4_hours':
        startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        endTime = new Date(now.getTime() + 5 * 60 * 60 * 1000); // 5 hours from now
        break;
      case 'next_8_hours':
        startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        endTime = new Date(now.getTime() + 9 * 60 * 60 * 1000); // 9 hours from now
        break;
      default:
        startTime = new Date(now.getTime() + 60 * 60 * 1000);
        endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    }

    // Get tasks due in the specified timeframe
    const dueTasks = await prisma.task.findMany({
      where: {
        due_date: {
          gte: startTime,
          lte: endTime
        },
        status: {
          not: 'completed'
        }
      },
      include: {
        user: true
      }
    });

    // Get users with reminder preferences
    const usersWithReminders = await prisma.user.findMany({
      where: {
        preferences: {
          path: ['notifications'],
          equals: true
        }
      }
    });

    // Schedule reminders for due tasks
    const scheduledReminders = [];
    for (const task of dueTasks) {
      if (task.user && usersWithReminders.some(u => u.id === task.user.id)) {
        const reminderTime = new Date(task.due_date.getTime() - 30 * 60 * 1000); // 30 minutes before due
        
        if (reminderTime > now) {
          const reminder = {
            id: `reminder-${task.id}-${Date.now()}`,
            userId: task.user.id,
            taskId: task.id,
            type: 'task_due' as const,
            title: 'Task Due Soon',
            message: `Your task "${task.title}" is due in 30 minutes`,
            scheduledFor: reminderTime,
            frequency: 'once' as const,
            isActive: true,
            nextSend: reminderTime,
            metadata: {
              taskTitle: task.title,
              priority: task.priority,
              category: 'reminder'
            }
          };

          scheduledReminders.push(reminder);
        }
      }
    }

    // Schedule daily summary reminders for users
    const dailySummaryReminders = [];
    for (const user of usersWithReminders) {
      const userPreferences = user.preferences as any;
      if (userPreferences.emailDigest) {
        const summaryTime = new Date(now);
        summaryTime.setHours(20, 0, 0, 0); // 8 PM
        
        if (summaryTime > now) {
          const reminder = {
            id: `daily-summary-${user.id}-${Date.now()}`,
            userId: user.id,
            type: 'daily_summary' as const,
            title: 'Daily Summary',
            message: 'Here\'s your daily productivity summary',
            scheduledFor: summaryTime,
            frequency: 'daily' as const,
            isActive: true,
            nextSend: summaryTime,
            metadata: {
              category: 'daily_summary',
              time: '20:00'
            }
          };

          dailySummaryReminders.push(reminder);
        }
      }
    }

    // Schedule focus break reminders
    const focusBreakReminders = [];
    for (const user of usersWithReminders) {
      const userPreferences = user.preferences as any;
      if (userPreferences.focusBreaks) {
        // Schedule breaks every 2 hours during work hours (9 AM - 6 PM)
        const workStart = new Date(now);
        workStart.setHours(9, 0, 0, 0);
        
        const workEnd = new Date(now);
        workEnd.setHours(18, 0, 0, 0);
        
        if (now >= workStart && now <= workEnd) {
          const nextBreak = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
          
          if (nextBreak <= workEnd) {
            const reminder = {
              id: `focus-break-${user.id}-${Date.now()}`,
              userId: user.id,
              type: 'focus_break' as const,
              title: 'Time for a Break',
              message: 'Take a 5-minute break to refresh your mind',
              scheduledFor: nextBreak,
              frequency: 'once' as const,
              isActive: true,
              nextSend: nextBreak,
              metadata: {
                category: 'focus_break',
                duration: 5,
                type: 'short_break'
              }
            };

            focusBreakReminders.push(reminder);
          }
        }
      }
    }

    const totalScheduled = scheduledReminders.length + dailySummaryReminders.length + focusBreakReminders.length;

    console.log(`Scheduled ${scheduledReminders.length} task reminders`);
    console.log(`Scheduled ${dailySummaryReminders.length} daily summaries`);
    console.log(`Scheduled ${focusBreakReminders.length} focus breaks`);

    return NextResponse.json({
      success: true,
      scheduledCount: totalScheduled,
      breakdown: {
        taskReminders: scheduledReminders.length,
        dailySummaries: dailySummaryReminders.length,
        focusBreaks: focusBreakReminders.length
      },
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to schedule reminders:', error);
    return NextResponse.json({ 
      error: 'Failed to schedule reminders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
