import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dailySummaryService } from '@/lib/dailySummary';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, summary, content } = body;

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId is required' 
      }, { status: 400 });
    }

    // If summary is provided, use it; otherwise generate one
    let dailySummary = summary;
    if (!dailySummary) {
      dailySummary = await dailySummaryService.generateDailySummary(userId);
    }

    // Get user email if not provided
    let userEmail = email;
    if (!userEmail) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      userEmail = user?.email;
    }

    // Send email if user has email and daily email is enabled
    if (userEmail) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user?.notification_daily_email) {
        const emailSent = await dailySummaryService.sendDailySummaryEmail(
          userId, 
          userEmail, 
          dailySummary
        );

        if (emailSent) {
          // Create notification record
          await prisma.notification.create({
            data: {
              userId,
              type: 'daily_summary',
              channel: 'email',
              payload_json: JSON.stringify({
                title: '📊 Your Daily Summary',
                message: `Completed ${dailySummary.tasksCompleted} tasks, focused for ${Math.round(dailySummary.focusMinutes / 60 * 10) / 10}h, earned ${dailySummary.pointsEarned} points!`,
                summary: dailySummary
              }),
              scheduled_at: new Date(),
              sent_at: new Date()
            }
          });
        }
      }
    }

    // Also send local notification
    const localNotification = await prisma.notification.create({
      data: {
        userId,
        type: 'daily_summary',
        channel: 'local',
        payload_json: JSON.stringify({
          title: '📊 Your Daily Summary',
          message: `Completed ${dailySummary.tasksCompleted} tasks, focused for ${Math.round(dailySummary.focusMinutes / 60 * 10) / 10}h, earned ${dailySummary.pointsEarned} points!`,
          summary: dailySummary
        }),
        scheduled_at: new Date(),
        sent_at: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      summary: dailySummary,
      notification: localNotification
    });
  } catch (error) {
    console.error('Daily summary error:', error);
    return NextResponse.json({ 
      error: 'Failed to send daily summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const date = url.searchParams.get('date');

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId is required' 
      }, { status: 400 });
    }

    const targetDate = date ? new Date(date) : new Date();
    const summary = await dailySummaryService.generateDailySummary(userId, targetDate);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Daily summary fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch daily summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
