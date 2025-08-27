"use client";

import { useEffect, useState, useRef } from 'react';
import { FocusTimer, FocusSession, FocusPhase, DEFAULT_PRESETS, FocusPreset } from '@/lib/focusMachine';
import { playFocusSound, stopFocusSound, getCurrentFocusSound, getAvailableFocusSounds } from '@/lib/focusSounds';
import { startAntiDistraction, stopAntiDistraction, getAntiDistractionConfig, updateAntiDistractionConfig } from '@/lib/antiDistraction';
import { startIntegrityGuard, stopIntegrityGuard, checkSessionIntegrity, getIntegrityConfig, updateIntegrityConfig } from '@/lib/integrityGuards';
import { getCurrentFocusPreset, getFocusPresets, addFocusPreset } from '@/lib/focusPresets';

type Task = any;

export default function FocusPage() {
  const userId = 'demo-user';
  const [timer, setTimer] = useState<FocusTimer | null>(null);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<FocusPreset>(DEFAULT_PRESETS[0]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSound, setSelectedSound] = useState<string>('none');
  const [volume, setVolume] = useState(0.5);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<string>('');
  const [antiDistractionConfig, setAntiDistractionConfig] = useState(getAntiDistractionConfig());
  const [integrityConfig, setIntegrityConfig] = useState(getIntegrityConfig());
  
  const timerDisplayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focusTimer = new FocusTimer(
      (session) => {
        setSession(session);
        localStorage.setItem('focus-session', JSON.stringify(session));
      },
      (session, event) => {
        if (event === 'completed') {
          // Send completed event to server
          fetch('/api/focus/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              session, 
              userId,
              sessionId: session.id,
              focusMinutes: session.totalFocusMinutes,
              sessionHash: session.sessionHash,
              startedAt: session.startedAt.toISOString()
            })
          });
        } else if (event === 'aborted') {
          console.log('Focus session aborted');
        } else if (event === 'skipped') {
          console.log('Phase skipped');
        }
        setSession(session);
        localStorage.setItem('focus-session', JSON.stringify(session));
      }
    );

    // Add event listeners for pomodoro events
    focusTimer.addEventListener('pomodoro.completed', (data) => {
      console.log('Pomodoro completed:', data);
      // Stop anti-distraction and integrity guard
      stopAntiDistraction();
      stopIntegrityGuard();
    });

    focusTimer.addEventListener('pomodoro.aborted', (data) => {
      console.log('Pomodoro aborted:', data);
      // Stop anti-distraction and integrity guard
      stopAntiDistraction();
      stopIntegrityGuard();
    });

    setTimer(focusTimer);

    // Restore session from localStorage
    const saved = localStorage.getItem('focus-session');
    if (saved) {
      try {
        const savedSession = JSON.parse(saved);
        if (savedSession && savedSession.isActive) {
          setSession(savedSession);
          setSelectedPreset(savedSession.preset);
          focusTimer.start(savedSession.taskId, savedSession.preset);
        }
      } catch (error) {
        console.error('Failed to restore focus session:', error);
        localStorage.removeItem('focus-session');
      }
    }

    // Load tasks
    fetch(`/api/tasks?userId=${userId}&status=todo`)
      .then(res => res.json())
      .then(setTasks)
      .catch(error => {
        console.error('Failed to load tasks:', error);
        setTasks([]);
      });

    // Load sound config
    const savedVolume = localStorage.getItem('focus-sound-volume');
    if (savedVolume) {
      setVolume(parseFloat(savedVolume));
    }

    const savedSound = localStorage.getItem('focus-sound-current');
    if (savedSound) {
      setSelectedSound(savedSound);
    }

    return () => {
      focusTimer.stop();
    };
  }, [userId]);

  // Integrity check interval
  useEffect(() => {
    if (session?.isActive) {
      const interval = setInterval(() => {
        const integrity = checkSessionIntegrity();
        if (!integrity.isValid) {
          setIntegrityStatus(integrity.reason || 'Session invalidated');
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [session?.isActive]);

  const handleStart = async () => {
    if (!timer) return;
    
    const taskId = selectedTask?.id;
    const session = timer.start(taskId, selectedPreset);
    setSession(session);
    
    // Start anti-distraction system
    startAntiDistraction();
    
    // Start integrity guard
    startIntegrityGuard();
    
    // Start sound if selected
    if (selectedSound !== 'none') {
      await playFocusSound(selectedSound as any, { volume });
    }
  };

  const handlePause = () => {
    timer?.pause();
  };

  const handleResume = () => {
    timer?.resume();
  };

  const handleStop = () => {
    timer?.stop();
    setSession(null);
    stopFocusSound();
    stopAntiDistraction();
    stopIntegrityGuard();
    localStorage.removeItem('focus-session');
  };

  const handleSkip = () => {
    timer?.skip();
  };

  const handleSoundChange = async (sound: string) => {
    setSelectedSound(sound);
    localStorage.setItem('focus-sound-current', sound);
    
    if (sound === 'none') {
      await stopFocusSound();
    } else {
      await playFocusSound(sound as any, { volume });
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    localStorage.setItem('focus-sound-volume', newVolume.toString());
    if (selectedSound !== 'none') {
      playFocusSound(selectedSound as any, { volume: newVolume });
    }
  };

  const handleAntiDistractionConfigChange = (config: Partial<typeof antiDistractionConfig>) => {
    const newConfig = { ...antiDistractionConfig, ...config };
    setAntiDistractionConfig(newConfig);
    updateAntiDistractionConfig(newConfig);
  };

  const handleIntegrityConfigChange = (config: Partial<typeof integrityConfig>) => {
    const newConfig = { ...integrityConfig, ...config };
    setIntegrityConfig(newConfig);
    updateIntegrityConfig(newConfig);
  };

  const getPhaseColor = (phase: FocusPhase): string => {
    switch (phase) {
      case 'focus': return 'bg-red-500';
      case 'short_break': return 'bg-green-500';
      case 'long_break': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getPhaseText = (phase: FocusPhase): string => {
    switch (phase) {
      case 'focus': return 'Focus Time';
      case 'short_break': return 'Short Break';
      case 'long_break': return 'Long Break';
      default: return 'Ready to Focus';
    }
  };

  const formatTimeForScreenReader = (timeRemaining: number): string => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes} minutes and ${seconds} seconds remaining`;
  };

  const availableSounds = getAvailableFocusSounds();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-center">Focus Timer</h1>

      {/* Timer Display */}
      <div className="text-center space-y-4" role="timer" aria-live="polite" aria-atomic="true">
        <div 
          ref={timerDisplayRef}
          className={`text-6xl font-mono font-bold ${session ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}
          aria-label={session ? formatTimeForScreenReader(session.timeRemaining) : '25 minutes 0 seconds'}
        >
          {session ? timer?.formatTime(session.timeRemaining) : '25:00'}
        </div>
        
        <div className="flex items-center justify-center gap-2">
          <div 
            className={`w-4 h-4 rounded-full ${session ? getPhaseColor(session.currentPhase) : 'bg-gray-400'}`}
            aria-hidden="true"
          />
          <span className="text-lg font-medium" aria-live="polite">
            {session ? getPhaseText(session.currentPhase) : 'Select a preset to start'}
          </span>
        </div>

        {selectedTask && (
          <div className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            Working on: {selectedTask.title}
          </div>
        )}

        {session && (
          <div className="text-sm text-gray-500" aria-live="polite">
            Pomodoro {session.completedPomodoros + 1} of {session.preset.long_break_every}
          </div>
        )}

        {integrityStatus && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            ⚠️ {integrityStatus}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4" role="group" aria-label="Timer controls">
        {!session ? (
          <button
            onClick={handleStart}
            className="bg-brand-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            aria-label="Start focus session"
          >
            Start Focus Session
          </button>
        ) : (
          <div className="flex gap-3">
            {session.isActive ? (
              <button
                onClick={handlePause}
                className="bg-yellow-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                aria-label="Pause focus session"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                aria-label="Resume focus session"
              >
                Resume
              </button>
            )}
            <button
              onClick={handleSkip}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Skip current phase"
            >
              Skip
            </button>
            <button
              onClick={handleStop}
              className="bg-red-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Stop focus session"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-6" role="region" aria-label="Timer settings">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Settings</h2>
        <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-sm text-blue-600 hover:text-blue-800"
        >
            {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
        </button>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Basic Settings */}
          <div className="space-y-6">
            {/* Preset Selection */}
            <div>
              <label htmlFor="preset-select" className="block text-sm font-medium mb-2">
                Preset
              </label>
              <select
                id="preset-select"
                value={DEFAULT_PRESETS.findIndex(p => p.name === selectedPreset.name)}
                onChange={(e) => setSelectedPreset(DEFAULT_PRESETS[Number(e.target.value)])}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                disabled={!!session}
                aria-describedby={session ? "preset-disabled-help" : undefined}
              >
                {DEFAULT_PRESETS.map((preset, index) => (
                  <option key={preset.name} value={index}>
                    {preset.name} ({preset.focus_min}m focus, {preset.short_break_min}m break)
                  </option>
                ))}
              </select>
              {session && (
                <div id="preset-disabled-help" className="text-sm text-gray-500 mt-1">
                  Preset cannot be changed during an active session
                </div>
              )}
            </div>

            {/* Task Selection */}
            <div>
              <label htmlFor="task-select" className="block text-sm font-medium mb-2">
                Task (Optional)
              </label>
              <div className="flex gap-2">
                <button
                  id="task-select"
                  onClick={() => setShowTaskSelector(!showTaskSelector)}
                  className="flex-1 text-left rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  aria-expanded={showTaskSelector}
                  aria-haspopup="listbox"
                  aria-describedby="task-help"
                >
                  {selectedTask ? selectedTask.title : 'Select a task...'}
                </button>
                {selectedTask && (
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                    aria-label="Clear selected task"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              <div id="task-help" className="text-sm text-gray-500 mt-1">
                Select a task to work on during your focus session
              </div>
              
              {showTaskSelector && (
                <div 
                  className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded bg-white dark:border-gray-700 dark:bg-gray-900"
                  role="listbox"
                  aria-label="Available tasks"
                >
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task);
                        setShowTaskSelector(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                      role="option"
                      aria-selected={selectedTask?.id === task.id}
                    >
                      <div className="font-medium">{task.title}</div>
                      <div className="text-sm text-gray-500">
                        {task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sound Settings */}
          <div className="space-y-6">
            {/* Sound Settings */}
            <div>
              <label htmlFor="sound-select" className="block text-sm font-medium mb-2">
                Focus Sound
              </label>
              <select
                id="sound-select"
                value={selectedSound}
                onChange={(e) => handleSoundChange(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                {availableSounds.map(sound => (
                  <option key={sound.value} value={sound.value}>
                    {sound.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Volume Control */}
            <div>
              <label htmlFor="volume-slider" className="block text-sm font-medium mb-2">
                Volume: {Math.round(volume * 100)}%
              </label>
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(volume * 100)}
                aria-valuetext={`${Math.round(volume * 100)} percent`}
              />
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvancedSettings && (
          <div className="border-t pt-6 space-y-6">
            <h3 className="text-lg font-medium">Advanced Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Anti-Distraction Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Anti-Distraction</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={antiDistractionConfig.enabled}
                      onChange={(e) => handleAntiDistractionConfigChange({ enabled: e.target.checked })}
                      className="mr-2"
                    />
                    Enable anti-distraction system
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={antiDistractionConfig.showBanner}
                      onChange={(e) => handleAntiDistractionConfigChange({ showBanner: e.target.checked })}
                      className="mr-2"
                    />
                    Show banner when leaving tab
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={antiDistractionConfig.showPushNotification}
                      onChange={(e) => handleAntiDistractionConfigChange({ showPushNotification: e.target.checked })}
                      className="mr-2"
                    />
                    Send push notifications
                  </label>
                </div>
              </div>

              {/* Integrity Guard Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Integrity Guard</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={integrityConfig.requireForeground}
                      onChange={(e) => handleIntegrityConfigChange({ requireForeground: e.target.checked })}
                      className="mr-2"
                    />
                    Require foreground focus
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={integrityConfig.detectClockJumps}
                      onChange={(e) => handleIntegrityConfigChange({ detectClockJumps: e.target.checked })}
                      className="mr-2"
                    />
                    Detect clock manipulation
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


