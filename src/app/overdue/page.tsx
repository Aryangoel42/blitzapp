import React from 'react';
import TaskList from '@/components/TaskList';

export default function OverduePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <TaskList view="overdue" title="Overdue Tasks" />
    </div>
  );
}


