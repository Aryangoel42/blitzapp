import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getForestManager } from '@/lib/forest';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sessionId, focusMinutes, sessionHash } = body;

    if (!userId || !sessionId || !focusMinutes || !sessionHash) {
      return NextResponse.json({ 
        error: 'userId, sessionId, focusMinutes, and sessionHash required' 
      }, { status: 400 });
    }

    const forestManager = getForestManager();

    // Validate session hash for anti-cheat
    if (!forestManager.validateSession(sessionHash, sessionId, new Date().toISOString())) {
      return NextResponse.json({ error: 'Invalid session hash' }, { status: 400 });
    }

    // Get user's trees
    const trees = await prisma.treeInstance.findMany({
      where: { userId },
      include: { species: true }
    });

    const growthResults = [];

    for (const tree of trees) {
      // Parse last growth session IDs
      const lastGrowthSessions = JSON.parse(tree.last_growth_session_ids || '[]');
      
      // Check if this session already grew this tree (anti-cheat)
      if (lastGrowthSessions.includes(sessionId)) {
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
            last_growth_session_ids: JSON.stringify([...lastGrowthSessions, sessionId]),
          },
          include: { species: true }
        });

        growthResults.push({
          treeId: tree.id,
          speciesName: tree.species.name,
          oldStage: tree.stage,
          newStage: newStage,
          grew: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      growthResults,
      totalTreesGrew: growthResults.length,
    });

  } catch (error) {
    console.error('Error growing trees:', error);
    return NextResponse.json({ error: 'Failed to grow trees' }, { status: 500 });
  }
}
