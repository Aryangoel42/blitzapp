// Admin Management System
// Handles user management, feature flags, and admin controls

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'pending';
  createdAt: Date;
  lastLoginAt?: Date;
  preferences: UserPreferences;
  stats: UserStats;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  emailDigest: boolean;
  timezone: string;
  language: string;
}

export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  focusSessions: number;
  totalFocusTime: number;
  streakDays: number;
  points: number;
  treesPlanted: number;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  enabledFor: 'all' | 'admins' | 'specific_users' | 'percentage';
  targetUsers?: string[];
  targetPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AdminAction {
  id: string;
  type: 'user_suspension' | 'user_activation' | 'feature_flag_change' | 'system_maintenance';
  targetId: string;
  targetType: 'user' | 'feature' | 'system';
  action: string;
  reason?: string;
  performedBy: string;
  performedAt: Date;
  metadata?: any;
}

export interface PublicShare {
  id: string;
  userId: string;
  type: 'task_list' | 'analytics' | 'forest' | 'focus_stats';
  title: string;
  description?: string;
  filters: any;
  isPublic: boolean;
  password?: string;
  expiresAt?: Date;
  createdAt: Date;
  accessCount: number;
  lastAccessedAt?: Date;
}

export class AdminManager {
  private static instance: AdminManager;
  private currentUser: User | null = null;

  static getInstance(): AdminManager {
    if (!AdminManager.instance) {
      AdminManager.instance = new AdminManager();
    }
    return AdminManager.instance;
  }

  // Initialize admin system
  async initialize(): Promise<void> {
    await this.loadCurrentUser();
  }

  // Load current user
  private async loadCurrentUser(): Promise<void> {
    try {
      const response = await fetch('/api/admin/me');
      if (response.ok) {
        this.currentUser = await response.json();
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  }

  // Check if current user is admin
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin' || this.currentUser?.role === 'super_admin';
  }

  // Check if current user is super admin
  isSuperAdmin(): boolean {
    return this.currentUser?.role === 'super_admin';
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // User Management
  async getUsers(filters?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`/api/admin/users?${params}`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }

  async getUserById(userId: string): Promise<User> {
    const response = await fetch(`/api/admin/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  }

  async suspendUser(userId: string, reason: string): Promise<void> {
    const response = await fetch(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!response.ok) throw new Error('Failed to suspend user');
  }

  async activateUser(userId: string): Promise<void> {
    const response = await fetch(`/api/admin/users/${userId}/activate`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to activate user');
  }

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete user');
  }

  // Feature Flag Management
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const response = await fetch('/api/admin/feature-flags');
    if (!response.ok) throw new Error('Failed to fetch feature flags');
    return response.json();
  }

  async createFeatureFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    const response = await fetch('/api/admin/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flag)
    });
    if (!response.ok) throw new Error('Failed to create feature flag');
    return response.json();
  }

  async updateFeatureFlag(flagId: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const response = await fetch(`/api/admin/feature-flags/${flagId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update feature flag');
    return response.json();
  }

  async deleteFeatureFlag(flagId: string): Promise<void> {
    const response = await fetch(`/api/admin/feature-flags/${flagId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete feature flag');
  }

  // Check if feature is enabled for current user
  async isFeatureEnabled(featureName: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/admin/feature-flags/${featureName}/check`);
      if (!response.ok) return false;
      const result = await response.json();
      return result.enabled;
    } catch (error) {
      return false;
    }
  }

  // Admin Actions Log
  async getAdminActions(filters?: {
    type?: string;
    targetType?: string;
    performedBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ actions: AdminAction[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.targetType) params.append('targetType', filters.targetType);
    if (filters?.performedBy) params.append('performedBy', filters.performedBy);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`/api/admin/actions?${params}`);
    if (!response.ok) throw new Error('Failed to fetch admin actions');
    return response.json();
  }

  async logAdminAction(action: Omit<AdminAction, 'id' | 'performedAt'>): Promise<void> {
    const response = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
    if (!response.ok) throw new Error('Failed to log admin action');
  }

  // System Statistics
  async getSystemStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalTasks: number;
    totalFocusSessions: number;
    systemUptime: number;
    lastMaintenance: Date;
  }> {
    const response = await fetch('/api/admin/stats');
    if (!response.ok) throw new Error('Failed to fetch system stats');
    return response.json();
  }

  // System Maintenance
  async triggerMaintenance(maintenanceType: string, duration: number): Promise<void> {
    const response = await fetch('/api/admin/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: maintenanceType, duration })
    });
    if (!response.ok) throw new Error('Failed to trigger maintenance');
  }
}

// Export singleton instance
export const adminManager = AdminManager.getInstance();
