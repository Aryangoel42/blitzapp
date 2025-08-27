// Comprehensive Forest Gamification System

export interface GamificationConfig {
  pointsPerMinute: number;
  maxStreakMultiplier: number;
  streakMultiplierIncrement: number;
  minFocusMinutesForPoints: number;
  maxPointsPerSession: number;
}

export interface SessionValidation {
  isValid: boolean;
  reason?: string;
  clockJumpDetected?: boolean;
  backgroundTimeExceeded?: boolean;
  sessionAlreadyProcessed?: boolean;
}

export interface PointsCalculation {
  basePoints: number;
  streakMultiplier: number;
  finalPoints: number;
  breakdown: {
    focusMinutes: number;
    baseCalculation: string;
    multiplierCalculation: string;
  };
}

export interface StreakCalculation {
  currentStreak: number;
  newStreak: number;
  multiplier: number;
  isMaintained: boolean;
  isExtended: boolean;
  isReset: boolean;
}

class GamificationManager {
  private config: GamificationConfig = {
    pointsPerMinute: 0.5, // ceil(minutes/2) = 0.5 points per minute
    maxStreakMultiplier: 2.0, // Cap at 2x
    streakMultiplierIncrement: 0.1, // 1 + 0.1d
    minFocusMinutesForPoints: 1,
    maxPointsPerSession: 1000
  };

  // Calculate points: ceil(minutes/2) with streak multiplier
  calculatePoints(focusMinutes: number, streakDays: number): PointsCalculation {
    // Validate input
    if (focusMinutes < this.config.minFocusMinutesForPoints) {
      return {
        basePoints: 0,
        streakMultiplier: 1.0,
        finalPoints: 0,
        breakdown: {
          focusMinutes,
          baseCalculation: `Minimum ${this.config.minFocusMinutesForPoints} minutes required`,
          multiplierCalculation: 'No points earned'
        }
      };
    }

    // Cap focus minutes to prevent abuse
    const cappedMinutes = Math.min(focusMinutes, this.config.maxPointsPerSession * 2);
    
    // Calculate base points: ceil(minutes/2)
    const basePoints = Math.ceil(cappedMinutes / 2);
    
    // Calculate streak multiplier: 1 + 0.1d, capped at 2x
    const streakMultiplier = Math.min(
      1 + (streakDays * this.config.streakMultiplierIncrement),
      this.config.maxStreakMultiplier
    );
    
    // Calculate final points
    const finalPoints = Math.round(basePoints * streakMultiplier);
    
    return {
      basePoints,
      streakMultiplier,
      finalPoints,
      breakdown: {
        focusMinutes: cappedMinutes,
        baseCalculation: `ceil(${cappedMinutes}/2) = ${basePoints} points`,
        multiplierCalculation: `1 + (${streakDays} × 0.1) = ${streakMultiplier.toFixed(1)}x multiplier`
      }
    };
  }

  // Calculate streak multiplier: 1 + 0.1d, cap 2×
  calculateStreakMultiplier(streakDays: number): number {
    return Math.min(
      1 + (streakDays * this.config.streakMultiplierIncrement),
      this.config.maxStreakMultiplier
    );
  }

  // Calculate daily streak based on focus sessions
  calculateStreak(
    currentStreak: number,
    lastFocusDate: Date | null,
    currentDate: Date = new Date()
  ): StreakCalculation {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let lastFocusDay: Date | null = null;
    if (lastFocusDate) {
      lastFocusDay = new Date(lastFocusDate);
      lastFocusDay.setHours(0, 0, 0, 0);
    }

    // Check if user focused today
    const focusedToday = lastFocusDay && lastFocusDay.getTime() === today.getTime();
    
    // Check if user focused yesterday (for streak maintenance)
    const focusedYesterday = lastFocusDay && lastFocusDay.getTime() === yesterday.getTime();

    let newStreak = currentStreak;
    let isMaintained = false;
    let isExtended = false;
    let isReset = false;

    if (focusedToday) {
      if (focusedYesterday || currentStreak === 0) {
        // Extend streak
        newStreak = currentStreak + 1;
        isExtended = true;
      } else {
        // Maintain current streak (already focused today)
        newStreak = currentStreak;
        isMaintained = true;
      }
    } else if (focusedYesterday) {
      // Maintain streak (focused yesterday, not today yet)
      newStreak = currentStreak;
      isMaintained = true;
    } else if (currentStreak > 0) {
      // Break streak (no focus yesterday or today)
      newStreak = 0;
      isReset = true;
    }

    const multiplier = this.calculateStreakMultiplier(newStreak);

    return {
      currentStreak,
      newStreak,
      multiplier,
      isMaintained,
      isExtended,
      isReset
    };
  }

  // Validate session for anti-cheat
  validateSession(
    sessionHash: string,
    sessionId: string,
    startedAt: string,
    focusMinutes: number,
    lastProcessedSessions: string[] = []
  ): SessionValidation {
    // Check if session already processed
    if (lastProcessedSessions.includes(sessionId)) {
      return {
        isValid: false,
        reason: 'Session already processed',
        sessionAlreadyProcessed: true
      };
    }

    // Validate session hash
    const expectedHash = this.generateSessionHash(sessionId, startedAt);
    if (sessionHash !== expectedHash) {
      return {
        isValid: false,
        reason: 'Invalid session hash',
        clockJumpDetected: true
      };
    }

    // Validate focus minutes (reasonable range)
    if (focusMinutes < 0 || focusMinutes > 24 * 60) { // Max 24 hours
      return {
        isValid: false,
        reason: 'Invalid focus duration',
        clockJumpDetected: true
      };
    }

    // Check for clock manipulation
    const sessionStart = new Date(startedAt);
    const now = new Date();
    const timeDiff = now.getTime() - sessionStart.getTime();
    const maxReasonableDiff = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (timeDiff > maxReasonableDiff) {
      return {
        isValid: false,
        reason: 'Session time exceeds reasonable limits',
        clockJumpDetected: true
      };
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

  // Calculate tree growth based on focus session
  calculateTreeGrowth(focusMinutes: number): number {
    // ≥50m +2 stages, otherwise +1 stage
    return focusMinutes >= 50 ? 2 : 1;
  }

  // Check if user can afford a species
  canAffordSpecies(speciesCost: number, userPoints: number): boolean {
    return userPoints >= speciesCost;
  }

  // Calculate points needed for next milestone
  getNextMilestone(currentPoints: number): { milestone: number; pointsNeeded: number } {
    const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    const nextMilestone = milestones.find(m => m > currentPoints) || milestones[milestones.length - 1];
    return {
      milestone: nextMilestone,
      pointsNeeded: nextMilestone - currentPoints
    };
  }

  // Get streak milestone info
  getStreakMilestone(currentStreak: number): { milestone: number; daysNeeded: number } {
    const milestones = [3, 7, 14, 30, 60, 100, 365];
    const nextMilestone = milestones.find(m => m > currentStreak) || milestones[milestones.length - 1];
    return {
      milestone: nextMilestone,
      daysNeeded: nextMilestone - currentStreak
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<GamificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): GamificationConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const gamificationManager = new GamificationManager();

// Helper functions
export function calculatePoints(focusMinutes: number, streakDays: number): PointsCalculation {
  return gamificationManager.calculatePoints(focusMinutes, streakDays);
}

export function calculateStreakMultiplier(streakDays: number): number {
  return gamificationManager.calculateStreakMultiplier(streakDays);
}

export function calculateStreak(
  currentStreak: number,
  lastFocusDate: Date | null,
  currentDate?: Date
): StreakCalculation {
  return gamificationManager.calculateStreak(currentStreak, lastFocusDate, currentDate);
}

export function validateSession(
  sessionHash: string,
  sessionId: string,
  startedAt: string,
  focusMinutes: number,
  lastProcessedSessions?: string[]
): SessionValidation {
  return gamificationManager.validateSession(sessionHash, sessionId, startedAt, focusMinutes, lastProcessedSessions);
}

export function generateSessionHash(sessionId: string, startedAt: string): string {
  return gamificationManager.generateSessionHash(sessionId, startedAt);
}

export function calculateTreeGrowth(focusMinutes: number): number {
  return gamificationManager.calculateTreeGrowth(focusMinutes);
}

export function canAffordSpecies(speciesCost: number, userPoints: number): boolean {
  return gamificationManager.canAffordSpecies(speciesCost, userPoints);
}

export function getNextMilestone(currentPoints: number) {
  return gamificationManager.getNextMilestone(currentPoints);
}

export function getStreakMilestone(currentStreak: number) {
  return gamificationManager.getStreakMilestone(currentStreak);
}
