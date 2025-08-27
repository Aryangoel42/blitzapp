"use client";

import { useEffect, useState } from 'react';

export function SubtasksPanel({ parentId, userId }: { parentId: string; userId: string }) {
  const [subs, setSubs] = useState<any[]>([]);
  const [text, setText] = useState("");

  async function load() {
    const res = await fetch(`/api/tasks?userId=${userId}`);
    const data = await res.json();
    const children = data.filter((t: any) => t.parent_task_id === parentId);
    children.sort((a:any,b:any)=> (a.order_index??0)-(b.order_index??0));
    setSubs(children);
  }
  useEffect(()=>{ load(); },[parentId]);

  async function add() {
    if (!text.trim()) return;
    await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ userId, title: text.trim(), parent_task_id: parentId, status:'todo', priority:'medium' })
    });
    setText("");
    await load();
  }

  async function toggle(id: string, done: boolean) {
    await fetch('/api/tasks', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, action: done? 'reopen':'complete' }) });
    await load();
  }

  async function saveOrder(order: string[]) {
    await fetch('/api/subtasks/reorder', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ parentId, order }) });
    await load();
  }

  async function completeAll(){
    await fetch('/api/subtasks/bulk-complete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids: subs.map(s=>s.id), action: 'complete' }) });
    await load();
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Subtasks</div>
      <ul className="space-y-1 text-sm">
        {subs.map((s, idx) => (
          <li key={s.id} className="flex items-center gap-2" draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', String(idx)); }} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{ const from = Number(e.dataTransfer.getData('text/plain')); const to = idx; const next = subs.slice(); const [m] = next.splice(from,1); next.splice(to,0,m); setSubs(next); saveOrder(next.map(x=>x.id)); }}>
            <input type="checkbox" checked={s.status==='done'} onChange={()=>toggle(s.id, s.status==='done')} />
            <span className={s.status==='done'?'line-through text-gray-500':''}>{s.title}</span>
          </li>
        ))}
      </ul>
      {subs.length>0 && (
        <div>
          <button className="rounded border px-2 py-1 text-xs" onClick={completeAll}>Complete all</button>
        </div>
      )}
      <div className="flex gap-2">
        <input className="flex-1 rounded border px-2 py-1" placeholder="Add subtask" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') add();}} />
        <button className="rounded border px-2 py-1" onClick={add}>Add</button>
      </div>
    </div>
  );
}


