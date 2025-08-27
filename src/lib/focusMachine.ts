export type FocusPreset = {
  name: string;
  focus_min: number;
  short_break_min: number;
  long_break_min: number;
  long_break_every: number;
};

export type FocusPhase = 'idle' | 'focus' | 'short_break' | 'long_break' | 'paused';

export type FocusSession = {
  id: string;
  taskId?: string;
  preset: FocusPreset;
  startedAt: Date;
  currentPhase: FocusPhase;
  completedPomodoros: number;
  totalFocusMinutes: number;
  sessionHash: string;
  timeRemaining: number; // seconds
  isActive: boolean;
};

export const DEFAULT_PRESETS: FocusPreset[] = [
  { name: "Default", focus_min: 25, short_break_min: 5, long_break_min: 15, long_break_every: 4 },
  { name: "Deep Work", focus_min: 50, short_break_min: 10, long_break_min: 20, long_break_every: 3 },
  { name: "Quick Sprints", focus_min: 15, short_break_min: 3, long_break_min: 10, long_break_every: 4 }
];

function generateSessionHash(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export class FocusTimer {
  private session: FocusSession | null = null;
  private interval: NodeJS.Timeout | null = null;
  private onTick?: (session: FocusSession) => void;
  private onPhaseChange?: (session: FocusSession, event: 'completed' | 'aborted' | 'skipped') => void;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(
    onTick?: (session: FocusSession) => void,
    onPhaseChange?: (session: FocusSession, event: 'completed' | 'aborted' | 'skipped') => void
  ) {
    this.onTick = onTick;
    this.onPhaseChange = onPhaseChange;
  }

  // Event system for pomodoro events
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  start(taskId?: string, preset?: FocusPreset): FocusSession {
    const selectedPreset = preset || DEFAULT_PRESETS[0];
    
    this.session = {
      id: Math.random().toString(36).substring(2),
    taskId,
      preset: selectedPreset,
      startedAt: new Date(),
      currentPhase: 'focus',
      completedPomodoros: 0,
      totalFocusMinutes: 0,
      sessionHash: generateSessionHash(),
      timeRemaining: selectedPreset.focus_min * 60,
      isActive: true,
    };

    this.startTimer();
    
    // Emit session started event
    this.emitEvent('pomodoro.started', this.session);
    
    return this.session;
  }

  pause(): void {
    if (this.session) {
      this.session.isActive = false;
      this.stopTimer();
      
      // Emit session paused event
      this.emitEvent('pomodoro.paused', this.session);
    }
  }

  resume(): void {
    if (this.session && this.session.currentPhase !== 'idle') {
      this.session.isActive = true;
      this.startTimer();
      
      // Emit session resumed event
      this.emitEvent('pomodoro.resumed', this.session);
    }
  }

  stop(): void {
    if (this.session) {
      // Emit session aborted event
      this.emitEvent('pomodoro.aborted', this.session);
      this.onPhaseChange?.(this.session, 'aborted');
    }
    this.session = null;
    this.stopTimer();
  }

  skip(): void {
    if (!this.session) return;

    this.onPhaseChange?.(this.session, 'skipped');
    this.advancePhase();
  }

  private startTimer(): void {
    this.stopTimer();
    this.interval = setInterval(() => {
      if (!this.session || !this.session.isActive) return;

      this.session.timeRemaining--;
      this.onTick?.(this.session);

      if (this.session.timeRemaining <= 0) {
        this.onPhaseChange?.(this.session, 'completed');
        this.advancePhase();
      }
    }, 1000);
  }

  // Public method to get current session
  getCurrentSession(): FocusSession | null {
    return this.session;
  }

  // Public method to check if timer is running
  isRunning(): boolean {
    return this.session?.isActive || false;
  }

  private stopTimer(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private advancePhase(): void {
    if (!this.session) return;

    if (this.session.currentPhase === 'focus') {
      this.session.completedPomodoros++;
      this.session.totalFocusMinutes += this.session.preset.focus_min;
      
      // Emit pomodoro completed event
      this.emitEvent('pomodoro.completed', {
        session: this.session,
        completedPomodoros: this.session.completedPomodoros,
        totalFocusMinutes: this.session.totalFocusMinutes
      });
      
      // Check if we need a long break
      if (this.session.completedPomodoros % this.session.preset.long_break_every === 0) {
        this.session.currentPhase = 'long_break';
        this.session.timeRemaining = this.session.preset.long_break_min * 60;
      } else {
        this.session.currentPhase = 'short_break';
        this.session.timeRemaining = this.session.preset.short_break_min * 60;
      }
    } else if (this.session.currentPhase === 'short_break' || this.session.currentPhase === 'long_break') {
      this.session.currentPhase = 'focus';
      this.session.timeRemaining = this.session.preset.focus_min * 60;
    }

    this.startTimer();
  }

  getSession(): FocusSession | null {
    return this.session;
  }

  getTimeRemaining(): number {
    return this.session?.timeRemaining || 0;
  }

  getCurrentPhase(): FocusPhase {
    return this.session?.currentPhase || 'idle';
  }

  isActive(): boolean {
    return this.session?.isActive || false;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Get session hash for integrity validation
  getSessionHash(): string | null {
    return this.session?.sessionHash || null;
  }

  // Validate session integrity
  validateSession(): boolean {
    if (!this.session) return false;
    
    // Basic validation - in a real app, you'd add more checks
    const now = Date.now();
    const sessionStart = this.session.startedAt.getTime();
    const maxSessionDuration = 24 * 60 * 60 * 1000; // 24 hours
    
    if (now - sessionStart > maxSessionDuration) {
      return false;
    }
    
    return true;
  }
}


