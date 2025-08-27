"use client";

import React from 'react';
import TaskList from '@/components/TaskList';

export default function UpcomingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <TaskList view="upcoming" title="Upcoming Tasks" />
    </div>
  );
}


