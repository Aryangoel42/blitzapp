// Daily Summary Service
export interface DailySummaryData {
  tasksCompleted: number;
  focusMinutes: number;
  streakDays: number;
  pointsEarned: number;
  tasksDueToday: number;
  overdueTasks: number;
  topTags: Array<{ tag: string; count: number }>;
  focusSessions: number;
}

export class DailySummaryService {
  async generateDailySummary(userId: string, date: Date = new Date()): Promise<DailySummaryData> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // Fetch user data
      const userResponse = await fetch(`/api/users/${userId}`);
      const user = await userResponse.json();
      
      // Fetch tasks completed today
      const tasksResponse = await fetch(`/api/tasks?userId=${userId}&from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}`);
      const tasks = await tasksResponse.json();
      
      // Fetch focus sessions today
      const sessionsResponse = await fetch(`/api/focus/sessions?userId=${userId}&from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}`);
      const sessions = await sessionsResponse.json();

      // Calculate statistics
      const tasksCompleted = tasks.filter((t: any) => t.status === 'done').length;
      const focusMinutes = sessions.reduce((sum: number, s: any) => sum + s.focus_minutes, 0);
      const pointsEarned = sessions.reduce((sum: number, s: any) => sum + s.awarded_points, 0);
      
      // Get tasks due today
      const tasksDueToday = tasks.filter((t: any) => 
        t.due_at && new Date(t.due_at).toDateString() === date.toDateString()
      ).length;

      // Get overdue tasks
      const overdueTasks = tasks.filter((t: any) => 
        t.due_at && new Date(t.due_at) < startOfDay && t.status !== 'done'
      ).length;

      // Calculate top tags
      const tagCounts = new Map<string, number>();
      tasks.forEach((task: any) => {
        const tags = JSON.parse(task.tags_json || '[]');
        tags.forEach((tag: string) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });

      const topTags = Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        tasksCompleted,
        focusMinutes,
        streakDays: user.streak_days || 0,
        pointsEarned,
        tasksDueToday,
        overdueTasks,
        topTags,
        focusSessions: sessions.length
      };
    } catch (error) {
      console.error('Error generating daily summary:', error);
      return {
        tasksCompleted: 0,
        focusMinutes: 0,
        streakDays: 0,
        pointsEarned: 0,
        tasksDueToday: 0,
        overdueTasks: 0,
        topTags: [],
        focusSessions: 0
      };
    }
  }

  async sendDailySummaryEmail(userId: string, email: string, summary: DailySummaryData): Promise<boolean> {
    try {
      const emailContent = this.generateEmailContent(summary);
      
      const response = await fetch('/api/notifications/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email,
          summary,
          content: emailContent
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send daily summary email:', error);
      return false;
    }
  }

  private generateEmailContent(summary: DailySummaryData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Daily Blitzit Summary</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
          .stat-label { color: #666; margin-top: 5px; }
          .section { margin: 20px 0; }
          .tag-list { display: flex; flex-wrap: wrap; gap: 10px; }
          .tag { background: #e3f2fd; color: #1976d2; padding: 5px 10px; border-radius: 15px; font-size: 0.9em; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌱 Your Daily Blitzit Summary</h1>
            <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div class="content">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${summary.tasksCompleted}</div>
                <div class="stat-label">Tasks Completed</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${Math.round(summary.focusMinutes / 60 * 10) / 10}</div>
                <div class="stat-label">Focus Hours</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${summary.streakDays}</div>
                <div class="stat-label">Day Streak</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${summary.pointsEarned}</div>
                <div class="stat-label">Points Earned</div>
              </div>
            </div>

            <div class="section">
              <h3>📋 Task Overview</h3>
              <p><strong>${summary.tasksDueToday}</strong> tasks due today</p>
              <p><strong>${summary.overdueTasks}</strong> overdue tasks</p>
            </div>

            ${summary.topTags.length > 0 ? `
            <div class="section">
              <h3>🏷️ Top Tags Today</h3>
              <div class="tag-list">
                ${summary.topTags.map(tag => `<span class="tag">${tag.tag} (${tag.count})</span>`).join('')}
              </div>
            </div>
            ` : ''}

            <div class="section">
              <h3>🎯 Focus Sessions</h3>
              <p>You completed <strong>${summary.focusSessions}</strong> focus sessions today!</p>
            </div>

            <div class="footer">
              <p>Keep up the great work! 🌟</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}">Open Blitzit App</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const dailySummaryService = new DailySummaryService();
