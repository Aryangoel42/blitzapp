// Focus sounds system with audio files and seamless playback

export type FocusSound = 'none' | 'ambience' | 'white-noise' | 'rain' | 'fire' | 'wind' | 'ocean' | 'forest';

export interface SoundConfig {
  volume: number;
  loop: boolean;
  fadeIn: number;
  fadeOut: number;
}

class FocusSoundManager {
  private audioContext: AudioContext | null = null;
  private currentSound: FocusSound = 'none';
  private currentAudio: HTMLAudioElement | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private volume = 0.5;
  private fadeInTime = 2000; // 2 seconds
  private fadeOutTime = 1000; // 1 second

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  async play(sound: FocusSound, config?: Partial<SoundConfig>): Promise<void> {
    if (sound === 'none') {
      await this.stop();
      return;
    }

    try {
      // Stop current sound if playing
      await this.stop();

      // Create audio element
      const audio = new Audio();
      audio.loop = config?.loop ?? true;
      audio.volume = config?.volume ?? this.volume;

      // Set audio source based on sound type
      const soundUrl = this.getSoundUrl(sound);
      if (!soundUrl) {
        console.warn(`Sound file not found for: ${sound}`);
        return;
      }

      audio.src = soundUrl;
      
      // Connect to audio context for advanced control
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (this.audioContext) {
        const source = this.audioContext.createMediaElementSource(audio);
        this.gainNode = this.audioContext.createGain();
        source.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        // Set initial volume to 0 for fade in
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      }

      // Start playing
      await audio.play();
      
      // Fade in
      if (this.gainNode && this.audioContext) {
        const fadeInDuration = config?.fadeIn ?? this.fadeInTime;
        this.gainNode.gain.linearRampToValueAtTime(
          audio.volume,
          this.audioContext.currentTime + fadeInDuration / 1000
        );
      }

      this.currentAudio = audio;
      this.currentSound = sound;
      this.isPlaying = true;

      console.log(`Playing focus sound: ${sound}`);
    } catch (error) {
      console.error('Failed to play focus sound:', error);
      this.currentSound = 'none';
    }
  }

  async stop(): Promise<void> {
    if (!this.currentAudio) return;

    try {
      // Fade out
      if (this.gainNode && this.audioContext) {
        const fadeOutDuration = this.fadeOutTime;
        this.gainNode.gain.linearRampToValueAtTime(
          0,
          this.audioContext.currentTime + fadeOutDuration / 1000
        );

        // Stop after fade out
        setTimeout(() => {
          this.currentAudio?.pause();
          this.currentAudio = null;
          this.isPlaying = false;
          this.currentSound = 'none';
        }, fadeOutDuration);
      } else {
        this.currentAudio.pause();
        this.currentAudio = null;
        this.isPlaying = false;
        this.currentSound = 'none';
      }
    } catch (error) {
      console.error('Failed to stop focus sound:', error);
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }

  getCurrentSound(): FocusSound {
    return this.currentSound;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  // Get current configuration
  getConfig(): { currentSound: FocusSound; volume: number } {
    return {
      currentSound: this.currentSound,
      volume: this.volume
    };
  }

  private getSoundUrl(sound: FocusSound): string | null {
    const soundUrls: Record<FocusSound, string> = {
      none: '',
      ambience: '/sounds/ambience.mp3',
      'white-noise': '/sounds/white-noise.mp3',
      rain: '/sounds/rain.mp3',
      fire: '/sounds/fire.mp3',
      wind: '/sounds/wind.mp3',
      ocean: '/sounds/ocean.mp3',
      forest: '/sounds/forest.mp3'
    };

    return soundUrls[sound] || null;
  }

  // Get available sounds
  getAvailableSounds(): { value: FocusSound; label: string; description: string }[] {
    return [
      { value: 'none', label: 'No Sound', description: 'Silent focus session' },
      { value: 'ambience', label: 'Ambience', description: 'Gentle background atmosphere' },
      { value: 'white-noise', label: 'White Noise', description: 'Consistent background noise' },
      { value: 'rain', label: 'Rain', description: 'Soothing rain sounds' },
      { value: 'fire', label: 'Fire', description: 'Crackling fireplace sounds' },
      { value: 'wind', label: 'Wind', description: 'Gentle wind through trees' },
      { value: 'ocean', label: 'Ocean', description: 'Calming ocean waves' },
      { value: 'forest', label: 'Forest', description: 'Nature sounds from the forest' }
    ];
  }
}

// Export singleton instance
export const focusSoundManager = new FocusSoundManager();

// Helper functions
export async function playFocusSound(sound: FocusSound, config?: Partial<SoundConfig>): Promise<void> {
  await focusSoundManager.play(sound, config);
}

export async function stopFocusSound(): Promise<void> {
  await focusSoundManager.stop();
}

export function setFocusSoundVolume(volume: number): void {
  focusSoundManager.setVolume(volume);
}

export function getCurrentFocusSound(): FocusSound {
  return focusSoundManager.getCurrentSound();
}

export function isFocusSoundPlaying(): boolean {
  return focusSoundManager.isCurrentlyPlaying();
}

export function getAvailableFocusSounds() {
  return focusSoundManager.getAvailableSounds();
}

// Add the missing function that the focus page expects
export function getFocusSoundManager() {
  return focusSoundManager;
}
