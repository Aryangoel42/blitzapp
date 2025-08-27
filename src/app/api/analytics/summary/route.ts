import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const toDate = to ? new Date(to) : new Date();

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streak_days: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Tasks Done (completed tasks in date range)
    const tasksDone = await prisma.task.count({
      where: {
        userId,
        status: 'done',
        completed_at: {
          gte: fromDate,
          lte: toDate
        }
      }
    });

    // Total tasks in date range
    const totalTasks = await prisma.task.count({
      where: {
        userId,
        created_at: {
          gte: fromDate,
          lte: toDate
        }
      }
    });

    // Focus sessions data
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

    // Calculate hours per day
    const totalFocusMinutes = focusSessions.reduce((sum, session) => sum + session.focus_minutes, 0);
    const totalFocusHours = totalFocusMinutes / 60;
    const daysInRange = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const hoursPerDay = daysInRange > 0 ? totalFocusHours / daysInRange : 0;

    // Calculate tasks per day
    const tasksPerDay = daysInRange > 0 ? totalTasks / daysInRange : 0;

    // Calculate average minutes per task
    const avgMinutesPerTask = tasksDone > 0 ? totalFocusMinutes / tasksDone : 0;

    // Get most productive hour
    const hourlyStats = focusSessions.reduce((acc, session) => {
      const hour = new Date(session.started_at).getHours();
      acc[hour] = (acc[hour] || 0) + session.focus_minutes;
      return acc;
    }, {} as Record<number, number>);

    const mostProductiveHour = Object.entries(hourlyStats)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    // Get most productive day of week
    const dailyStats = focusSessions.reduce((acc, session) => {
      const day = new Date(session.started_at).getDay();
      acc[day] = (acc[day] || 0) + session.focus_minutes;
      return acc;
    }, {} as Record<number, number>);

    const mostProductiveDayEntry = Object.entries(dailyStats)
      .sort(([, a], [, b]) => b - a)[0];
    const mostProductiveDay = mostProductiveDayEntry ? parseInt(mostProductiveDayEntry[0]) : null;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return NextResponse.json({
      kpis: {
        tasksDone,
        tasksPerDay: Math.round(tasksPerDay * 100) / 100,
        hoursPerDay: Math.round(hoursPerDay * 100) / 100,
        avgMinutesPerTask: Math.round(avgMinutesPerTask * 100) / 100,
        dayStreak: user.streak_days,
        totalFocusHours: Math.round(totalFocusHours * 100) / 100,
        totalTasks,
        completionRate: totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0
      },
      highlights: {
        mostProductiveHour: mostProductiveHour ? `${mostProductiveHour}:00` : null,
        mostProductiveDay: mostProductiveDay !== null && mostProductiveDay >= 0 && mostProductiveDay < dayNames.length 
          ? dayNames[mostProductiveDay] 
          : null,
        totalSessions: focusSessions.length,
        avgSessionLength: focusSessions.length > 0 
          ? Math.round(focusSessions.reduce((sum, s) => sum + s.focus_minutes, 0) / focusSessions.length)
          : 0
      },
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        days: daysInRange
      }
    });

  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics summary' }, { status: 500 });
  }
}


