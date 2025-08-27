"use client";

import { useEffect, useMemo, useState } from 'react';
import { CalendarQuickEdit } from './CalendarQuickEdit';

type Task = { id: string; title: string; due_at: string | null };

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }

export function MonthCalendar({ userId }: { userId: string }) {
  const [anchor, setAnchor] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);

  const first = startOfMonth(anchor);
  const last = endOfMonth(anchor);
  const start = new Date(first); start.setDate(1 - ((first.getDay()+6)%7));
  const days = useMemo(()=>Array.from({length:42},(_,i)=>{ const x=new Date(start); x.setDate(start.getDate()+i); return x; }),[anchor]);

  async function load() {
    const res = await fetch(`/api/tasks?userId=${userId}`);
    setTasks(await res.json());
  }
  useEffect(()=>{ load(); },[anchor]);

  async function reschedule(id: string, date: Date) {
    await fetch('/api/tasks', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, due_at: date.toISOString() }) });
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{anchor.toLocaleString(undefined,{month:'long', year:'numeric'})}</div>
        <div className="flex gap-2">
          <button className="rounded border px-2 py-1" onClick={()=>setAnchor(new Date(anchor.getFullYear(), anchor.getMonth()-1, 1))}>Prev</button>
          <button className="rounded border px-2 py-1" onClick={()=>setAnchor(new Date())}>Today</button>
          <button className="rounded border px-2 py-1" onClick={()=>setAnchor(new Date(anchor.getFullYear(), anchor.getMonth()+1, 1))}>Next</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const inMonth = day.getMonth()===anchor.getMonth();
          return (
            <div key={i} className={`min-h-[110px] rounded border p-2 text-xs ${inMonth? '' : 'opacity-60'}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{const id=e.dataTransfer.getData('text/plain'); reschedule(id, day);}}>
              <div className="mb-1 font-semibold">{day.getDate()}</div>
              <div className="space-y-1">
                {tasks.filter(t=>t.due_at && new Date(t.due_at).toDateString()===day.toDateString()).slice(0,3).map(t=> (
                  <TaskChip key={t.id} task={t} onRescheduled={(d)=>reschedule(t.id, d)} onSaved={load} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskChip({ task, onRescheduled, onSaved }: { task: any; onRescheduled: (d: Date)=>void; onSaved: ()=>void }){
  const [edit, setEdit] = useState(false);
  return (
    <>
      <div
        draggable
        onDragStart={e=>{e.dataTransfer.setData('text/plain', task.id);}}
        onDoubleClick={()=>setEdit(true)}
        className="cursor-grab rounded bg-brand-500/10 px-2 py-1 hover:bg-brand-500/20"
      >
        {task.title}
      </div>
      {edit && <CalendarQuickEdit taskId={task.id} initialTitle={task.title} initialDue={task.due_at} onClose={()=>setEdit(false)} onSaved={onSaved} />}
    </>
  );
}


