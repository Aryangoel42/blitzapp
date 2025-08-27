"use client";

import { useEffect, useState } from 'react';

type ReminderItem = { id: string; title: string; when: string };

export function RemindersBar({ userId }: { userId: string }) {
  const [items, setItems] = useState<ReminderItem[]>([]);

  async function load(){
    const res = await fetch(`/api/reminders?userId=${userId}`);
    if (res.ok) setItems(await res.json());
  }
  useEffect(()=>{ load(); const iv = setInterval(load, 60_000); return ()=>clearInterval(iv); },[]);

  async function snooze(id: string, minutes: number){
    await fetch('/api/reminders/snooze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, minutes }) });
    await load();
  }

  if (items.length === 0) return null;
  return (
    <div className="fixed top-14 left-1/2 z-40 -translate-x-1/2 rounded border bg-white px-3 py-2 text-sm shadow dark:bg-gray-900">
      <div className="flex items-center gap-3">
        {items.slice(0,3).map(r=> (
          <div key={r.id} className="flex items-center gap-2">
            <span className="font-medium">{r.title}</span>
            <span className="text-xs text-gray-500">{new Date(r.when).toLocaleTimeString()}</span>
            <button className="rounded border px-2 py-0.5 text-xs" onClick={()=>snooze(r.id, 5)}>Snooze 5m</button>
          </div>
        ))}
      </div>
    </div>
  );
}


