import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, action } = body;

    if (!Array.isArray(ids) || !action) {
      return NextResponse.json({ 
        error: 'ids array and action required' 
      }, { status: 400 });
    }

    if (action === 'complete') {
      await prisma.task.updateMany({
        where: { id: { in: ids } },
        data: { 
          status: 'done', 
          completed_at: new Date() 
        }
      });
    } else if (action === 'reopen') {
      await prisma.task.updateMany({
        where: { id: { in: ids } },
        data: { 
          status: 'todo', 
          completed_at: null 
        }
      });
    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Use "complete" or "reopen"' 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subtask bulk complete error:', error);
    return NextResponse.json({ 
      error: 'Failed to bulk update subtasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


