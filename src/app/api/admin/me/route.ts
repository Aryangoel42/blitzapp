import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // In a real app, you'd get the user ID from the session/token
    // For demo purposes, we'll return a mock admin user
    const mockUser = {
      id: 'admin-user-123',
      email: 'admin@blitzitapp.com',
      name: 'Admin User',
      role: 'admin' as const,
      status: 'active' as const,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      preferences: {
        theme: 'auto',
        notifications: true,
        emailDigest: true,
        timezone: 'UTC',
        language: 'en'
      },
      stats: {
        totalTasks: 150,
        completedTasks: 120,
        focusSessions: 45,
        totalFocusTime: 1800,
        streakDays: 7,
        points: 850,
        treesPlanted: 12
      }
    };

    return NextResponse.json(mockUser);
  } catch (error) {
    console.error('Admin me error:', error);
    return NextResponse.json({ 
      error: 'Failed to get admin user info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
