// Integrity guards for focus sessions

export interface IntegrityConfig {
  requireForeground: boolean;
  detectClockJumps: boolean;
  maxClockJumpSeconds: number;
  maxBackgroundTimeSeconds: number;
}

export interface SessionIntegrity {
  isValid: boolean;
  reason?: string;
  backgroundTime?: number;
  clockJumpDetected?: boolean;
  clockJumpAmount?: number;
}

class IntegrityGuardManager {
  private config: IntegrityConfig = {
    requireForeground: true,
    detectClockJumps: true,
    maxClockJumpSeconds: 300, // 5 minutes
    maxBackgroundTimeSeconds: 60 // 1 minute
  };

  private sessionStartTime: number = 0;
  private lastCheckTime: number = 0;
  private backgroundStartTime: number | null = null;
  private isActive = false;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('integrity-guard-config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    }
  }

  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('integrity-guard-config', JSON.stringify(this.config));
    }
  }

  startSession(): void {
    this.sessionStartTime = Date.now();
    this.lastCheckTime = Date.now();
    this.backgroundStartTime = null;
    this.isActive = true;
    console.log('Integrity guard session started');
  }

  stopSession(): void {
    this.isActive = false;
    this.backgroundStartTime = null;
    console.log('Integrity guard session stopped');
  }

  checkIntegrity(): SessionIntegrity {
    if (!this.isActive) {
      return { isValid: true };
    }

    const now = Date.now();
    const currentTime = Date.now();
    const result: SessionIntegrity = { isValid: true };

    // Check for clock jumps
    if (this.config.detectClockJumps && this.lastCheckTime > 0) {
      const timeDiff = Math.abs(currentTime - this.lastCheckTime);
      const expectedDiff = 1000; // 1 second between checks
      const jumpAmount = Math.abs(timeDiff - expectedDiff);

      if (jumpAmount > this.config.maxClockJumpSeconds * 1000) {
        result.isValid = false;
        result.reason = 'Clock manipulation detected';
        result.clockJumpDetected = true;
        result.clockJumpAmount = jumpAmount / 1000;
        console.warn('Clock jump detected:', jumpAmount / 1000, 'seconds');
      }
    }

    // Check foreground requirement
    if (this.config.requireForeground) {
      if (document.hidden) {
        if (this.backgroundStartTime === null) {
          this.backgroundStartTime = now;
        }

        const backgroundTime = (now - this.backgroundStartTime) / 1000;
        if (backgroundTime > this.config.maxBackgroundTimeSeconds) {
          result.isValid = false;
          result.reason = 'Session invalidated due to background time';
          result.backgroundTime = backgroundTime;
          console.warn('Session invalidated due to background time:', backgroundTime, 'seconds');
        }
      } else {
        this.backgroundStartTime = null;
      }
    }

    this.lastCheckTime = now;
    return result;
  }

  updateConfig(newConfig: Partial<IntegrityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  getConfig(): IntegrityConfig {
    return { ...this.config };
  }

  // Validate session before awarding points
  validateSessionForAward(): SessionIntegrity {
    const integrity = this.checkIntegrity();
    
    if (!integrity.isValid) {
      console.warn('Session integrity check failed:', integrity.reason);
    }
    
    return integrity;
  }

  // Get session statistics
  getSessionStats(): {
    totalTime: number;
    backgroundTime: number;
    foregroundTime: number;
  } {
    if (!this.isActive) {
      return { totalTime: 0, backgroundTime: 0, foregroundTime: 0 };
    }

    const now = Date.now();
    const totalTime = (now - this.sessionStartTime) / 1000;
    const backgroundTime = this.backgroundStartTime ? (now - this.backgroundStartTime) / 1000 : 0;
    const foregroundTime = totalTime - backgroundTime;

    return {
      totalTime,
      backgroundTime,
      foregroundTime
    };
  }

  // Reset background tracking
  resetBackgroundTracking(): void {
    this.backgroundStartTime = null;
  }
}

// Export singleton instance
export const integrityGuardManager = new IntegrityGuardManager();

// Helper functions
export function startIntegrityGuard(): void {
  integrityGuardManager.startSession();
}

export function stopIntegrityGuard(): void {
  integrityGuardManager.stopSession();
}

export function checkSessionIntegrity(): SessionIntegrity {
  return integrityGuardManager.checkIntegrity();
}

export function validateSessionForAward(): SessionIntegrity {
  return integrityGuardManager.validateSessionForAward();
}

export function updateIntegrityConfig(config: Partial<IntegrityConfig>): void {
  integrityGuardManager.updateConfig(config);
}

export function getIntegrityConfig(): IntegrityConfig {
  return integrityGuardManager.getConfig();
}

export function getSessionStats() {
  return integrityGuardManager.getSessionStats();
}

export function resetBackgroundTracking(): void {
  integrityGuardManager.resetBackgroundTracking();
}
