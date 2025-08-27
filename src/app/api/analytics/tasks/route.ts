import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const status = url.searchParams.get('status'); // all, done, todo, overdue
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    // Build where clause
    const where: any = {
      userId,
      created_at: {
        gte: fromDate,
        lte: toDate
      }
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    // Get tasks with focus session data
    const tasks = await prisma.task.findMany({
      where,
      include: {
        focusSessions: {
          where: {
            status: 'completed'
          },
          select: {
            focus_minutes: true,
            started_at: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Process tasks to add analytics data
    const processedTasks = tasks.map(task => {
      // Calculate total focus time
      const totalFocusMinutes = task.focusSessions.reduce((sum, session) => sum + session.focus_minutes, 0);
      
      // Determine completion status
      let completionStatus = 'On Time';
      if (task.status === 'done' && task.due_at && task.completed_at) {
        const completedDate = new Date(task.completed_at);
        const dueDate = new Date(task.due_at);
        if (completedDate > dueDate) {
          completionStatus = 'Late';
        } else if (completedDate < dueDate) {
          completionStatus = 'Early';
        }
      } else if (task.status === 'todo' && task.due_at) {
        const now = new Date();
        const dueDate = new Date(task.due_at);
        if (now > dueDate) {
          completionStatus = 'Overdue';
        }
      }

      // Calculate efficiency (focus time vs estimated time)
      const efficiency = task.estimate_min && task.estimate_min > 0 
        ? Math.round((totalFocusMinutes / task.estimate_min) * 100)
        : null;

      // Get tags
      let tags: string[] = [];
      try {
        tags = JSON.parse(task.tags_json || '[]');
      } catch {
        tags = [];
      }

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_at: task.due_at,
        completed_at: task.completed_at,
        created_at: task.created_at,
        estimate_min: task.estimate_min,
        totalFocusMinutes,
        totalFocusHours: Math.round((totalFocusMinutes / 60) * 100) / 100,
        completionStatus,
        efficiency,
        tags,
        focusSessionsCount: task.focusSessions.length
      };
    });

    // Calculate summary stats
    const totalTasks = processedTasks.length;
    const completedTasks = processedTasks.filter(t => t.status === 'done').length;
    const overdueTasks = processedTasks.filter(t => t.completionStatus === 'Overdue').length;
    const earlyTasks = processedTasks.filter(t => t.completionStatus === 'Early').length;
    const lateTasks = processedTasks.filter(t => t.completionStatus === 'Late').length;
    const totalFocusTime = processedTasks.reduce((sum, t) => sum + t.totalFocusMinutes, 0);

    return NextResponse.json({
      tasks: processedTasks,
      summary: {
        totalTasks,
        completedTasks,
        overdueTasks,
        earlyTasks,
        lateTasks,
        totalFocusTime,
        totalFocusHours: Math.round((totalFocusTime / 60) * 100) / 100,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching analytics tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics tasks' }, { status: 500 });
  }
}


