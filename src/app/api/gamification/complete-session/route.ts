import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePoints, calculateStreak, validateSession, generateSessionHash } from '@/lib/gamification';
import { getForestManager } from '@/lib/forest';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session, userId } = body;

    if (!session || !userId) {
      return NextResponse.json({ error: 'session and userId required' }, { status: 400 });
    }

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

    // Calculate focus minutes from session
    const focusMinutes = session.duration || 0;
    
    // Generate session hash for validation
    const sessionHash = generateSessionHash(session.id, session.startTime || new Date().toISOString());

    // Validate session integrity
    const validation = validateSession(
      sessionHash,
      session.id,
      session.startTime || new Date().toISOString(),
      focusMinutes
    );

    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Session validation failed', 
        reason: validation.reason 
      }, { status: 400 });
    }

    // Calculate points: ceil(minutes/2) with streak multiplier
    const pointsCalculation = calculatePoints(focusMinutes, user.streak_days);
    
    // Calculate streak
    const lastFocusSession = await prisma.focusSession.findFirst({
      where: { userId, status: 'completed' },
      orderBy: { started_at: 'desc' },
      select: { started_at: true }
    });

    const streakCalculation = calculateStreak(
      user.streak_days,
      lastFocusSession?.started_at || null
    );

    // Create focus session record
    const focusSession = await prisma.focusSession.create({
      data: {
        userId,
        taskId: session.taskId,
        focus_minutes: focusMinutes,
        break_minutes: 0,
        started_at: session.startTime ? new Date(session.startTime) : new Date(),
        ended_at: new Date(),
        status: 'completed',
        session_hash: sessionHash,
        awarded_points: pointsCalculation.finalPoints,
        streak_multiplier: pointsCalculation.streakMultiplier
      }
    });

    // Update user points and streak
    await prisma.user.update({
      where: { id: userId },
      data: {
        points: user.points + pointsCalculation.finalPoints,
        streak_days: streakCalculation.newStreak
      }
    });

    // Record points in ledger
    await prisma.pointsLedger.create({
      data: {
        userId,
        delta: pointsCalculation.finalPoints,
        reason: 'focus_completed',
        ref_id: focusSession.id,
        meta_json: JSON.stringify({
          focusMinutes,
          basePoints: pointsCalculation.basePoints,
          streakMultiplier: pointsCalculation.streakMultiplier,
          streakDays: user.streak_days,
          newStreakDays: streakCalculation.newStreak,
          breakdown: pointsCalculation.breakdown
        })
      }
    });

    // Record streak change in ledger
    if (streakCalculation.isExtended || streakCalculation.isReset) {
      await prisma.streakLedger.create({
        data: {
          userId,
          streak_days: streakCalculation.newStreak,
          event_type: streakCalculation.isExtended ? 'focus_completed' : 'day_break'
        }
      });
    }

    // Update task if it exists
    if (session.taskId) {
      await prisma.task.update({
        where: { id: session.taskId },
        data: {
          // Note: These fields will be added in schema update
          // focus_sessions_count: { increment: 1 },
          // total_focus_time_min: { increment: focusMinutes }
        }
      });
    }

    // Trigger tree growth
    const forestManager = getForestManager();
    const trees = await prisma.treeInstance.findMany({
      where: { userId },
      include: { species: true }
    });

    const growthResults = [];
    for (const tree of trees) {
      // Parse last growth session IDs
      const lastGrowthSessions = JSON.parse(tree.last_growth_session_ids || '[]');
      
      // Check if this session already grew this tree (anti-cheat)
      if (lastGrowthSessions.includes(session.id)) {
        continue;
      }

      // Calculate growth
      const growth = forestManager.calculateGrowth(focusMinutes);
      const newStage = Math.min(tree.stage + growth, tree.species.stages - 1);
      
      if (newStage > tree.stage) {
        // Update tree stage
        const updatedTree = await prisma.treeInstance.update({
          where: { id: tree.id },
          data: {
            stage: newStage,
            last_growth_session_ids: JSON.stringify([...lastGrowthSessions, session.id]),
            // Note: total_growth_sessions will be added in schema update
            updated_at: new Date()
          },
          include: { species: true }
        });

        growthResults.push({
          treeId: tree.id,
          speciesName: tree.species.name,
          oldStage: tree.stage,
          newStage: newStage,
          grew: true,
          growthAmount: growth,
          isMature: newStage >= tree.species.stages - 1,
          artRef: forestManager.getTreeArt(updatedTree)
        });
      }
    }

    // Create notification for completed session
    await prisma.notification.create({
      data: {
        userId,
        type: 'focus_completed',
        channel: 'push',
        payload_json: JSON.stringify({
          session_id: focusSession.id,
          duration: focusMinutes,
          pomodoros: session.completedPomodoros,
          points_earned: pointsCalculation.finalPoints,
          streak_change: streakCalculation.isExtended ? 'extended' : streakCalculation.isReset ? 'reset' : 'maintained',
          new_streak: streakCalculation.newStreak,
          trees_grew: growthResults.length,
          message: `Great job! You earned ${pointsCalculation.finalPoints} points and ${growthResults.length} trees grew.`
        }),
        scheduled_at: new Date(),
        sent_at: new Date()
      }
    });

    // Create milestone notifications
    const nextPointsMilestone = getNextMilestone(user.points + pointsCalculation.finalPoints);
    const nextStreakMilestone = getStreakMilestone(streakCalculation.newStreak);

    if (nextPointsMilestone.pointsNeeded <= 0) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'streak_milestone',
          channel: 'push',
          payload_json: JSON.stringify({
            milestone_type: 'points',
            milestone_value: nextPointsMilestone.milestone,
            message: `🎉 You reached ${nextPointsMilestone.milestone} points!`
          }),
          scheduled_at: new Date(),
          sent_at: new Date()
        }
      });
    }

    if (nextStreakMilestone.daysNeeded <= 0) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'streak_milestone',
          channel: 'push',
          payload_json: JSON.stringify({
            milestone_type: 'streak',
            milestone_value: nextStreakMilestone.milestone,
            message: `🔥 ${nextStreakMilestone.milestone} day streak achieved!`
          }),
          scheduled_at: new Date(),
          sent_at: new Date()
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      session: focusSession,
      points: {
        earned: pointsCalculation.finalPoints,
        breakdown: pointsCalculation.breakdown,
        newTotal: user.points + pointsCalculation.finalPoints
      },
      streak: {
        previous: user.streak_days,
        current: streakCalculation.newStreak,
        multiplier: pointsCalculation.streakMultiplier,
        isExtended: streakCalculation.isExtended,
        isReset: streakCalculation.isReset
      },
      trees: {
        grew: growthResults.length,
        results: growthResults
      },
      message: 'Focus session completed successfully'
    });
  } catch (error) {
    console.error('Failed to complete focus session:', error);
    return NextResponse.json({ 
      error: 'Failed to complete focus session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to get next milestone
function getNextMilestone(currentPoints: number): { milestone: number; pointsNeeded: number } {
  const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  const nextMilestone = milestones.find(m => m > currentPoints) || milestones[milestones.length - 1];
  return {
    milestone: nextMilestone,
    pointsNeeded: nextMilestone - currentPoints
  };
}

// Helper function to get streak milestone
function getStreakMilestone(currentStreak: number): { milestone: number; daysNeeded: number } {
  const milestones = [3, 7, 14, 30, 60, 100, 365];
  const nextMilestone = milestones.find(m => m > currentStreak) || milestones[milestones.length - 1];
  return {
    milestone: nextMilestone,
    daysNeeded: nextMilestone - currentStreak
  };
}
