import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const groupBy = url.searchParams.get('groupBy') || 'day'; // day, hour, week, month
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    let series: Array<{ date: string; tasks: number; focusMinutes: number; focusHours: number }> = [];

    if (groupBy === 'day') {
      // Daily data
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          completed_at: {
            gte: fromDate,
            lte: toDate
          }
        },
        select: {
          completed_at: true
        }
      });

      const focusSessions = await prisma.focusSession.findMany({
        where: {
          userId,
          status: 'completed',
          started_at: {
            gte: fromDate,
            lte: toDate
          }
        },
        select: {
          focus_minutes: true,
          started_at: true
        }
      });

      // Group by day
      const dailyStats = new Map<string, { tasks: number; focusMinutes: number }>();

      // Initialize all days in range
      const currentDate = new Date(fromDate);
      while (currentDate <= toDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        dailyStats.set(dateKey, { tasks: 0, focusMinutes: 0 });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Add task completions
      tasks.forEach((task: any) => {
        const dateKey = task.completed_at!.toISOString().split('T')[0];
        const existing = dailyStats.get(dateKey) || { tasks: 0, focusMinutes: 0 };
        dailyStats.set(dateKey, { ...existing, tasks: existing.tasks + 1 });
      });

      // Add focus sessions
      focusSessions.forEach((session: any) => {
        const dateKey = session.started_at.toISOString().split('T')[0];
        const existing = dailyStats.get(dateKey) || { tasks: 0, focusMinutes: 0 };
        dailyStats.set(dateKey, { 
          ...existing, 
          focusMinutes: existing.focusMinutes + session.focus_minutes 
        });
      });

      series = Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        tasks: stats.tasks,
        focusMinutes: stats.focusMinutes,
        focusHours: Math.round((stats.focusMinutes / 60) * 100) / 100
      }));

    } else if (groupBy === 'hour') {
      // Hourly data for a specific day
      const dayDate = from ? new Date(from) : new Date();
      const dayStart = new Date(dayDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayDate);
      dayEnd.setHours(23, 59, 59, 999);

      const focusSessions = await prisma.focusSession.findMany({
        where: {
          userId,
          status: 'completed',
          started_at: {
            gte: dayStart,
            lte: dayEnd
          }
        },
        select: {
          focus_minutes: true,
          started_at: true
        }
      });

      // Group by hour
      const hourlyStats = new Map<number, number>();
      for (let hour = 0; hour < 24; hour++) {
        hourlyStats.set(hour, 0);
      }

      focusSessions.forEach((session: any) => {
        const hour = session.started_at.getHours();
        const existing = hourlyStats.get(hour) || 0;
        hourlyStats.set(hour, existing + session.focus_minutes);
      });

      series = Array.from(hourlyStats.entries()).map(([hour, minutes]) => ({
        date: `${hour.toString().padStart(2, '0')}:00`,
        tasks: 0, // Not tracking tasks by hour
        focusMinutes: minutes,
        focusHours: Math.round((minutes / 60) * 100) / 100
      }));

    } else if (groupBy === 'week') {
      // Weekly data
      const focusSessions = await prisma.focusSession.findMany({
        where: {
          userId,
          status: 'completed',
          started_at: {
            gte: fromDate,
            lte: toDate
          }
        },
        select: {
          focus_minutes: true,
          started_at: true
        }
      });

      // Group by week
      const weeklyStats = new Map<string, { tasks: number; focusMinutes: number }>();

      focusSessions.forEach(session => {
        const weekStart = new Date(session.started_at);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split('T')[0];

        const existing = weeklyStats.get(weekKey) || { tasks: 0, focusMinutes: 0 };
        weeklyStats.set(weekKey, { 
          ...existing, 
          focusMinutes: existing.focusMinutes + session.focus_minutes 
        });
      });

      series = Array.from(weeklyStats.entries()).map(([date, stats]) => ({
        date: `Week of ${date}`,
        tasks: stats.tasks,
        focusMinutes: stats.focusMinutes,
        focusHours: Math.round((stats.focusMinutes / 60) * 100) / 100
      }));
    }

    return NextResponse.json({
      series,
      groupBy,
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching analytics series:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics series' }, { status: 500 });
  }
}


