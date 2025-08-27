// Public Sharing System
// Handles read-only filtered list links and public sharing

export interface ShareableContent {
  id: string;
  type: 'task_list' | 'analytics' | 'forest' | 'focus_stats';
  title: string;
  description?: string;
  data: any;
  filters: any;
  metadata?: any;
}

export interface ShareLink {
  id: string;
  userId: string;
  contentId: string;
  contentType: 'task_list' | 'analytics' | 'forest' | 'focus_stats';
  title: string;
  description?: string;
  isPublic: boolean;
  password?: string;
  expiresAt?: Date;
  accessCount: number;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  settings: ShareSettings;
}

export interface ShareSettings {
  allowComments: boolean;
  allowDownload: boolean;
  allowEmbedding: boolean;
  showUserInfo: boolean;
  showTimestamps: boolean;
  refreshInterval?: number; // Auto-refresh in seconds
}

export interface ShareAccess {
  id: string;
  shareId: string;
  ipAddress?: string;
  userAgent?: string;
  accessedAt: Date;
  duration: number; // Time spent viewing in seconds
  actions: string[]; // What the user did
}

export class SharingManager {
  private static instance: SharingManager;

  static getInstance(): SharingManager {
    if (!SharingManager.instance) {
      SharingManager.instance = new SharingManager();
    }
    return SharingManager.instance;
  }

  // Create a new share link
  async createShareLink(content: ShareableContent, settings: Partial<ShareSettings> = {}): Promise<ShareLink> {
    const response = await fetch('/api/sharing/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        settings: {
          allowComments: true,
          allowDownload: true,
          allowEmbedding: false,
          showUserInfo: false,
          showTimestamps: true,
          ...settings
        }
      })
    });

    if (!response.ok) throw new Error('Failed to create share link');
    return response.json();
  }

  // Get share link by ID
  async getShareLink(shareId: string): Promise<ShareLink> {
    const response = await fetch(`/api/sharing/${shareId}`);
    if (!response.ok) throw new Error('Share link not found');
    return response.json();
  }

  // Get shared content
  async getSharedContent(shareId: string, password?: string): Promise<{
    share: ShareLink;
    content: ShareableContent;
    accessToken: string;
  }> {
    const body: any = {};
    if (password) body.password = password;

    const response = await fetch(`/api/sharing/${shareId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error('Failed to access shared content');
    return response.json();
  }

  // Update share link
  async updateShareLink(shareId: string, updates: Partial<ShareLink>): Promise<ShareLink> {
    const response = await fetch(`/api/sharing/${shareId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Failed to update share link');
    return response.json();
  }

  // Delete share link
  async deleteShareLink(shareId: string): Promise<void> {
    const response = await fetch(`/api/sharing/${shareId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete share link');
  }

  // Get user's share links
  async getUserShares(filters?: {
    type?: string;
    isPublic?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ shares: ShareLink[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`/api/sharing/user?${params}`);
    if (!response.ok) throw new Error('Failed to fetch user shares');
    return response.json();
  }

  // Track share access
  async trackAccess(shareId: string, accessData: {
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
    actions?: string[];
  }): Promise<void> {
    const response = await fetch(`/api/sharing/${shareId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accessData)
    });

    if (!response.ok) throw new Error('Failed to track access');
  }

  // Get share analytics
  async getShareAnalytics(shareId: string): Promise<{
    totalAccesses: number;
    uniqueVisitors: number;
    averageDuration: number;
    topReferrers: Array<{ referrer: string; count: number }>;
    accessTrends: Array<{ date: string; count: number }>;
    recentAccesses: ShareAccess[];
  }> {
    const response = await fetch(`/api/sharing/${shareId}/analytics`);
    if (!response.ok) throw new Error('Failed to fetch share analytics');
    return response.json();
  }

  // Generate embed code
  generateEmbedCode(shareId: string, options: {
    width?: number;
    height?: number;
    theme?: 'light' | 'dark';
    showHeader?: boolean;
  } = {}): string {
    const defaultOptions = {
      width: 800,
      height: 600,
      theme: 'light',
      showHeader: true,
      ...options
    };

    return `<iframe 
      src="${window.location.origin}/embed/${shareId}?theme=${defaultOptions.theme}&header=${defaultOptions.showHeader}"
      width="${defaultOptions.width}"
      height="${defaultOptions.height}"
      frameborder="0"
      allowfullscreen
      style="border: 1px solid #e5e7eb; border-radius: 8px;"
    ></iframe>`;
  }

  // Validate share link
  validateShareLink(shareId: string): boolean {
    // Basic validation - check if it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(shareId);
  }

  // Check if share link is expired
  isExpired(share: ShareLink): boolean {
    if (!share.expiresAt) return false;
    return new Date() > new Date(share.expiresAt);
  }

  // Check if share link requires password
  requiresPassword(share: ShareLink): boolean {
    return !!share.password;
  }

  // Generate share URL
  generateShareUrl(shareId: string): string {
    return `${window.location.origin}/share/${shareId}`;
  }

  // Generate QR code URL for share link
  generateQRCodeUrl(shareId: string): string {
    const shareUrl = this.generateShareUrl(shareId);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
  }
}

// Export singleton instance
export const sharingManager = SharingManager.getInstance();
