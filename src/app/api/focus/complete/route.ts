import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session, userId, sessionId, focusMinutes, sessionHash, startedAt } = body;

    if (!sessionId || focusMinutes === undefined) {
      return NextResponse.json({ error: 'sessionId and focusMinutes are required' }, { status: 400 });
    }

    // Create focus session record
    const focusSession = await prisma.focusSession.create({
      data: {
        id: sessionId,
        userId: userId || 'mock-user-id', // Fallback for demo
        taskId: session?.taskId,
        focus_minutes: focusMinutes,
        break_minutes: 0, // Will be calculated from preset
        started_at: new Date(startedAt || Date.now()),
        ended_at: new Date(),
        status: 'completed',
        notes: `Focus session completed - ${session?.preset?.name || 'Default'} preset`,
        session_hash: sessionHash || 'demo-hash',
        awarded_points: Math.ceil(focusMinutes / 2), // Basic points calculation
        streak_multiplier: 1.0 // Basic multiplier
      }
    });

    // Update task focus stats if task exists
    if (session?.taskId) {
      try {
        await prisma.task.update({
          where: { id: session.taskId },
          data: {
            // Note: These fields may not exist in the current schema
            // focus_sessions_count: { increment: 1 },
            // total_focus_time_min: { increment: focusMinutes }
          }
        });
      } catch (error) {
        console.warn('Could not update task focus stats:', error);
      }
    }

    return NextResponse.json({
      success: true,
      session: focusSession,
      pointsEarned: Math.ceil(focusMinutes / 2),
      message: 'Focus session completed successfully'
    });
  } catch (error) {
    console.error('Focus completion error:', error);
    return NextResponse.json({ 
      error: 'Failed to complete focus session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


