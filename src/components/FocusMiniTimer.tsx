"use client";

import { useEffect, useState, useRef } from 'react';
import { FocusTimer, FocusSession, FocusPhase } from '@/lib/focusMachine';
import { playFocusSound, stopFocusSound, getCurrentFocusSound, getAvailableFocusSounds } from '@/lib/focusSounds';
import { startAntiDistraction, stopAntiDistraction } from '@/lib/antiDistraction';
import { startIntegrityGuard, stopIntegrityGuard, checkSessionIntegrity } from '@/lib/integrityGuards';
import { getCurrentFocusPreset, getFocusPresets } from '@/lib/focusPresets';

type Props = {
  userId: string;
};

export function FocusMiniTimer({ userId }: Props) {
  const [timer, setTimer] = useState<FocusTimer | null>(null);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [currentSound, setCurrentSound] = useState<string>('none');
  const [volume, setVolume] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focusTimer = new FocusTimer(
      (session) => {
        setSession(session);
        // Auto-save session to localStorage for persistence
        localStorage.setItem('focus-session', JSON.stringify(session));
      },
      (session, event) => {
        // Handle phase changes
        if (event === 'completed') {
          // Validate session integrity before awarding points
          const integrity = checkSessionIntegrity();
          if (integrity.isValid) {
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
          } else {
            setIntegrityStatus(integrity.reason || 'Session invalidated');
          }
        } else if (event === 'aborted') {
          // Session was aborted
          console.log('Focus session aborted');
        }
        setSession(session);
        localStorage.setItem('focus-session', JSON.stringify(session));
      }
    );

    // Add event listeners for pomodoro events
    focusTimer.addEventListener('pomodoro.completed', (data) => {
      console.log('Pomodoro completed:', data);
      // You can add additional logic here for completed sessions
    });

    focusTimer.addEventListener('pomodoro.aborted', (data) => {
      console.log('Pomodoro aborted:', data);
      // You can add additional logic here for aborted sessions
    });

    setTimer(focusTimer);

    // Restore session from localStorage
    const saved = localStorage.getItem('focus-session');
    if (saved) {
      try {
        const savedSession = JSON.parse(saved);
        if (savedSession && savedSession.isActive) {
          setSession(savedSession);
          // Restore timer state
          focusTimer.start(savedSession.taskId, savedSession.preset);
        }
      } catch (error) {
        console.error('Failed to restore focus session:', error);
        localStorage.removeItem('focus-session');
      }
    }

    // Load sound settings
    const savedVolume = localStorage.getItem('focus-sound-volume');
    if (savedVolume) {
      setVolume(parseFloat(savedVolume));
    }

    // Load position from localStorage
    const savedPosition = localStorage.getItem('focus-timer-position');
    if (savedPosition) {
      try {
        setPosition(JSON.parse(savedPosition));
      } catch (error) {
        console.error('Failed to restore timer position:', error);
      }
    }

    return () => {
      focusTimer.stop();
    };
  }, [userId]);

  useEffect(() => {
    if (session?.taskId) {
      // Fetch task title
      fetch(`/api/tasks?userId=${userId}&id=${session.taskId}`)
        .then(res => res.json())
        .then(tasks => {
          if (tasks.length > 0) {
            setTaskTitle(tasks[0].title);
          }
        })
        .catch(error => {
          console.error('Failed to fetch task title:', error);
        });
    }
  }, [session?.taskId, userId]);

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

    const preset = getCurrentFocusPreset();
    if (!preset) {
      console.error('No focus preset selected');
      return;
    }

    // Start integrity guard
    startIntegrityGuard();
    
    // Start anti-distraction
    startAntiDistraction();
    
    // Start timer
    timer.start(session?.taskId, preset);
    
    // Start focus sound if configured
    if (currentSound !== 'none') {
      await playFocusSound(currentSound as any, { volume });
    }
  };

  const handlePause = () => {
    if (!timer) return;
    timer.pause();
  };

  const handleResume = () => {
    if (!timer) return;
    timer.resume();
  };

  const handleStop = async () => {
    if (!timer) return;
    
    timer.stop();
    setSession(null);
    localStorage.removeItem('focus-session');
    
    // Stop all systems
    stopIntegrityGuard();
    stopAntiDistraction();
    await stopFocusSound();
  };

  const handleSkip = () => {
    if (!timer) return;
    timer.skip();
  };

  const handleSoundChange = async (sound: string) => {
    setCurrentSound(sound);
    if (sound === 'none') {
      await stopFocusSound();
        } else {
      await playFocusSound(sound as any, { volume });
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    localStorage.setItem('focus-sound-volume', newVolume.toString());
    // Update current sound volume
    if (currentSound !== 'none') {
      playFocusSound(currentSound as any, { volume: newVolume });
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = Math.max(0, Math.min(window.innerWidth - 64, e.clientX - 32));
    const newY = Math.max(0, Math.min(window.innerHeight - 64, e.clientY - 32));
    
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Save position to localStorage
    localStorage.setItem('focus-timer-position', JSON.stringify(position));
  };

  if (!timer || !session) return null;

  const getPhaseColor = (phase: FocusPhase): string => {
    switch (phase) {
      case 'focus': return 'bg-red-500';
      case 'short_break': return 'bg-green-500';
      case 'long_break': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPhaseText = (phase: FocusPhase): string => {
    switch (phase) {
      case 'focus': return 'Focus';
      case 'short_break': return 'Break';
      case 'long_break': return 'Long Break';
      default: return 'Idle';
    }
  };

  const availableSounds = getAvailableFocusSounds();

  return (
    <div 
      ref={dragRef}
      className="fixed z-50 cursor-move"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleDragStart}
      onMouseMove={handleDrag}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
    >
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg border transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-16'
      }`}>
        {/* Collapsed view */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-16 h-16 flex items-center justify-center relative"
            aria-label="Expand focus timer"
          >
            <div className={`w-3 h-3 rounded-full ${getPhaseColor(session.currentPhase)}`} />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono">
              {timer.formatTime(session.timeRemaining)}
            </div>
            {integrityStatus && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            )}
          </button>
        )}

        {/* Expanded view */}
        {isExpanded && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getPhaseColor(session.currentPhase)}`} />
                <span className="text-sm font-medium">{getPhaseText(session.currentPhase)}</span>
                {integrityStatus && (
                  <div className="w-2 h-2 bg-red-500 rounded-full" title={integrityStatus} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Settings"
                >
                  ⚙️
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Collapse"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-mono font-bold">
                {timer.formatTime(session.timeRemaining)}
              </div>
              {taskTitle && (
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {taskTitle}
                </div>
              )}
              <div className="text-xs text-gray-500">
                Pomodoro {session.completedPomodoros + 1}
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <label className="block text-sm font-medium mb-1">Focus Sound</label>
                  <select
                    value={currentSound}
                    onChange={(e) => handleSoundChange(e.target.value)}
                    className="w-full text-sm border rounded px-2 py-1"
                  >
                    {availableSounds.map(sound => (
                      <option key={sound.value} value={sound.value}>
                        {sound.label}
                      </option>
                    ))}
        </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {session.isActive ? (
                <button
                  onClick={handlePause}
                  className="flex-1 bg-yellow-500 text-white px-3 py-1.5 rounded text-sm"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="flex-1 bg-green-500 text-white px-3 py-1.5 rounded text-sm"
                >
                  Resume
                </button>
              )}
              <button
                onClick={handleSkip}
                className="flex-1 bg-gray-500 text-white px-3 py-1.5 rounded text-sm"
              >
                Skip
              </button>
              <button
                onClick={handleStop}
                className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded text-sm"
              >
                Stop
              </button>
            </div>

            {integrityStatus && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                ⚠️ {integrityStatus}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


