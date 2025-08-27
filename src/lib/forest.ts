export type TreeSpecies = {
  id: string;
  name: string;
  stages: number;
  unlock_cost: number;
  art_refs: string[];
  is_starter: boolean;
  description?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
};

export type TreeInstance = {
  id: string;
  userId: string;
  speciesId: string;
  stage: number;
  planted_at: Date;
  last_growth_session_ids: string[];
  total_growth_sessions: number;
  last_growth_date?: Date;
};

export type ForestStats = {
  total_trees: number;
  total_points: number;
  current_streak: number;
  species_unlocked: number;
  forest_age_days: number;
  mature_trees: number;
  average_stage: number;
  total_growth_sessions: number;
};

export type GrowthResult = {
  treeId: string;
  speciesName: string;
  oldStage: number;
  newStage: number;
  grew: boolean;
  growthAmount: number;
  isMature: boolean;
  artRef: string;
};

// Default tree species with enhanced data
export const DEFAULT_SPECIES: TreeSpecies[] = [
  {
    id: 'oak',
    name: 'Oak',
    stages: 4,
    unlock_cost: 0,
    art_refs: ['oak_stage1', 'oak_stage2', 'oak_stage3', 'oak_stage4'],
    is_starter: true,
    description: 'A sturdy and reliable tree that grows steadily with focus.',
    rarity: 'common'
  },
  {
    id: 'maple',
    name: 'Maple',
    stages: 3,
    unlock_cost: 0,
    art_refs: ['maple_stage1', 'maple_stage2', 'maple_stage3'],
    is_starter: true,
    description: 'Beautiful tree that thrives with consistent daily focus.',
    rarity: 'common'
  },
  {
    id: 'pine',
    name: 'Pine',
    stages: 5,
    unlock_cost: 0,
    art_refs: ['pine_stage1', 'pine_stage2', 'pine_stage3', 'pine_stage4', 'pine_stage5'],
    is_starter: true,
    description: 'A tall tree that requires dedication to reach its full height.',
    rarity: 'common'
  },
  {
    id: 'cherry',
    name: 'Cherry Blossom',
    stages: 4,
    unlock_cost: 100,
    art_refs: ['cherry_stage1', 'cherry_stage2', 'cherry_stage3', 'cherry_stage4'],
    is_starter: false,
    description: 'Delicate and beautiful, blooms with focused effort.',
    rarity: 'rare'
  },
  {
    id: 'bamboo',
    name: 'Bamboo',
    stages: 3,
    unlock_cost: 150,
    art_refs: ['bamboo_stage1', 'bamboo_stage2', 'bamboo_stage3'],
    is_starter: false,
    description: 'Fast-growing and resilient, perfect for quick progress.',
    rarity: 'rare'
  },
  {
    id: 'redwood',
    name: 'Redwood',
    stages: 5,
    unlock_cost: 300,
    art_refs: ['redwood_stage1', 'redwood_stage2', 'redwood_stage3', 'redwood_stage4', 'redwood_stage5'],
    is_starter: false,
    description: 'Majestic and ancient, requires long-term dedication.',
    rarity: 'epic'
  },
  {
    id: 'sakura',
    name: 'Sakura',
    stages: 4,
    unlock_cost: 500,
    art_refs: ['sakura_stage1', 'sakura_stage2', 'sakura_stage3', 'sakura_stage4'],
    is_starter: false,
    description: 'Rare and beautiful, blooms only with exceptional focus.',
    rarity: 'legendary'
  },
  {
    id: 'golden_oak',
    name: 'Golden Oak',
    stages: 6,
    unlock_cost: 1000,
    art_refs: ['golden_oak_stage1', 'golden_oak_stage2', 'golden_oak_stage3', 'golden_oak_stage4', 'golden_oak_stage5', 'golden_oak_stage6'],
    is_starter: false,
    description: 'Legendary tree that shines with golden leaves at maturity.',
    rarity: 'legendary'
  }
];

export class ForestManager {
  private species: Map<string, TreeSpecies> = new Map();

  constructor() {
    DEFAULT_SPECIES.forEach(species => {
      this.species.set(species.id, species);
    });
  }

  // Calculate points: ceil(minutes/2) with streak multiplier
  calculatePoints(focusMinutes: number, streakMultiplier: number): number {
    const basePoints = Math.ceil(focusMinutes / 2);
    const cappedMultiplier = Math.min(streakMultiplier, 2); // Cap at 2x
    return Math.round(basePoints * cappedMultiplier);
  }

  // Calculate tree growth: ≥50m +2 stages, otherwise +1 stage
  calculateGrowth(focusMinutes: number): number {
    return focusMinutes >= 50 ? 2 : 1;
  }

  // Enhanced growth logic with session validation
  growTree(
    tree: TreeInstance,
    sessionId: string,
    focusMinutes: number,
    sessionHash: string,
    startedAt: string
  ): { tree: TreeInstance; grew: boolean; validation: any } {
    const species = this.species.get(tree.speciesId);
    if (!species) {
      throw new Error(`Species ${tree.speciesId} not found`);
    }

    // Validate session
    const validation = this.validateSession(sessionHash, sessionId, startedAt, focusMinutes);
    if (!validation.isValid) {
      return { tree, grew: false, validation };
    }

    // Check if this session already grew this tree (anti-cheat)
    if (tree.last_growth_session_ids.includes(sessionId)) {
      return { 
        tree, 
        grew: false, 
        validation: { isValid: false, reason: 'Session already processed' }
      };
    }

    // Calculate growth
    const growth = this.calculateGrowth(focusMinutes);
    const newStage = Math.min(tree.stage + growth, species.stages - 1);
    
    if (newStage > tree.stage) {
      const updatedTree: TreeInstance = {
        ...tree,
        stage: newStage,
        last_growth_session_ids: [...tree.last_growth_session_ids, sessionId],
        total_growth_sessions: tree.total_growth_sessions + 1,
        last_growth_date: new Date()
      };
      return { tree: updatedTree, grew: true, validation };
    }

    return { tree, grew: false, validation };
  }

  // Validate session for anti-cheat
  validateSession(sessionHash: string, sessionId: string, startedAt: string, focusMinutes: number): any {
    const expectedHash = this.generateSessionHash(sessionId, startedAt);
    if (sessionHash !== expectedHash) {
      return { isValid: false, reason: 'Invalid session hash' };
    }

    // Validate focus minutes (reasonable range)
    if (focusMinutes < 0 || focusMinutes > 24 * 60) { // Max 24 hours
      return { isValid: false, reason: 'Invalid focus duration' };
    }

    // Check for clock manipulation
    const sessionStart = new Date(startedAt);
    const now = new Date();
    const timeDiff = now.getTime() - sessionStart.getTime();
    const maxReasonableDiff = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (timeDiff > maxReasonableDiff) {
      return { isValid: false, reason: 'Session time exceeds reasonable limits' };
    }

    return { isValid: true };
  }

  // Generate session hash for validation
  generateSessionHash(sessionId: string, startedAt: string): string {
    const input = `${sessionId}-${startedAt}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Get all species
  getAllSpecies(): TreeSpecies[] {
    return Array.from(this.species.values());
  }

  // Get species by ID
  getSpecies(id: string): TreeSpecies | undefined {
    return this.species.get(id);
  }

  // Get starter species
  getStarterSpecies(): TreeSpecies[] {
    return DEFAULT_SPECIES.filter(species => species.is_starter);
  }

  // Get purchasable species
  getPurchasableSpecies(): TreeSpecies[] {
    return DEFAULT_SPECIES.filter(species => !species.is_starter);
  }

  // Get species by rarity
  getSpeciesByRarity(rarity: 'common' | 'rare' | 'epic' | 'legendary'): TreeSpecies[] {
    return DEFAULT_SPECIES.filter(species => species.rarity === rarity);
  }

  // Check if user can afford a species
  canAffordSpecies(speciesId: string, userPoints: number): boolean {
    const species = this.species.get(speciesId);
    if (!species) return false;
    return userPoints >= species.unlock_cost;
  }

  // Plant a new tree
  plantTree(userId: string, speciesId: string): TreeInstance {
    const species = this.species.get(speciesId);
    if (!species) {
      throw new Error(`Species ${speciesId} not found`);
    }

    return {
      id: Math.random().toString(36).substring(2),
      userId,
      speciesId,
      stage: 0,
      planted_at: new Date(),
      last_growth_session_ids: [],
      total_growth_sessions: 0
    };
  }

  // Calculate forest statistics
  calculateStats(trees: TreeInstance[], userPoints: number, streakDays: number): ForestStats {
    const totalTrees = trees.length;
    const speciesUnlocked = new Set(trees.map(t => t.speciesId)).size;
    const forestAgeDays = trees.length > 0 
      ? Math.floor((Date.now() - Math.min(...trees.map(t => t.planted_at.getTime()))) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate mature trees (stage >= maxStages - 1)
    const matureTrees = trees.filter(tree => {
      const species = this.species.get(tree.speciesId);
      return species && tree.stage >= species.stages - 1;
    }).length;

    // Calculate average stage
    const totalStages = trees.reduce((sum, tree) => sum + tree.stage, 0);
    const averageStage = totalTrees > 0 ? totalStages / totalTrees : 0;

    // Calculate total growth sessions
    const totalGrowthSessions = trees.reduce((sum, tree) => sum + (tree.total_growth_sessions || 0), 0);

    return {
      total_trees: totalTrees,
      total_points: userPoints,
      current_streak: streakDays,
      species_unlocked: speciesUnlocked,
      forest_age_days: forestAgeDays,
      mature_trees: matureTrees,
      average_stage: Math.round(averageStage * 10) / 10,
      total_growth_sessions: totalGrowthSessions
    };
  }

  // Get tree art reference for current stage
  getTreeArt(tree: TreeInstance): string {
    const species = this.species.get(tree.speciesId);
    if (!species) return 'unknown';
    
    const artRef = species.art_refs[tree.stage];
    return artRef || species.art_refs[0];
  }

  // Get tree display name with stage
  getTreeDisplayName(tree: TreeInstance): string {
    const species = this.species.get(tree.speciesId);
    if (!species) return 'Unknown Tree';
    
    const stageNames = ['Seedling', 'Sapling', 'Young', 'Mature', 'Ancient'];
    const stageName = stageNames[tree.stage] || `Stage ${tree.stage + 1}`;
    
    return `${species.name} (${stageName})`;
  }

  // Get tree progress percentage
  getTreeProgress(tree: TreeInstance): number {
    const species = this.species.get(tree.speciesId);
    if (!species) return 0;
    
    return (tree.stage / (species.stages - 1)) * 100;
  }

  // Check if tree is mature
  isTreeMature(tree: TreeInstance): boolean {
    const species = this.species.get(tree.speciesId);
    if (!species) return false;
    
    return tree.stage >= species.stages - 1;
  }

  // Get next growth milestone
  getNextGrowthMilestone(tree: TreeInstance): { stage: number; sessionsNeeded: number } {
    const species = this.species.get(tree.speciesId);
    if (!species) return { stage: tree.stage, sessionsNeeded: 0 };
    
    const nextStage = Math.min(tree.stage + 1, species.stages - 1);
    const sessionsNeeded = nextStage > tree.stage ? 1 : 0;
    
    return { stage: nextStage, sessionsNeeded };
  }

  // Get species unlock requirements
  getSpeciesUnlockRequirements(speciesId: string): { cost: number; description: string } {
    const species = this.species.get(speciesId);
    if (!species) return { cost: 0, description: 'Species not found' };
    
    if (species.is_starter) {
      return { cost: 0, description: 'Available from start' };
    }
    
    return { 
      cost: species.unlock_cost, 
      description: `Unlock for ${species.unlock_cost} points` 
    };
  }
}

// Singleton instance
let forestManager: ForestManager | null = null;

export function getForestManager(): ForestManager {
  if (!forestManager) {
    forestManager = new ForestManager();
  }
  return forestManager;
}
