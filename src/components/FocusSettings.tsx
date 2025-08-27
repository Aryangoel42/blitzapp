"use client";

import { useState, useEffect } from 'react';
import { getFocusPresets, getCurrentFocusPreset, setCurrentFocusPreset, addFocusPreset } from '@/lib/focusPresets';
import { getAntiDistractionConfig, updateAntiDistractionConfig } from '@/lib/antiDistraction';
import { getIntegrityConfig, updateIntegrityConfig } from '@/lib/integrityGuards';

type Props = {
  userId: string;
  onClose: () => void;
};

export function FocusSettings({ userId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'presets' | 'anti-distraction' | 'integrity'>('presets');
  const [presets, setPresets] = useState<any[]>([]);
  const [currentPreset, setCurrentPreset] = useState<any>(null);
  const [antiDistractionConfig, setAntiDistractionConfig] = useState(getAntiDistractionConfig());
  const [integrityConfig, setIntegrityConfig] = useState(getIntegrityConfig());

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = () => {
    const allPresets = getFocusPresets();
    const current = getCurrentFocusPreset();
    setPresets(allPresets);
    setCurrentPreset(current);
  };

  const handlePresetChange = (presetId: string) => {
    if (setCurrentFocusPreset(presetId)) {
      setCurrentPreset(getCurrentFocusPreset());
    }
  };

  const handleAntiDistractionChange = (key: string, value: any) => {
    const newConfig = { ...antiDistractionConfig, [key]: value };
    setAntiDistractionConfig(newConfig);
    updateAntiDistractionConfig(newConfig);
  };

  const handleIntegrityChange = (key: string, value: any) => {
    const newConfig = { ...integrityConfig, [key]: value };
    setIntegrityConfig(newConfig);
    updateIntegrityConfig(newConfig);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Focus Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex">
          <div className="w-64 bg-gray-50 dark:bg-gray-900 p-4">
            <nav className="space-y-2">
              {[
                { id: 'presets', label: 'Presets', icon: '⚙️' },
                { id: 'anti-distraction', label: 'Anti-Distraction', icon: '🚫' },
                { id: 'integrity', label: 'Integrity', icon: '🛡️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'presets' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Focus Presets</h3>
                <div className="grid gap-4">
                  {presets.map(preset => (
                    <div
                      key={preset.id}
                      className={`p-4 border rounded-lg ${
                        currentPreset?.id === preset.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{preset.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {preset.focus_min}min focus, {preset.short_break_min}min break
                          </p>
                        </div>
                        {currentPreset?.id !== preset.id && (
                          <button
                            onClick={() => handlePresetChange(preset.id)}
                            className="px-3 py-1 bg-brand-500 text-white rounded text-sm"
                          >
                            Use
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'anti-distraction' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Anti-Distraction Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Enable Anti-Distraction</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Detect when you leave the tab</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={antiDistractionConfig.enabled}
                      onChange={(e) => handleAntiDistractionChange('enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Show Banner</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Display warning banner when leaving tab</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={antiDistractionConfig.showBanner}
                      onChange={(e) => handleAntiDistractionChange('showBanner', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integrity' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Session Integrity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Require Foreground</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Only count time when app is visible</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={integrityConfig.requireForeground}
                      onChange={(e) => handleIntegrityChange('requireForeground', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Detect Clock Jumps</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Detect system time manipulation</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={integrityConfig.detectClockJumps}
                      onChange={(e) => handleIntegrityChange('detectClockJumps', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
