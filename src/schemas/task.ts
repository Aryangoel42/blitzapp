import { z } from 'zod';

export const taskCreateSchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_at: z.string().datetime().optional(),
  estimate_min: z.number().int().min(0).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo').optional(),
  tags: z.array(z.string()).default([]).optional(),
  recurrence_rule: z.string().optional(),
  reminder_time: z.string().datetime().optional(),
  reminder_frequency: z.enum(['once', 'hourly', 'daily', 'weekly', 'custom']).optional(),
  parent_task_id: z.string().optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;


