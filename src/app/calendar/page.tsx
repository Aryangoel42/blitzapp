'use client';

import React, { useState } from 'react';
import Calendar from '@/components/Calendar';

export default function CalendarPage() {
  const [view, setView] = useState<'week' | 'month'>('week');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Calendar</h1>
        
        <div className="flex gap-2">
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Week View
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month View
          </button>
        </div>
      </div>

      <Calendar view={view} />
    </div>
  );
}
