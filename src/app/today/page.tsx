import React from 'react';
import TaskList from '@/components/TaskList';

export default function TodayPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <TaskList view="today" title="Today's Tasks" />
    </div>
  );
}


