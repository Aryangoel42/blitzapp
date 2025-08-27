import { NextRequest, NextResponse } from 'next/server';
import { TaskManager } from '@/lib/taskManager';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const filters: any = {};
    
    // Parse filters from query params
    const status = searchParams.get('status');
    if (status) filters.status = status.split(',');
    
    const priority = searchParams.get('priority');
    if (priority) filters.priority = priority.split(',');
    
    const tags = searchParams.get('tags');
    if (tags) filters.tags = tags.split(',');
    
    const search = searchParams.get('search');
    if (search) filters.search = search;
    
    const parentTaskId = searchParams.get('parentTaskId');
    if (parentTaskId) filters.parentTaskId = parentTaskId === 'null' ? null : parentTaskId;

    const tasks = await TaskManager.getTasks(userId, filters);
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, title, description, priority, due_at, estimate_min, tags, recurrence_rule, reminder_time, reminder_frequency, parent_task_id } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId and title are required' }, { status: 400 });
    }

    const task = await TaskManager.createTask(userId, {
      title,
      description,
      priority,
      due_at: due_at ? new Date(due_at) : undefined,
      estimate_min,
      tags,
      recurrence_rule,
      reminder_time: reminder_time ? new Date(reminder_time) : undefined,
      reminder_frequency,
      parent_task_id
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ 
      error: 'Failed to create task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
  const body = await req.json();
    const { id, userId, ...updateData } = body;

    if (!id || !userId) {
      return NextResponse.json({ error: 'id and userId are required' }, { status: 400 });
    }

    // Handle special actions
    if (updateData.action === 'complete') {
      const task = await TaskManager.completeTask(id, userId);
    return NextResponse.json(task);
  }

    if (updateData.action === 'reopen') {
      const task = await TaskManager.updateTask(id, userId, { status: 'todo' });
    return NextResponse.json(task);
  }

    // Regular update
    const task = await TaskManager.updateTask(id, userId, updateData);
    return NextResponse.json(task);
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ 
      error: 'Failed to update task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!taskId || !userId) {
      return NextResponse.json({ error: 'id and userId are required' }, { status: 400 });
    }

    await TaskManager.deleteTask(taskId, userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ 
      error: 'Failed to delete task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


