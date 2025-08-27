import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getForestManager } from '@/lib/forest';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Get user's trees with species information
    const trees = await prisma.treeInstance.findMany({
      where: { userId },
      include: {
        species: true
      },
      orderBy: {
        planted_at: 'desc'
      }
    });

    return NextResponse.json(trees);
  } catch (error) {
    console.error('Error fetching user trees:', error);
    return NextResponse.json({ error: 'Failed to fetch trees' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, speciesId } = body;

    if (!userId || !speciesId) {
      return NextResponse.json({ error: 'userId and speciesId required' }, { status: 400 });
    }

    const forestManager = getForestManager();
    
    // Check if user can afford this species
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const species = forestManager.getSpecies(speciesId);
    if (!species) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    if (!forestManager.canAffordSpecies(speciesId, user.points)) {
      return NextResponse.json({ error: 'Not enough points' }, { status: 400 });
    }

    // Create tree instance
    const treeInstance = await prisma.treeInstance.create({
      data: {
        userId,
        speciesId,
        stage: 0,
        planted_at: new Date(),
        last_growth_session_ids: '[]',
      },
      include: {
        species: true,
      }
    });

    // Deduct points if not a starter species
    if (!species.is_starter) {
      await prisma.user.update({
        where: { id: userId },
        data: { points: user.points - species.unlock_cost }
      });

      // Record purchase in ledger
      await prisma.pointsLedger.create({
        data: {
          userId,
          delta: -species.unlock_cost,
          reason: 'shop_purchase',
          ref_id: treeInstance.id,
          meta_json: JSON.stringify({ species_id: speciesId }),
        }
      });
    }

    return NextResponse.json(treeInstance, { status: 201 });
  } catch (error) {
    console.error('Error planting tree:', error);
    return NextResponse.json({ error: 'Failed to plant tree' }, { status: 500 });
  }
}
