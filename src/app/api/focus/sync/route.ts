import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, startTime, duration, phase, taskId, isRunning, lastSyncTime } = body;

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'sessionId is required' 
      }, { status: 400 });
    }

    // Check if session exists
    let session = await prisma.focusSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      // Create new session if it doesn't exist
      session = await prisma.focusSession.create({
        data: {
          id: sessionId,
          userId: 'user-123', // Replace with actual user ID
          taskId,
          duration_min: duration,
          phase,
          started_at: new Date(startTime),
          status: isRunning ? 'active' : 'paused',
          session_hash: generateSessionHash(sessionId, startTime)
        }
      });
    } else {
      // Update existing session
      session = await prisma.focusSession.update({
        where: { id: sessionId },
        data: {
          duration_min: duration,
          phase,
          status: isRunning ? 'active' : 'paused',
          updated_at: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      session,
      syncedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Timer sync error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync timer state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'sessionId is required' 
      }, { status: 400 });
    }

    const session = await prisma.focusSession.findUnique({
      where: { id: sessionId },
      include: { task: true }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      session,
      currentTime: Date.now()
    });
  } catch (error) {
    console.error('Timer state fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch timer state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateSessionHash(sessionId: string, startTime: string): string {
  // Simple hash generation for session validation
  const data = `${sessionId}-${startTime}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
