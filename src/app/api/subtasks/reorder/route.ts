import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentId, order } = body;

    if (!parentId || !Array.isArray(order)) {
      return NextResponse.json({ 
        error: 'parentId and order array required' 
      }, { status: 400 });
    }

    // Update order indices for all subtasks
    await Promise.all(
      order.map((subtaskId: string, index: number) =>
        prisma.task.update({
          where: { id: subtaskId },
          data: { order_index: index }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subtask reorder error:', error);
    return NextResponse.json({ 
      error: 'Failed to reorder subtasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


