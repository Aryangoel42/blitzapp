"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface AccessibilityContextType {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  setFocusToElement: (elementId: string) => void;
  trapFocus: (containerRef: React.RefObject<HTMLElement>) => void;
  releaseFocusTrap: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [announcements, setAnnouncements] = useState<Array<{ id: string; message: string; priority: 'polite' | 'assertive' }>>([]);
  const focusTrapRef = useRef<HTMLElement | null>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);

  // Screen reader announcements
  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const id = `announcement-${Date.now()}`;
    setAnnouncements(prev => [...prev, { id, message, priority }]);
    
    // Remove announcement after it's been read
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));
    }, 1000);
  };

  // Focus management
  const setFocusToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  };

  // Focus trap for modals and dialogs
  const trapFocus = (containerRef: React.RefObject<HTMLElement>) => {
    if (!containerRef.current) return;

    focusTrapRef.current = containerRef.current;
    
    // Get all focusable elements within the container
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];
    
    focusableElementsRef.current = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors.join(', '))
    ) as HTMLElement[];

    if (focusableElementsRef.current.length > 0) {
      focusableElementsRef.current[0].focus();
    }
  };

  const releaseFocusTrap = () => {
    focusTrapRef.current = null;
    focusableElementsRef.current = [];
  };

  // Keyboard navigation for focus trap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!focusTrapRef.current || focusableElementsRef.current.length === 0) return;

      const { key, shiftKey } = event;
      
      if (key === 'Tab') {
        event.preventDefault();
        
        const currentIndex = focusableElementsRef.current.findIndex(
          element => element === document.activeElement
        );
        
        let nextIndex: number;
        
        if (shiftKey) {
          // Shift + Tab: move backwards
          nextIndex = currentIndex <= 0 
            ? focusableElementsRef.current.length - 1 
            : currentIndex - 1;
        } else {
          // Tab: move forwards
          nextIndex = currentIndex >= focusableElementsRef.current.length - 1 
            ? 0 
            : currentIndex + 1;
        }
        
        focusableElementsRef.current[nextIndex]?.focus();
      }
      
      if (key === 'Escape') {
        // Close modal or dialog
        const closeEvent = new CustomEvent('closeModal');
        focusTrapRef.current.dispatchEvent(closeEvent);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      const { key, ctrlKey, altKey, metaKey } = event;

      // Quick add shortcut: Ctrl/Cmd + N
      if ((ctrlKey || metaKey) && key === 'n' && !altKey) {
        event.preventDefault();
        const quickAddButton = document.querySelector('[aria-label="Quick Add"]') as HTMLElement;
        quickAddButton?.click();
        announceToScreenReader('Quick add dialog opened');
      }

      // Focus search: Ctrl/Cmd + K
      if ((ctrlKey || metaKey) && key === 'k' && !altKey) {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          announceToScreenReader('Search input focused');
        }
      }

      // Navigate to today: Ctrl/Cmd + 1
      if ((ctrlKey || metaKey) && key === '1' && !altKey) {
        event.preventDefault();
        window.location.href = '/today';
        announceToScreenReader('Navigating to today');
      }

      // Navigate to focus: Ctrl/Cmd + 2
      if ((ctrlKey || metaKey) && key === '2' && !altKey) {
        event.preventDefault();
        window.location.href = '/focus';
        announceToScreenReader('Navigating to focus timer');
      }

      // Navigate to analytics: Ctrl/Cmd + 3
      if ((ctrlKey || metaKey) && key === '3' && !altKey) {
        event.preventDefault();
        window.location.href = '/analytics';
        announceToScreenReader('Navigating to analytics');
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const contextValue: AccessibilityContextType = {
    announceToScreenReader,
    setFocusToElement,
    trapFocus,
    releaseFocusTrap,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      
      {/* Live regions for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcements
          .filter(a => a.priority === 'polite')
          .map(announcement => (
            <div key={announcement.id}>{announcement.message}</div>
          ))}
      </div>
      
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcements
          .filter(a => a.priority === 'assertive')
          .map(announcement => (
            <div key={announcement.id}>{announcement.message}</div>
          ))}
      </div>
    </AccessibilityContext.Provider>
  );
}
