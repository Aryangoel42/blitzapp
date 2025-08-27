import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, settings } = body;

    if (!content || !settings) {
      return NextResponse.json({ 
        error: 'Content and settings are required' 
      }, { status: 400 });
    }

    // In a real app, you'd get the user ID from the session/token
    const userId = 'user-123';

    // Create share link
    const shareLink = await prisma.shareLink.create({
      data: {
        userId,
        contentId: content.id,
        contentType: content.type,
        title: settings.title,
        description: settings.description,
        isPublic: settings.isPublic,
        password: settings.password || null,
        expiresAt: settings.expiresAt ? new Date(settings.expiresAt) : null,
        accessCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          allowComments: settings.allowComments,
          allowDownload: settings.allowDownload,
          allowEmbedding: settings.allowEmbedding,
          showUserInfo: settings.showUserInfo,
          showTimestamps: settings.showTimestamps,
          refreshInterval: settings.refreshInterval
        }
      }
    });

    return NextResponse.json(shareLink, { status: 201 });
  } catch (error) {
    console.error('Create share error:', error);
    return NextResponse.json({ 
      error: 'Failed to create share link',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
