"use client";

import { NotificationSettings } from '@/components/NotificationSettings';

export default function SettingsPage() {
  const userId = 'demo-user';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <div className="space-y-6">
        {/* Notification Settings */}
        <NotificationSettings userId={userId} />
        
        {/* Future settings sections can be added here */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Account Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Additional account settings will be available here in future updates.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Focus Preferences</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Focus timer preferences and sound settings will be available here in future updates.
          </p>
        </div>
      </div>
    </div>
  );
}
