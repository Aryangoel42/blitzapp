import React from 'react';
import TaskList from '@/components/TaskList';

export default function CompletedPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <TaskList view="completed" title="Completed Tasks" />
    </div>
  );
}



