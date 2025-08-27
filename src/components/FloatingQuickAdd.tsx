"use client";

import { useState } from 'react';
import { QuickAdd } from './QuickAdd';

export function FloatingQuickAdd({ userId, onAdded }: { userId: string; onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={()=>setOpen(false)} />
      )}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[480px] max-w-[calc(100%-2rem)] rounded-lg bg-white p-3 shadow-xl dark:bg-gray-900">
          <QuickAdd userId={userId} onAdded={()=>{ onAdded?.(); setOpen(false); }} />
        </div>
      )}
      <button aria-label="Quick Add" className="fixed bottom-6 right-6 z-50 rounded-full bg-brand-500 p-4 text-white shadow-lg" onClick={()=>setOpen(true)}>
        +
      </button>
    </>
  );
}


