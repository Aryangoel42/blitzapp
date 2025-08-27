"use client";

import { useEffect, useState } from 'react';

export default function SearchPage(){
  const userId = 'demo-user';
  const [q, setQ] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);

  async function run(){
    const params = new URLSearchParams({ userId });
    if (q) params.set('q', q);
    const res = await fetch(`/api/tasks?${params.toString()}`);
    setTasks(await res.json());
  }

  useEffect(()=>{ run(); },[]);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Search</h2>
      <div className="flex gap-2">
        <input className="flex-1 rounded border px-2 py-1" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') run(); }} placeholder="Search tasks" />
        <button className="rounded border px-2 py-1" onClick={run}>Search</button>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {tasks.map(t=> (
          <li key={t.id} className="py-2 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-gray-500">{t.due_at ? new Date(t.due_at).toLocaleString(): '—'}</div>
              </div>
              <div className="text-xs uppercase">{t.priority}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}


