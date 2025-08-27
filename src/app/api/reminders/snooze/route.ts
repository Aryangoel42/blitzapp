import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest){
  const { id, minutes } = await req.json();
  if (!id || !minutes) return NextResponse.json({ error: 'id and minutes required' }, { status: 400 });
  const t = await prisma.task.findUnique({ where: { id } });
  if (!t || !t.reminder_time) return NextResponse.json({ ok: true });
  const newTime = new Date(t.reminder_time.getTime() + Number(minutes)*60_000);
  await prisma.task.update({ where: { id }, data: { reminder_time: newTime } });
  return NextResponse.json({ ok: true });
}


