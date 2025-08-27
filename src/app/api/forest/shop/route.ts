import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getForestManager } from '@/lib/forest';
import { canAffordSpecies } from '@/lib/gamification';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const forestManager = getForestManager();
    
    // Get all species
    const allSpecies = forestManager.getAllSpecies();
    
    // Get user's existing trees to check what's already unlocked
    const userTrees = await prisma.treeInstance.findMany({
      where: { userId },
      select: { speciesId: true }
    });
    
    const unlockedSpeciesIds = new Set(userTrees.map(tree => tree.speciesId));

    // Categorize species
    const shopData = {
      userPoints: user.points,
      starterSpecies: allSpecies.filter(species => species.is_starter).map(species => ({
        ...species,
        isUnlocked: unlockedSpeciesIds.has(species.id),
        canAfford: true,
        ownedCount: userTrees.filter(tree => tree.speciesId === species.id).length
      })),
      purchasableSpecies: allSpecies.filter(species => !species.is_starter).map(species => ({
        ...species,
        isUnlocked: unlockedSpeciesIds.has(species.id),
        canAfford: canAffordSpecies(species.unlock_cost, user.points),
        ownedCount: userTrees.filter(tree => tree.speciesId === species.id).length
      })),
      categories: {
        common: allSpecies.filter(species => species.rarity === 'common').map(species => ({
          ...species,
          isUnlocked: unlockedSpeciesIds.has(species.id),
          canAfford: species.is_starter || canAffordSpecies(species.unlock_cost, user.points),
          ownedCount: userTrees.filter(tree => tree.speciesId === species.id).length
        })),
        rare: allSpecies.filter(species => species.rarity === 'rare').map(species => ({
          ...species,
          isUnlocked: unlockedSpeciesIds.has(species.id),
          canAfford: species.is_starter || canAffordSpecies(species.unlock_cost, user.points),
          ownedCount: userTrees.filter(tree => tree.speciesId === species.id).length
        })),
        epic: allSpecies.filter(species => species.rarity === 'epic').map(species => ({
          ...species,
          isUnlocked: unlockedSpeciesIds.has(species.id),
          canAfford: species.is_starter || canAffordSpecies(species.unlock_cost, user.points),
          ownedCount: userTrees.filter(tree => tree.speciesId === species.id).length
        })),
        legendary: allSpecies.filter(species => species.rarity === 'legendary').map(species => ({
          ...species,
          isUnlocked: unlockedSpeciesIds.has(species.id),
          canAfford: species.is_starter || canAffordSpecies(species.unlock_cost, user.points),
          ownedCount: userTrees.filter(tree => tree.speciesId === species.id).length
        }))
      }
    };

    return NextResponse.json(shopData);
  } catch (error) {
    console.error('Error fetching shop data:', error);
    return NextResponse.json({ error: 'Failed to fetch shop data' }, { status: 500 });
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

    // Check if user already owns this species
    const existingTree = await prisma.treeInstance.findFirst({
      where: { userId, speciesId }
    });

    if (existingTree) {
      return NextResponse.json({ 
        error: 'Species already owned',
        message: 'You already own this tree species'
      }, { status: 400 });
    }

    if (!forestManager.canAffordSpecies(speciesId, user.points)) {
      return NextResponse.json({ 
        error: 'Not enough points',
        message: `You need ${species.unlock_cost} points to unlock this species`
      }, { status: 400 });
    }

    // Create tree instance
    const treeInstance = await prisma.treeInstance.create({
      data: {
        userId,
        speciesId,
        stage: 0,
        planted_at: new Date(),
        last_growth_session_ids: '[]',
        total_growth_sessions: 0
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
          meta_json: JSON.stringify({ 
            species_id: speciesId,
            species_name: species.name,
            rarity: species.rarity
          }),
        }
      });

      // Create notification for purchase
      await prisma.notification.create({
        data: {
          userId,
          type: 'focus_completed', // Reusing type for shop purchase
          channel: 'push',
          payload_json: JSON.stringify({
            purchase_type: 'tree_species',
            species_name: species.name,
            cost: species.unlock_cost,
            message: `🌱 You unlocked ${species.name} for ${species.unlock_cost} points!`
          }),
          scheduled_at: new Date(),
          sent_at: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      tree: treeInstance,
      pointsSpent: species.is_starter ? 0 : species.unlock_cost,
      remainingPoints: user.points - (species.is_starter ? 0 : species.unlock_cost),
      message: `Successfully planted ${species.name}!`
    }, { status: 201 });
  } catch (error) {
    console.error('Error purchasing species:', error);
    return NextResponse.json({ error: 'Failed to purchase species' }, { status: 500 });
  }
}
