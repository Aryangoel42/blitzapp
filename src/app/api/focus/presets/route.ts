import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const presets = await prisma.focusPreset.findMany({
      where: { userId },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(presets);
  } catch (error) {
    console.error('Failed to fetch focus presets:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch focus presets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, presets } = body;

    if (!userId || !presets) {
      return NextResponse.json({ error: 'userId and presets required' }, { status: 400 });
    }

    // Delete existing presets for this user
    await prisma.focusPreset.deleteMany({
      where: { userId }
    });

    // Create new presets
    const createdPresets = await Promise.all(
      presets.map((preset: any) =>
        prisma.focusPreset.create({
          data: {
            userId,
            name: preset.name,
            focus_min: preset.focus_min,
            short_break_min: preset.short_break_min,
            long_break_min: preset.long_break_min,
            long_break_every: preset.long_break_every,
            is_custom: preset.isCustom || false
          }
        })
      )
    );

    return NextResponse.json(createdPresets, { status: 201 });
  } catch (error) {
    console.error('Failed to save focus presets:', error);
    return NextResponse.json({ 
      error: 'Failed to save focus presets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
