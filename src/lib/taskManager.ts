import { prisma } from './prisma';
import { TaskParser, ParsedTask } from './taskParser';
import { RRuleParser, RecurrenceRule } from './rrule';

export interface TaskFilters {
  status?: string[];
  priority?: string[];
  tags?: string[];
  dueDate?: {
    start?: Date;
    end?: Date;
  };
  search?: string;
  parentTaskId?: string | null;
}

export interface TaskWithSubtasks {
  id: string;
  title: string;
  description?: string;
  priority: string;
  due_at?: Date;
  estimate_min?: number;
  status: string;
  tags_json: string;
  recurrence_rule?: string;
  reminder_time?: Date;
  reminder_frequency?: string;
  parent_task_id?: string;
  order_index: number;
  focus_sessions_count: number;
  total_focus_time_min: number;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  subtasks: TaskWithSubtasks[];
  _count?: {
    subtasks: number;
  };
}

export class TaskManager {
  static async createTask(userId: string, data: {
    title: string;
    description?: string;
    priority?: string;
    due_at?: Date;
    estimate_min?: number;
    tags?: string[];
    recurrence_rule?: string;
    reminder_time?: Date;
    reminder_frequency?: string;
    parent_task_id?: string;
  }): Promise<any> {
    const tagsJson = data.tags ? JSON.stringify(data.tags) : '[]';
    
    return await prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        due_at: data.due_at,
        estimate_min: data.estimate_min || 0,
        tags_json: tagsJson,
        recurrence_rule: data.recurrence_rule,
        reminder_time: data.reminder_time,
        reminder_frequency: data.reminder_frequency,
        parent_task_id: data.parent_task_id,
        order_index: await this.getNextOrderIndex(userId, data.parent_task_id)
      }
    });
  }

  static async createTaskFromNaturalLanguage(userId: string, input: string): Promise<any> {
    const parsed = TaskParser.parse(input);
    
    return await this.createTask(userId, {
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      due_at: parsed.dueDate,
      estimate_min: parsed.estimateMinutes,
      tags: parsed.tags
    });
  }

  static async updateTask(taskId: string, userId: string, data: Partial<{
    title: string;
    description: string;
    priority: string;
    due_at: Date;
    estimate_min: number;
    tags: string[];
    recurrence_rule: string;
    reminder_time: Date;
    reminder_frequency: string;
    parent_task_id: string;
    order_index: number;
  }>): Promise<any> {
    const updateData: any = { ...data };
    
    if (data.tags) {
      updateData.tags_json = JSON.stringify(data.tags);
    }
    
    return await prisma.task.update({
      where: { id: taskId, userId },
      data: updateData
    });
  }

  static async deleteTask(taskId: string, userId: string): Promise<void> {
    // Delete subtasks first
    await prisma.task.deleteMany({
      where: { parent_task_id: taskId, userId }
    });
    
    // Delete the main task
    await prisma.task.delete({
      where: { id: taskId, userId }
    });
  }

  static async completeTask(taskId: string, userId: string): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId },
      include: { subtasks: true }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Complete subtasks first
    if (task.subtasks.length > 0) {
      await prisma.task.updateMany({
        where: { parent_task_id: taskId, userId },
        data: { 
          status: 'completed',
          completed_at: new Date()
        }
      });
    }

    // Complete the main task
    const updatedTask = await prisma.task.update({
      where: { id: taskId, userId },
      data: { 
        status: 'completed',
        completed_at: new Date()
      }
    });

    // Handle recurrence
    if (task.recurrence_rule) {
      await this.createNextRecurrence(task);
    }

    return updatedTask;
  }

  static async getTasks(userId: string, filters: TaskFilters = {}): Promise<TaskWithSubtasks[]> {
    const where: any = { userId };

    // Status filter
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      where.priority = { in: filters.priority };
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags_json = {
        contains: JSON.stringify(filters.tags[0]) // Simple contains for now
      };
    }

    // Due date filter
    if (filters.dueDate) {
      where.due_at = {};
      if (filters.dueDate.start) {
        where.due_at.gte = filters.dueDate.start;
      }
      if (filters.dueDate.end) {
        where.due_at.lte = filters.dueDate.end;
      }
    }

    // Search filter
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Parent task filter
    if (filters.parentTaskId !== undefined) {
      where.parent_task_id = filters.parentTaskId;
    }

    return await prisma.task.findMany({
      where,
      include: {
        subtasks: {
          orderBy: { order_index: 'asc' }
        },
        _count: {
          select: { subtasks: true }
        }
      },
      orderBy: [
        { order_index: 'asc' },
        { created_at: 'desc' }
      ]
    });
  }

  static async getTodayTasks(userId: string): Promise<TaskWithSubtasks[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    return await this.getTasks(userId, {
      dueDate: { start: startOfDay, end: endOfDay }
    });
  }

  static async getUpcomingTasks(userId: string, days: number = 7): Promise<TaskWithSubtasks[]> {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

    return await this.getTasks(userId, {
      dueDate: { start: startDate, end: endDate }
    });
  }

  static async getOverdueTasks(userId: string): Promise<TaskWithSubtasks[]> {
    const now = new Date();

    return await this.getTasks(userId, {
      dueDate: { end: now },
      status: ['todo', 'in_progress']
    });
  }

  static async getCompletedTasks(userId: string, days: number = 30): Promise<TaskWithSubtasks[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.getTasks(userId, {
      status: ['completed'],
      dueDate: { start: startDate }
    });
  }

  static async reorderSubtasks(parentTaskId: string, userId: string, subtaskIds: string[]): Promise<void> {
    for (let i = 0; i < subtaskIds.length; i++) {
      await prisma.task.update({
        where: { id: subtaskIds[i], userId },
        data: { order_index: i }
      });
    }
  }

  static async moveTask(taskId: string, userId: string, newParentId: string | null, newOrderIndex: number): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Update parent and order
    await prisma.task.update({
      where: { id: taskId, userId },
      data: {
        parent_task_id: newParentId,
        order_index: newOrderIndex
      }
    });

    // Reorder siblings if moving within same parent
    if (task.parent_task_id === newParentId) {
      const siblings = await prisma.task.findMany({
        where: { 
          userId,
          parent_task_id: newParentId,
          id: { not: taskId }
        },
        orderBy: { order_index: 'asc' }
      });

      // Adjust order indices
      for (let i = 0; i < siblings.length; i++) {
        const newIndex = i >= newOrderIndex ? i + 1 : i;
        await prisma.task.update({
          where: { id: siblings[i].id },
          data: { order_index: newIndex }
        });
      }
    }
  }

  private static async getNextOrderIndex(userId: string, parentTaskId?: string | null): Promise<number> {
    const lastTask = await prisma.task.findFirst({
      where: { userId, parent_task_id: parentTaskId },
      orderBy: { order_index: 'desc' }
    });

    return (lastTask?.order_index ?? -1) + 1;
  }

  private static async createNextRecurrence(task: any): Promise<void> {
    if (!task.recurrence_rule) return;

    const rule = RRuleParser.parse(task.recurrence_rule);
    if (!rule) return;

    const nextDate = RRuleParser.nextOccurrence(rule, task.due_at || new Date());
    if (!nextDate) return;

    // Create the next occurrence
    await this.createTask(task.userId, {
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_at: nextDate,
      estimate_min: task.estimate_min,
      tags: JSON.parse(task.tags_json),
      recurrence_rule: task.recurrence_rule,
      reminder_time: task.reminder_time,
      reminder_frequency: task.reminder_frequency,
      parent_task_id: task.parent_task_id
    });
  }

  static async getTaskStats(userId: string): Promise<{
    total: number;
    completed: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  }> {
    const [total, completed, overdue, dueToday, dueThisWeek] = await Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, status: 'completed' } }),
      prisma.task.count({ 
        where: { 
          userId, 
          status: { in: ['todo', 'in_progress'] },
          due_at: { lt: new Date() }
        }
      }),
      prisma.task.count({
        where: {
          userId,
          due_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      prisma.task.count({
        where: {
          userId,
          due_at: {
            gte: new Date(),
            lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      total,
      completed,
      overdue,
      dueToday,
      dueThisWeek
    };
  }
}
