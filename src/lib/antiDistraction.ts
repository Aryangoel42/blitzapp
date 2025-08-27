// Anti-distraction system with tab detection and notifications

export interface DistractionConfig {
  enabled: boolean;
  showBanner: boolean;
  showPushNotification: boolean;
  bannerMessage: string;
  pushMessage: string;
  cooldownSeconds: number;
}

class AntiDistractionManager {
  private config: DistractionConfig = {
    enabled: true,
    showBanner: true,
    showPushNotification: false,
    bannerMessage: "Still focusing? Don't lose your momentum!",
    pushMessage: "Your focus session is still running. Come back to stay on track!",
    cooldownSeconds: 30
  };
  
  private isActive = false;
  private lastNotificationTime = 0;
  private bannerElement: HTMLDivElement | null = null;
  private visibilityChangeHandler: (() => void) | null = null;
  private blurHandler: (() => void) | null = null;

  constructor() {
    this.loadConfig();
    this.setupEventListeners();
  }

  private loadConfig(): void {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('anti-distraction-config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    }
  }

  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('anti-distraction-config', JSON.stringify(this.config));
    }
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Handle visibility change (tab switching, minimizing)
    this.visibilityChangeHandler = () => {
      if (this.isActive && this.config.enabled) {
        if (document.hidden) {
          this.handleDistraction();
        } else {
          this.hideBanner();
        }
      }
    };

    // Handle window blur (clicking outside browser)
    this.blurHandler = () => {
      if (this.isActive && this.config.enabled) {
        this.handleDistraction();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    window.addEventListener('blur', this.blurHandler);
  }

  private handleDistraction(): void {
    const now = Date.now();
    const timeSinceLastNotification = (now - this.lastNotificationTime) / 1000;

    // Check cooldown
    if (timeSinceLastNotification < this.config.cooldownSeconds) {
      return;
    }

    this.lastNotificationTime = now;

    // Show banner
    if (this.config.showBanner) {
      this.showBanner();
    }

    // Show push notification
    if (this.config.showPushNotification) {
      this.showPushNotification();
    }
  }

  private showBanner(): void {
    if (this.bannerElement) {
      this.hideBanner();
    }

    this.bannerElement = document.createElement('div');
    this.bannerElement.className = 'fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-3 shadow-lg transform transition-transform duration-300';
    this.bannerElement.style.transform = 'translateY(-100%)';
    
    this.bannerElement.innerHTML = `
      <div class="flex items-center justify-between max-w-6xl mx-auto">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="font-medium">${this.config.bannerMessage}</span>
        </div>
        <button 
          onclick="this.parentElement.parentElement.remove()"
          class="text-white hover:text-gray-200 transition-colors"
          aria-label="Dismiss banner"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(this.bannerElement);

    // Animate in
    requestAnimationFrame(() => {
      if (this.bannerElement) {
        this.bannerElement.style.transform = 'translateY(0)';
      }
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideBanner();
    }, 10000);
  }

  private hideBanner(): void {
    if (this.bannerElement) {
      this.bannerElement.style.transform = 'translateY(-100%)';
      setTimeout(() => {
        if (this.bannerElement && this.bannerElement.parentNode) {
          this.bannerElement.parentNode.removeChild(this.bannerElement);
          this.bannerElement = null;
        }
      }, 300);
    }
  }

  private async showPushNotification(): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification('Focus Session Active', {
        body: this.config.pushMessage,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'focus-distraction',
        requireInteraction: false,
        silent: false
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click to focus the window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show push notification:', error);
    }
  }

  start(): void {
    this.isActive = true;
    console.log('Anti-distraction system activated');
  }

  stop(): void {
    this.isActive = false;
    this.hideBanner();
    console.log('Anti-distraction system deactivated');
  }

  updateConfig(newConfig: Partial<DistractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  getConfig(): DistractionConfig {
    return { ...this.config };
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  // Cleanup
  destroy(): void {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
    if (this.blurHandler) {
      window.removeEventListener('blur', this.blurHandler);
    }
    this.hideBanner();
  }
}

// Export singleton instance
export const antiDistractionManager = new AntiDistractionManager();

// Helper functions
export function startAntiDistraction(): void {
  antiDistractionManager.start();
}

export function stopAntiDistraction(): void {
  antiDistractionManager.stop();
}

export function updateAntiDistractionConfig(config: Partial<DistractionConfig>): void {
  antiDistractionManager.updateConfig(config);
}

export function getAntiDistractionConfig(): DistractionConfig {
  return antiDistractionManager.getConfig();
}

export async function requestNotificationPermission(): Promise<boolean> {
  return antiDistractionManager.requestNotificationPermission();
}
