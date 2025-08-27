'use client';

import { useState, useEffect, useRef } from 'react';
import { pwaManager, TimerState } from '@/lib/pwa';

interface OfflineTimerProps {
  initialDuration?: number;
  taskId?: string;
  onComplete?: (sessionData: any) => void;
}

export default function OfflineTimer({ 
  initialDuration = 25, 
  taskId, 
  onComplete 
}: OfflineTimerProps) {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'focus' | 'break' | 'long_break'>('focus');
  const [isOffline, setIsOffline] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load saved timer state
    loadTimerState();
    checkOnlineStatus();

    // Set up online/offline detection
    const handleOnline = () => {
      setIsOffline(false);
      syncTimerState();
    };

    const handleOffline = () => {
      setIsOffline(true);
      saveTimerState();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadTimerState = () => {
    const savedState = pwaManager.loadTimerState();
    if (savedState) {
      setTimerState(savedState);
      
      // Calculate time left based on saved state
      if (savedState.isRunning) {
        const elapsed = Math.floor((Date.now() - savedState.startTime) / 1000);
        const remaining = Math.max(0, savedState.duration - elapsed);
        setTimeLeft(remaining);
        setIsRunning(true);
        setPhase(savedState.phase);
        startTimer();
      } else {
        setTimeLeft(savedState.duration);
        setPhase(savedState.phase);
      }
    } else {
      // Create new timer state
      const newState: TimerState = {
        sessionId: Date.now().toString(),
        startTime: Date.now(),
        duration: initialDuration * 60,
        phase: 'focus',
        taskId,
        isRunning: false,
        lastSyncTime: Date.now()
      };
      setTimerState(newState);
      setTimeLeft(initialDuration * 60);
    }
  };

  const saveTimerState = () => {
    if (timerState) {
      const updatedState: TimerState = {
        ...timerState,
        duration: timeLeft,
        phase,
        isRunning,
        lastSyncTime: Date.now()
      };
      pwaManager.saveTimerState(updatedState);
      setTimerState(updatedState);
    }
  };

  const syncTimerState = async () => {
    if (timerState && !isOffline) {
      try {
        await fetch('/api/focus/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(timerState)
        });
      } catch (error) {
        console.error('Failed to sync timer state:', error);
      }
    }
  };

  const checkOnlineStatus = () => {
    setIsOffline(pwaManager.isOffline());
  };

  const startTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer completed
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setIsRunning(true);
    saveTimerState();
  };

  const pauseTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    saveTimerState();
  };

  const resetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setTimeLeft(initialDuration * 60);
    setPhase('focus');
    
    const newState: TimerState = {
      sessionId: Date.now().toString(),
      startTime: Date.now(),
      duration: initialDuration * 60,
      phase: 'focus',
      taskId,
      isRunning: false,
      lastSyncTime: Date.now()
    };
    pwaManager.saveTimerState(newState);
    setTimerState(newState);
  };

  const handleTimerComplete = async () => {
    const sessionData = {
      sessionId: timerState?.sessionId,
      focusMinutes: initialDuration,
      taskId,
      completedAt: new Date().toISOString()
    };

    // Queue for completion when online
    if (isOffline) {
      await pwaManager.queueFocusSession(sessionData);
    } else {
      // Complete immediately if online
      try {
        await fetch('/api/focus/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData)
        });
      } catch (error) {
        // Fallback to queue if online request fails
        await pwaManager.queueFocusSession(sessionData);
      }
    }

    onComplete?.(sessionData);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = (): string => {
    switch (phase) {
      case 'focus': return 'text-red-600';
      case 'break': return 'text-green-600';
      case 'long_break': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getPhaseName = (): string => {
    switch (phase) {
      case 'focus': return 'Focus';
      case 'break': return 'Break';
      case 'long_break': return 'Long Break';
      default: return 'Timer';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center">
        {/* Offline Indicator */}
        {isOffline && (
          <div className="mb-4 p-2 bg-orange-100 text-orange-800 rounded-lg text-sm">
            ⚠️ Working offline - Timer state will sync when online
          </div>
        )}

        {/* Timer Display */}
        <div className="mb-6">
          <div className={`text-6xl font-bold ${getPhaseColor()} mb-2`}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-lg text-gray-600">
            {getPhaseName()} Session
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${
                phase === 'focus' ? 'bg-red-500' : 
                phase === 'break' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ 
                width: `${((initialDuration * 60 - timeLeft) / (initialDuration * 60)) * 100}%` 
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4 mb-6">
          {!isRunning ? (
            <button
              onClick={startTimer}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Start
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Pause
            </button>
          )}
          
          <button
            onClick={resetTimer}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Status */}
        <div className="text-sm text-gray-500">
          {isRunning ? 'Timer is running...' : 'Timer is paused'}
          {isOffline && ' (Offline mode)'}
        </div>

        {/* Session Info */}
        {timerState && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <div>Session ID: {timerState.sessionId}</div>
            <div>Last Sync: {new Date(timerState.lastSyncTime).toLocaleTimeString()}</div>
            {timerState.taskId && <div>Task ID: {timerState.taskId}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
