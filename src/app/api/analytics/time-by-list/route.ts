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
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    // Get focus sessions with associated tasks
    const focusSessions = await prisma.focusSession.findMany({
      where: {
        userId,
        status: 'completed',
        started_at: {
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        task: {
          select: {
            title: true,
            tags_json: true,
            priority: true
          }
        }
      }
    });

    // Group by tags/lists
    const timeByList = new Map<string, { minutes: number; sessions: number; tasks: Set<string> }>();

    focusSessions.forEach(session => {
      let listName = 'No List';
      
      if (session.task) {
        try {
          const tags = JSON.parse(session.task.tags_json || '[]');
          if (tags.length > 0) {
            // Use the first tag as the list name
            listName = tags[0].replace('#', '');
          }
        } catch {
          // If tags parsing fails, use priority as list
          listName = session.task.priority || 'No List';
        }
      }

      const existing = timeByList.get(listName) || { minutes: 0, sessions: 0, tasks: new Set() };
      timeByList.set(listName, {
        minutes: existing.minutes + session.focus_minutes,
        sessions: existing.sessions + 1,
        tasks: existing.tasks.add(session.task?.title || 'Unknown Task')
      });
    });

    // Convert to array format for chart
    const chartData = Array.from(timeByList.entries()).map(([list, data]) => ({
      list,
      minutes: data.minutes,
      hours: Math.round((data.minutes / 60) * 100) / 100,
      sessions: data.sessions,
      taskCount: data.tasks.size,
      percentage: 0 // Will be calculated below
    }));

    // Calculate percentages
    const totalMinutes = chartData.reduce((sum, item) => sum + item.minutes, 0);
    chartData.forEach(item => {
      item.percentage = totalMinutes > 0 ? Math.round((item.minutes / totalMinutes) * 100) : 0;
    });

    // Sort by minutes descending
    chartData.sort((a, b) => b.minutes - a.minutes);

    return NextResponse.json({
      data: chartData,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      totalSessions: focusSessions.length,
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching time by list:', error);
    return NextResponse.json({ error: 'Failed to fetch time by list data' }, { status: 500 });
  }
}


