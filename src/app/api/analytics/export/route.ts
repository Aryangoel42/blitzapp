import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, exportType, filters } = body;

    if (!userId || !exportType) {
      return NextResponse.json({ error: 'userId and exportType required' }, { status: 400 });
    }

    let csvData = '';
    let filename = '';

    switch (exportType) {
      case 'summary':
        csvData = await generateSummaryCSV(userId, filters);
        filename = `analytics_summary_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      case 'tasks':
        csvData = await generateTasksCSV(userId, filters);
        filename = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      case 'focus-sessions':
        csvData = await generateFocusSessionsCSV(userId, filters);
        filename = `focus_sessions_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    // Create CSV response
    const response = new NextResponse(csvData);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    return response;

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

async function generateSummaryCSV(userId: string, filters: any) {
  const fromDate = filters?.dateRange?.from ? new Date(filters.dateRange.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = filters?.dateRange?.to ? new Date(filters.dateRange.to) : new Date();

  // Get summary data
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      created_at: { gte: fromDate, lte: toDate }
    },
    include: {
      focusSessions: true
    }
  });

  const focusSessions = await prisma.focusSession.findMany({
    where: {
      userId,
        status: 'completed',
      started_at: { gte: fromDate, lte: toDate }
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak_days: true }
  });

  // Calculate KPIs
  const tasksDone = tasks.filter((t: any) => t.status === 'done').length;
  const totalTasks = tasks.length;
  const totalFocusMinutes = focusSessions.reduce((sum: number, s: any) => sum + s.focus_minutes, 0);
  const totalFocusHours = Math.round((totalFocusMinutes / 60) * 100) / 100;
  const daysInRange = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  const tasksPerDay = daysInRange > 0 ? Math.round((totalTasks / daysInRange) * 100) / 100 : 0;
  const hoursPerDay = daysInRange > 0 ? Math.round((totalFocusHours / daysInRange) * 100) / 100 : 0;
  const avgMinutesPerTask = totalTasks > 0 ? Math.round((totalFocusMinutes / totalTasks) * 100) / 100 : 0;
  const completionRate = totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0;

  // Generate CSV
  const csv = [
    'Metric,Value',
    `Tasks Done,${tasksDone}`,
    `Total Tasks,${totalTasks}`,
    `Tasks Per Day,${tasksPerDay}`,
    `Total Focus Hours,${totalFocusHours}`,
    `Hours Per Day,${hoursPerDay}`,
    `Average Minutes Per Task,${avgMinutesPerTask}`,
    `Completion Rate,${completionRate}%`,
    `Day Streak,${user?.streak_days || 0}`,
    `Date Range,${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`,
    `Days in Range,${daysInRange}`,
    `Total Focus Sessions,${focusSessions.length}`,
    `Average Session Length,${focusSessions.length > 0 ? Math.round(totalFocusMinutes / focusSessions.length) : 0} minutes`
  ].join('\n');

  return csv;
}

async function generateTasksCSV(userId: string, filters: any) {
  const fromDate = filters?.dateRange?.from ? new Date(filters.dateRange.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = filters?.dateRange?.to ? new Date(filters.dateRange.to) : new Date();

  // Build where clause based on filters
  const whereClause: any = {
    userId,
    created_at: { gte: fromDate, lte: toDate }
  };

  if (filters?.status?.length > 0) {
    whereClause.status = { in: filters.status };
  }

  if (filters?.priority?.length > 0) {
    whereClause.priority = { in: filters.priority };
  }

  if (filters?.search) {
    whereClause.title = { contains: filters.search, mode: 'insensitive' };
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      focusSessions: true
    },
    orderBy: { created_at: 'desc' }
  });

  // Filter by tags if specified
  let filteredTasks = tasks;
  if (filters?.tags?.length > 0) {
    filteredTasks = tasks.filter((task: any) => {
      try {
        const tags = JSON.parse(task.tags_json || '[]');
        return filters.tags.some((tag: string) => tags.includes(tag));
      } catch {
        return false;
      }
    });
  }

  // Generate CSV
  const csv = [
    'ID,Title,Status,Priority,Due Date,Completed Date,Created Date,Estimate (min),Total Focus Minutes,Total Focus Hours,Focus Sessions Count,Completion Status,Efficiency %,Tags',
    ...filteredTasks.map((task: any) => {
      const totalFocusMinutes = task.focusSessions.reduce((sum: number, s: any) => sum + s.focus_minutes, 0);
      const totalFocusHours = Math.round((totalFocusMinutes / 60) * 100) / 100;
      
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

      const efficiency = task.estimate_min && task.estimate_min > 0 
        ? Math.round((totalFocusMinutes / task.estimate_min) * 100)
        : null;

      let tags: string[] = [];
      try {
        tags = JSON.parse(task.tags_json || '[]');
      } catch {
        tags = [];
      }

      return [
        task.id,
        `"${task.title.replace(/"/g, '""')}"`,
        task.status,
        task.priority,
        task.due_at ? new Date(task.due_at).toISOString().split('T')[0] : '',
        task.completed_at ? new Date(task.completed_at).toISOString().split('T')[0] : '',
        new Date(task.created_at).toISOString().split('T')[0],
        task.estimate_min || '',
        totalFocusMinutes,
        totalFocusHours,
        task.focusSessions.length,
        completionStatus,
        efficiency || '',
        `"${tags.join(', ')}"`
      ].join(',');
    })
  ].join('\n');

  return csv;
}

async function generateFocusSessionsCSV(userId: string, filters: any) {
  const fromDate = filters?.dateRange?.from ? new Date(filters.dateRange.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = filters?.dateRange?.to ? new Date(filters.dateRange.to) : new Date();

  const focusSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: 'completed',
      started_at: { gte: fromDate, lte: toDate }
    },
    include: {
      task: true
    },
    orderBy: { started_at: 'desc' }
  });

  // Generate CSV
  const csv = [
    'ID,Task Title,Started At,Ended At,Duration (minutes),Duration (hours),Status,Phase,Completed Pomodoros,Awarded Points,Streak Multiplier,Session Hash',
    ...focusSessions.map(session => [
      session.id,
      `"${session.task?.title?.replace(/"/g, '""') || 'No Task'}"`,
      new Date(session.started_at).toISOString(),
      session.ended_at ? new Date(session.ended_at).toISOString() : '',
      session.focus_minutes,
      Math.round((session.focus_minutes / 60) * 100) / 100,
      session.status,
      session.phase || '',
      session.completed_pomodoros || 0,
      session.awarded_points || 0,
      session.streak_multiplier || 1.0,
      session.session_hash || ''
    ].join(','))
  ].join('\n');

  return csv;
}


