export type SummaryResponse = {
  tasks_done: number;
  tasks_per_day: number;
  hours_per_day: number;
  mins_per_task: number;
  day_streak: number;
};

export type DailySeriesPoint = {
  date: string; // YYYY-MM-DD
  tasks: number;
  hours: number; // decimal hours
  pomodoros: number;
  breaks: number;
};

export type DailySeriesResponse = {
  series: 'daily';
  points: DailySeriesPoint[];
};

export type TimeByListSlice = { list: string; minutes: number; color: string };

export type TimeByListResponse = { slices: TimeByListSlice[]; total_minutes: number };

export type TasksTableRow = {
  list: string;
  task_name: string;
  status: 'Early' | 'Late' | 'On-time';
  minutes: number;
  due_date: string | null; // ISO
  completed_at: string | null; // ISO
};

export type TasksTableResponse = { columns: Array<keyof TasksTableRow>; rows: TasksTableRow[] };


