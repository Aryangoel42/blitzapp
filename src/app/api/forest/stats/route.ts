import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getForestManager } from '@/lib/forest';
import { getNextMilestone, getStreakMilestone } from '@/lib/gamification';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        points: true, 
        streak_days: true, 
        created_at: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get tree instances
    const trees = await prisma.treeInstance.findMany({
      where: { userId },
      include: { species: true }
    });

    const forestManager = getForestManager();

    // Calculate comprehensive stats
    const total_trees = trees.length;
    const total_points = user.points;
    const current_streak = user.streak_days;
    const species_unlocked = new Set(trees.map(t => t.speciesId)).size;
    const forest_age_days = Math.floor((Date.now() - user.created_at.getTime()) / (1000 * 60 * 60 * 24));

    // Species counts
    const speciesCounts = trees.reduce((acc, tree) => {
      acc[tree.species.name] = (acc[tree.species.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Mature trees (stage >= maxStages - 1)
    const matureTrees = trees.filter(tree => tree.stage >= tree.species.stages - 1).length;

    // Average stage
    const totalStages = trees.reduce((sum, tree) => sum + tree.stage, 0);
    const averageStage = total_trees > 0 ? (totalStages / total_trees).toFixed(1) : '0';

    // Total growth sessions (placeholder until schema is updated)
    const totalGrowthSessions = 0;

    // Rarity breakdown (placeholder until schema is updated)
    const rarityBreakdown = {
      common: trees.length,
      rare: 0,
      epic: 0,
      legendary: 0
    };

    // Tree progress analysis
    const treeProgress = trees.map(tree => ({
      id: tree.id,
      speciesName: tree.species.name,
      stage: tree.stage,
      maxStages: tree.species.stages,
      progress: (tree.stage / (tree.species.stages - 1)) * 100,
      isMature: tree.stage >= tree.species.stages - 1,
      plantedAt: tree.planted_at,
      growthSessions: 0, // Placeholder until schema is updated
      lastGrowthDate: null // Placeholder until schema is updated
    }));

    // Milestone tracking
    const nextPointsMilestone = getNextMilestone(user.points);
    const nextStreakMilestone = getStreakMilestone(user.streak_days);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentFocusSessions = await prisma.focusSession.findMany({
      where: {
        userId,
        status: 'completed',
        started_at: { gte: sevenDaysAgo }
      },
      select: {
        focus_minutes: true,
        awarded_points: true,
        started_at: true
      }
    });

    const recentActivity = {
      sessionsCount: recentFocusSessions.length,
      totalMinutes: recentFocusSessions.reduce((sum, session) => sum + session.focus_minutes, 0),
      totalPoints: recentFocusSessions.reduce((sum, session) => sum + session.awarded_points, 0),
      averageSessionLength: recentFocusSessions.length > 0 
        ? Math.round(recentFocusSessions.reduce((sum, session) => sum + session.focus_minutes, 0) / recentFocusSessions.length)
        : 0
    };

    // Points history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pointsHistory = await prisma.pointsLedger.findMany({
      where: {
        userId,
        reason: 'focus_completed',
        created_at: { gte: thirtyDaysAgo }
      },
      select: {
        delta: true,
        created_at: true
      },
      orderBy: { created_at: 'asc' }
    });

    // Streak history
    const streakHistory = await prisma.streakLedger.findMany({
      where: {
        userId,
        created_at: { gte: thirtyDaysAgo }
      },
      select: {
        streak_days: true,
        event_type: true,
        created_at: true
      },
      orderBy: { created_at: 'asc' }
    });

    // Achievement tracking
    const achievements = {
      totalPoints: {
        current: user.points,
        nextMilestone: nextPointsMilestone.milestone,
        progress: Math.min((user.points / nextPointsMilestone.milestone) * 100, 100)
      },
      streak: {
        current: user.streak_days,
        nextMilestone: nextStreakMilestone.milestone,
        progress: Math.min((user.streak_days / nextStreakMilestone.milestone) * 100, 100)
      },
      trees: {
        total: total_trees,
        mature: matureTrees,
        species: species_unlocked
      }
    };

    const stats = {
      // Basic stats
      total_trees,
      total_points,
      current_streak,
      species_unlocked,
      forest_age_days,
      mature_trees: matureTrees,
      average_stage: parseFloat(averageStage),
      total_growth_sessions: totalGrowthSessions,

      // Detailed breakdowns
      speciesCounts,
      rarityBreakdown,
      treeProgress,

      // Milestones
      milestones: {
        points: nextPointsMilestone,
        streak: nextStreakMilestone
      },

      // Recent activity
      recentActivity,

      // History
      pointsHistory: pointsHistory.map(entry => ({
        points: entry.delta,
        date: entry.created_at
      })),
      streakHistory: streakHistory.map(entry => ({
        streak: entry.streak_days,
        event: entry.event_type,
        date: entry.created_at
      })),

      // Achievements
      achievements
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching forest stats:', error);
    return NextResponse.json({ error: 'Failed to fetch forest stats' }, { status: 500 });
  }
}
