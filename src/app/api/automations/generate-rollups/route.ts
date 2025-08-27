import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Get all users
    const users = await prisma.user.findMany();
    const rollups = [];
    const updatedUsers = [];

    for (const user of users) {
      try {
        // Get yesterday's focus sessions
        const focusSessions = await prisma.focusSession.findMany({
          where: {
            userId: user.id,
            started_at: {
              gte: yesterdayStart,
              lte: yesterdayEnd
            },
            status: 'completed'
          }
        });

        // Get yesterday's completed tasks
        const completedTasks = await prisma.task.findMany({
          where: {
            userId: user.id,
            completed_at: {
              gte: yesterdayStart,
              lte: yesterdayEnd
            },
            status: 'completed'
          }
        });

        // Calculate total focus time
        const totalFocusTime = focusSessions.reduce((total, session) => {
          return total + (session.focus_minutes || 0);
        }, 0);

        // Calculate points earned
        const pointsEarned = focusSessions.reduce((total, session) => {
          return total + (session.awarded_points || 0);
        }, 0);

        // Get current streak
        const currentStreak = user.streak_days || 0;

        // Check if user had activity yesterday
        const hadActivityYesterday = totalFocusTime > 0 || completedTasks.length > 0;

        // Calculate new streak
        let newStreak = currentStreak;
        if (hadActivityYesterday) {
          newStreak = currentStreak + 1;
        } else {
          newStreak = 0; // Reset streak if no activity
        }

        // Calculate productivity score (0-100)
        let productivityScore = 0;
        
        // Base score from focus time (max 50 points)
        const focusScore = Math.min(totalFocusTime / 8, 1) * 50; // 8 hours = 50 points
        
        // Task completion score (max 30 points)
        const taskScore = Math.min(completedTasks.length / 10, 1) * 30; // 10 tasks = 30 points
        
        // Streak bonus (max 20 points)
        const streakBonus = Math.min(newStreak / 7, 1) * 20; // 7 days = 20 points
        
        productivityScore = Math.round(focusScore + taskScore + streakBonus);

        // Count trees planted yesterday
        const treesPlanted = await prisma.treeInstance.count({
          where: {
            userId: user.id,
            planted_at: {
              gte: yesterdayStart,
              lte: yesterdayEnd
            }
          }
        });

        // Create daily rollup
        const rollup = {
          id: `rollup-${user.id}-${yesterdayStart.toISOString().split('T')[0]}`,
          userId: user.id,
          date: yesterdayStart,
          totalFocusTime,
          focusSessions: focusSessions.length,
          completedTasks: completedTasks.length,
          streakDays: newStreak,
          pointsEarned,
          treesPlanted,
          productivityScore,
          metadata: {
            focusSessions: focusSessions.map(s => ({
              id: s.id,
              duration: s.focus_minutes,
              points: s.awarded_points,
              taskId: s.taskId
            })),
            completedTasks: completedTasks.map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              category: t.category
            })),
            streakCalculation: {
              previousStreak: currentStreak,
              newStreak: newStreak,
              extended: hadActivityYesterday && currentStreak > 0,
              reset: !hadActivityYesterday
            }
          }
        };

        rollups.push(rollup);

        // Update user streak
        updatedUsers.push({
          id: user.id,
          streak_days: newStreak,
          total_points: (user.total_points || 0) + pointsEarned,
          last_activity_date: hadActivityYesterday ? yesterdayStart : user.last_activity_date
        });

        console.log(`Generated rollup for user ${user.id}: ${productivityScore}/100 score, ${totalFocusTime}min focus, ${completedTasks.length} tasks, streak: ${newStreak}`);

      } catch (userError) {
        console.error(`Failed to generate rollup for user ${user.id}:`, userError);
        // Continue with other users
      }
    }

    // Update user streaks in database
    for (const userUpdate of updatedUsers) {
      try {
        await prisma.user.update({
          where: { id: userUpdate.id },
          data: {
            streak_days: userUpdate.streak_days,
            total_points: userUpdate.total_points,
            last_activity_date: userUpdate.last_activity_date
          }
        });
      } catch (updateError) {
        console.error(`Failed to update user ${userUpdate.id}:`, updateError);
      }
    }

    // Generate system-wide statistics
    const systemStats = {
      totalUsers: users.length,
      activeUsers: rollups.filter(r => r.totalFocusTime > 0 || r.completedTasks > 0).length,
      totalFocusTime: rollups.reduce((sum, r) => sum + r.totalFocusTime, 0),
      totalTasksCompleted: rollups.reduce((sum, r) => sum + r.completedTasks, 0),
      totalPointsEarned: rollups.reduce((sum, r) => sum + r.pointsEarned, 0),
      averageProductivityScore: Math.round(
        rollups.reduce((sum, r) => sum + r.productivityScore, 0) / rollups.length
      ),
      streakDistribution: {
        '0-3 days': rollups.filter(r => r.streakDays >= 0 && r.streakDays <= 3).length,
        '4-7 days': rollups.filter(r => r.streakDays >= 4 && r.streakDays <= 7).length,
        '8-14 days': rollups.filter(r => r.streakDays >= 8 && r.streakDays <= 14).length,
        '15+ days': rollups.filter(r => r.streakDays >= 15).length
      }
    };

    console.log(`Daily rollup generation completed for ${users.length} users`);
    console.log(`System stats: ${systemStats.activeUsers}/${systemStats.totalUsers} active users, avg score: ${systemStats.averageProductivityScore}/100`);

    return NextResponse.json({
      success: true,
      userCount: users.length,
      rollupsGenerated: rollups.length,
      usersUpdated: updatedUsers.length,
      systemStats,
      date: yesterdayStart.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Failed to generate daily rollups:', error);
    return NextResponse.json({ 
      error: 'Failed to generate daily rollups',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
