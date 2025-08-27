"use client";

import { useState } from 'react';
import { useAccessibility } from './AccessibilityProvider';

export function AccessibilityHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const { announceToScreenReader } = useAccessibility();

  const handleToggle = () => {
    setIsOpen(!isOpen);
    announceToScreenReader(isOpen ? 'Accessibility help closed' : 'Accessibility help opened');
  };

  const keyboardShortcuts = [
    { key: 'Ctrl/Cmd + N', description: 'Open quick add dialog' },
    { key: 'Ctrl/Cmd + K', description: 'Focus search input' },
    { key: 'Ctrl/Cmd + 1', description: 'Navigate to Today' },
    { key: 'Ctrl/Cmd + 2', description: 'Navigate to Focus Timer' },
    { key: 'Ctrl/Cmd + 3', description: 'Navigate to Analytics' },
    { key: 'Tab', description: 'Navigate between interactive elements' },
    { key: 'Shift + Tab', description: 'Navigate backwards' },
    { key: 'Enter', description: 'Activate buttons and links' },
    { key: 'Space', description: 'Activate buttons and checkboxes' },
    { key: 'Escape', description: 'Close modals and dialogs' },
    { key: 'Ctrl/Cmd + Enter', description: 'Submit forms (in modals)' },
  ];

  const accessibilityFeatures = [
    'Skip to main content link (Tab to focus)',
    'Screen reader announcements for all actions',
    'Focus management and keyboard navigation',
    'ARIA labels and descriptions',
    'High contrast mode support',
    'Reduced motion support',
    'Focus indicators on all interactive elements',
    'Semantic HTML structure',
    'Live regions for dynamic content',
    'Form validation with error announcements',
  ];

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <button
        onClick={handleToggle}
        className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        aria-label="Accessibility help"
        aria-expanded={isOpen}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-16 left-0 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Accessibility Help</h3>
            <button
              onClick={handleToggle}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              aria-label="Close accessibility help"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Keyboard Shortcuts</h4>
              <div className="space-y-1 text-sm">
                {keyboardShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex justify-between">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                      {shortcut.key}
                    </kbd>
                    <span className="text-gray-600 dark:text-gray-400">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Accessibility Features</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {accessibilityFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-3">
              <p>This app is designed to be accessible to all users, including those using screen readers, keyboard navigation, and other assistive technologies.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
