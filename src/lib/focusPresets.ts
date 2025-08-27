// Focus presets with persistence and user customization

export interface FocusPreset {
  id: string;
  name: string;
  focus_min: number;
  short_break_min: number;
  long_break_min: number;
  long_break_every: number;
  isDefault?: boolean;
  isCustom?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface PresetConfig {
  currentPresetId: string;
  presets: FocusPreset[];
}

class FocusPresetManager {
  private config: PresetConfig;
  private defaultPresets: FocusPreset[] = [
    {
      id: 'default',
      name: 'Default',
      focus_min: 25,
      short_break_min: 5,
      long_break_min: 15,
      long_break_every: 4,
      isDefault: true,
      isCustom: false
    },
    {
      id: 'deep-work',
      name: 'Deep Work',
      focus_min: 50,
      short_break_min: 10,
      long_break_min: 20,
      long_break_every: 3,
      isDefault: true,
      isCustom: false
    },
    {
      id: 'quick-sprints',
      name: 'Quick Sprints',
      focus_min: 15,
      short_break_min: 3,
      long_break_min: 10,
      long_break_every: 4,
      isDefault: true,
      isCustom: false
    }
  ];

  constructor() {
    this.config = {
      currentPresetId: 'default',
      presets: [...this.defaultPresets]
    };
    this.loadConfig();
  }

  private loadConfig(): void {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('focus-presets-config');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure all default presets are available
          const customPresets = parsed.presets.filter((p: FocusPreset) => p.isCustom);
          this.config = {
            currentPresetId: parsed.currentPresetId || 'default',
            presets: [...this.defaultPresets, ...customPresets]
          };
        }
      } catch (error) {
        console.error('Failed to load focus presets config:', error);
      }
    }
  }

  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('focus-presets-config', JSON.stringify(this.config));
      } catch (error) {
        console.error('Failed to save focus presets config:', error);
      }
    }
  }

  getPresets(): FocusPreset[] {
    return [...this.config.presets];
  }

  getCurrentPreset(): FocusPreset | null {
    return this.config.presets.find(p => p.id === this.config.currentPresetId) || null;
  }

  setCurrentPreset(presetId: string): boolean {
    const preset = this.config.presets.find(p => p.id === presetId);
    if (preset) {
      this.config.currentPresetId = presetId;
      this.saveConfig();
      return true;
    }
    return false;
  }

  addPreset(preset: Omit<FocusPreset, 'id' | 'created_at' | 'updated_at'>): FocusPreset {
    const newPreset: FocusPreset = {
      ...preset,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    this.config.presets.push(newPreset);
    this.saveConfig();
    return newPreset;
  }

  updatePreset(presetId: string, updates: Partial<FocusPreset>): FocusPreset | null {
    const presetIndex = this.config.presets.findIndex(p => p.id === presetId);
    if (presetIndex === -1) return null;

    const updatedPreset: FocusPreset = {
      ...this.config.presets[presetIndex],
      ...updates,
      updated_at: new Date()
    };

    this.config.presets[presetIndex] = updatedPreset;
    this.saveConfig();
    return updatedPreset;
  }

  deletePreset(presetId: string): boolean {
    const preset = this.config.presets.find(p => p.id === presetId);
    if (!preset || preset.isDefault) {
      return false; // Cannot delete default presets
    }

    this.config.presets = this.config.presets.filter(p => p.id !== presetId);
    
    // If deleted preset was current, switch to default
    if (this.config.currentPresetId === presetId) {
      this.config.currentPresetId = 'default';
    }
    
    this.saveConfig();
    return true;
  }

  duplicatePreset(presetId: string): FocusPreset | null {
    const original = this.config.presets.find(p => p.id === presetId);
    if (!original) return null;

    const duplicated: FocusPreset = {
      ...original,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${original.name} (Copy)`,
      isCustom: true,
      isDefault: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    this.config.presets.push(duplicated);
    this.saveConfig();
    return duplicated;
  }

  resetToDefaults(): void {
    this.config = {
      currentPresetId: 'default',
      presets: [...this.defaultPresets]
    };
    this.saveConfig();
  }

  exportPresets(): string {
    const customPresets = this.config.presets.filter(p => p.isCustom);
    return JSON.stringify(customPresets, null, 2);
  }

  importPresets(presetsJson: string): boolean {
    try {
      const presets = JSON.parse(presetsJson) as FocusPreset[];
      
      // Validate presets
      for (const preset of presets) {
        if (!preset.name || !preset.focus_min || !preset.short_break_min || !preset.long_break_min || !preset.long_break_every) {
          throw new Error('Invalid preset format');
        }
      }

      // Remove existing custom presets
      this.config.presets = this.config.presets.filter(p => !p.isCustom);
      
      // Add imported presets
      const importedPresets = presets.map(preset => ({
        ...preset,
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isCustom: true,
        created_at: new Date(),
        updated_at: new Date()
      }));

      this.config.presets.push(...importedPresets);
      this.saveConfig();
      return true;
    } catch (error) {
      console.error('Failed to import presets:', error);
      return false;
    }
  }

  // Sync with server
  async syncWithServer(userId: string): Promise<void> {
    try {
      // Load presets from server
      const response = await fetch(`/api/focus/presets?userId=${userId}`);
      if (response.ok) {
        const serverPresets = await response.json();
        
        // Merge server presets with local custom presets
        const localCustomPresets = this.config.presets.filter(p => p.isCustom);
        this.config.presets = [...this.defaultPresets, ...localCustomPresets, ...serverPresets];
        this.saveConfig();
      }
    } catch (error) {
      console.error('Failed to sync presets with server:', error);
    }
  }

  // Save to server
  async saveToServer(userId: string): Promise<void> {
    try {
      const customPresets = this.config.presets.filter(p => p.isCustom);
      
      await fetch('/api/focus/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          presets: customPresets
        })
      });
    } catch (error) {
      console.error('Failed to save presets to server:', error);
    }
  }
}

// Export singleton instance
export const focusPresetManager = new FocusPresetManager();

// Helper functions
export function getFocusPresets(): FocusPreset[] {
  return focusPresetManager.getPresets();
}

export function getCurrentFocusPreset(): FocusPreset | null {
  return focusPresetManager.getCurrentPreset();
}

export function setCurrentFocusPreset(presetId: string): boolean {
  return focusPresetManager.setCurrentPreset(presetId);
}

export function addFocusPreset(preset: Omit<FocusPreset, 'id' | 'created_at' | 'updated_at'>): FocusPreset {
  return focusPresetManager.addPreset(preset);
}

export function updateFocusPreset(presetId: string, updates: Partial<FocusPreset>): FocusPreset | null {
  return focusPresetManager.updatePreset(presetId, updates);
}

export function deleteFocusPreset(presetId: string): boolean {
  return focusPresetManager.deletePreset(presetId);
}

export function duplicateFocusPreset(presetId: string): FocusPreset | null {
  return focusPresetManager.duplicatePreset(presetId);
}

export function resetFocusPresets(): void {
  focusPresetManager.resetToDefaults();
}

export function exportFocusPresets(): string {
  return focusPresetManager.exportPresets();
}

export function importFocusPresets(presetsJson: string): boolean {
  return focusPresetManager.importPresets(presetsJson);
}

export async function syncFocusPresets(userId: string): Promise<void> {
  await focusPresetManager.syncWithServer(userId);
}

export async function saveFocusPresets(userId: string): Promise<void> {
  await focusPresetManager.saveToServer(userId);
}
