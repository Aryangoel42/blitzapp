import { NextRequest, NextResponse } from 'next/server';
import { parseRRule, previewOccurrences } from '@/lib/rrule';

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const start = url.searchParams.get('start');
  const rule = url.searchParams.get('rule');
  if (!start || !rule) return NextResponse.json({ error: 'start and rule required' }, { status: 400 });
  const parsed = parseRRule(rule);
  if (!parsed) return NextResponse.json({ error: 'invalid rule' }, { status: 400 });
  const occ = previewOccurrences(start, parsed, 5);
  return NextResponse.json({ occurrences: occ });
}


