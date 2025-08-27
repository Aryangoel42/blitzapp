"use client";

import { useEffect, useState, useRef } from 'react';
import { TreeSpecies, TreeInstance } from '@/lib/forest';
import html2canvas from 'html2canvas';

type ForestStats = {
  total_trees: number;
  total_points: number;
  current_streak: number;
  species_unlocked: number;
  forest_age_days: number;
  mature_trees: number;
  average_stage: number;
  total_growth_sessions: number;
  speciesCounts: Record<string, number>;
  rarityBreakdown: Record<string, number>;
  treeProgress: Array<{
    id: string;
    speciesName: string;
    stage: number;
    maxStages: number;
    progress: number;
    isMature: boolean;
    plantedAt: string;
    growthSessions: number;
    lastGrowthDate: string | null;
  }>;
  milestones: {
    points: { milestone: number; pointsNeeded: number };
    streak: { milestone: number; daysNeeded: number };
  };
  recentActivity: {
    sessionsCount: number;
    totalMinutes: number;
    totalPoints: number;
    averageSessionLength: number;
  };
  achievements: {
    totalPoints: { current: number; nextMilestone: number; progress: number };
    streak: { current: number; nextMilestone: number; progress: number };
    trees: { total: number; mature: number; species: number };
  };
};

type ShopData = {
  userPoints: number;
  starterSpecies: Array<TreeSpecies & { isUnlocked: boolean; canAfford: boolean; ownedCount: number }>;
  purchasableSpecies: Array<TreeSpecies & { isUnlocked: boolean; canAfford: boolean; ownedCount: number }>;
  categories: {
    common: Array<TreeSpecies & { isUnlocked: boolean; canAfford: boolean; ownedCount: number }>;
    rare: Array<TreeSpecies & { isUnlocked: boolean; canAfford: boolean; ownedCount: number }>;
    epic: Array<TreeSpecies & { isUnlocked: boolean; canAfford: boolean; ownedCount: number }>;
    legendary: Array<TreeSpecies & { isUnlocked: boolean; canAfford: boolean; ownedCount: number }>;
  };
};

type CalendarView = 'week' | 'month';
type CalendarDay = {
  date: Date;
  trees: TreeInstance[];
  isToday: boolean;
  isCurrentMonth: boolean;
};

export default function ForestPage() {
  const [stats, setStats] = useState<ForestStats | null>(null);
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'forest' | 'shop' | 'stats'>('forest');
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [trees, setTrees] = useState<TreeInstance[]>([]);
  const [userId] = useState('user-123'); // Replace with actual user ID
  const [sharing, setSharing] = useState(false);
  
  const forestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadForestData();
  }, []);

  const loadForestData = async () => {
    try {
      setLoading(true);
      
      // Load forest stats
      const statsResponse = await fetch(`/api/forest/stats?userId=${userId}`);
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Load shop data
      const shopResponse = await fetch(`/api/forest/shop?userId=${userId}`);
      const shopData = await shopResponse.json();
      setShopData(shopData);

      // Load trees for calendar
      const treesResponse = await fetch(`/api/forest/trees?userId=${userId}`);
      const treesData = await treesResponse.json();
      setTrees(treesData);
    } catch (error) {
      console.error('Failed to load forest data:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseSpecies = async (speciesId: string) => {
    try {
      const response = await fetch('/api/forest/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, speciesId })
      });

      if (response.ok) {
        // Reload data after purchase
        await loadForestData();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to purchase species');
      }
    } catch (error) {
      console.error('Failed to purchase species:', error);
      alert('Failed to purchase species');
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (calendarView === 'week') {
      // Generate week view (7 days)
      const startOfWeek = new Date(selectedDate);
      const dayOfWeek = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        
        const dayTrees = trees.filter(tree => {
          const plantedDate = new Date(tree.planted_at);
          plantedDate.setHours(0, 0, 0, 0);
          return plantedDate.getTime() === date.getTime();
        });

        days.push({
          date,
          trees: dayTrees,
          isToday: date.getTime() === today.getTime(),
          isCurrentMonth: true
        });
      }
    } else {
      // Generate month view
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());

      for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dayTrees = trees.filter(tree => {
          const plantedDate = new Date(tree.planted_at);
          plantedDate.setHours(0, 0, 0, 0);
          return plantedDate.getTime() === date.getTime();
        });

        days.push({
          date,
          trees: dayTrees,
          isToday: date.getTime() === today.getTime(),
          isCurrentMonth: date.getMonth() === month
        });
      }
    }

    return days;
  };

  const shareForestSnapshot = async () => {
    if (!forestRef.current) return;
    
    try {
      setSharing(true);
      
      const canvas = await html2canvas(forestRef.current, {
        backgroundColor: '#f0fdf4', // Light green background
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `forest-snapshot-${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to generate snapshot:', error);
      alert('Failed to generate forest snapshot');
    } finally {
      setSharing(false);
    }
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (calendarView === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const getTreeEmoji = (speciesName: string, stage: number): string => {
    const emojis: Record<string, string[]> = {
      'Oak': ['🌱', '🌿', '🌳', '🌲'],
      'Maple': ['🌱', '🍃', '🍁'],
      'Pine': ['🌱', '🌿', '🌲', '🌲', '🌲'],
      'Cherry Blossom': ['🌸', '🌺', '🌷', '🌹'],
      'Bamboo': ['🎋', '🎍', '🎋'],
      'Redwood': ['🌱', '🌿', '🌲', '🌲', '🌲'],
      'Sakura': ['🌸', '🌺', '🌷', '🌹'],
      'Golden Oak': ['🌱', '🌿', '🌳', '🌲', '🌲', '🌟']
    };
    
    const speciesEmojis = emojis[speciesName] || ['🌱', '🌿', '🌳'];
    return speciesEmojis[Math.min(stage, speciesEmojis.length - 1)] || '🌱';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your forest...</p>
          </div>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-green-800">🌳 Your Forest</h1>
            <button
              onClick={shareForestSnapshot}
              disabled={sharing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sharing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  📸 Share Snapshot
                </>
              )}
            </button>
          </div>
          
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.total_points}</div>
                <div className="text-sm text-gray-600">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.current_streak}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_trees}</div>
                <div className="text-sm text-gray-600">Trees Planted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.species_unlocked}</div>
                <div className="text-sm text-gray-600">Species Unlocked</div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('forest')}
              className={`flex-1 py-3 px-4 text-center font-medium ${
                activeTab === 'forest'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🌲 Forest
            </button>
            <button
              onClick={() => setActiveTab('shop')}
              className={`flex-1 py-3 px-4 text-center font-medium ${
                activeTab === 'shop'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🛒 Shop
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 px-4 text-center font-medium ${
                activeTab === 'stats'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Stats
            </button>
          </div>
        </div>

        {/* Forest Tab */}
        {activeTab === 'forest' && (
          <div className="space-y-6" ref={forestRef}>
            {/* Calendar View */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-green-800">Forest Calendar</h2>
                <div className="flex items-center gap-4">
                  {/* Calendar View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setCalendarView('week')}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        calendarView === 'week'
                          ? 'bg-white text-green-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setCalendarView('month')}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        calendarView === 'month'
                          ? 'bg-white text-green-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Month
                    </button>
                  </div>
                  
                  {/* Calendar Navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateCalendar('prev')}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                    >
                      ←
                    </button>
                    <span className="text-sm font-medium text-gray-700">
                      {calendarView === 'week' 
                        ? `Week of ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      }
                    </span>
                    <button
                      onClick={() => navigateCalendar('next')}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className={`grid gap-1 ${
                calendarView === 'week' 
                  ? 'grid-cols-7' 
                  : 'grid-cols-7'
              }`}>
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 border rounded-lg ${
                      day.isToday 
                        ? 'bg-green-100 border-green-300' 
                        : day.isCurrentMonth 
                          ? 'bg-white border-gray-200' 
                          : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    {/* Date Header */}
                    <div className={`text-xs font-medium mb-2 ${
                      day.isToday 
                        ? 'text-green-800' 
                        : day.isCurrentMonth 
                          ? 'text-gray-700' 
                          : 'text-gray-400'
                    }`}>
                      {day.date.getDate()}
                    </div>

                    {/* Trees for this day */}
                    <div className="space-y-1">
                      {day.trees.slice(0, 3).map((tree, treeIndex) => {
                        const species = stats?.treeProgress.find(t => t.id === tree.id);
                        return (
                          <div
                            key={tree.id}
                            className="flex items-center gap-1 text-xs"
                            title={`${species?.speciesName || 'Unknown'} - Stage ${tree.stage + 1}`}
                          >
                            <span className="text-lg">
                              {getTreeEmoji(species?.speciesName || 'Unknown', tree.stage)}
                            </span>
                            <span className="truncate">
                              {species?.speciesName || 'Unknown'}
                            </span>
                          </div>
                        );
                      })}
                      {day.trees.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{day.trees.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tree Grid */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4">Your Trees</h2>
              {stats?.treeProgress && stats.treeProgress.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {stats.treeProgress.map((tree) => (
                    <div key={tree.id} className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-4xl mb-2">
                        {getTreeEmoji(tree.speciesName, tree.stage)}
                      </div>
                      <div className="font-medium text-green-800">{tree.speciesName}</div>
                      <div className="text-sm text-gray-600">
                        Stage {tree.stage + 1} of {tree.maxStages}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${tree.progress}%` }}
                        ></div>
                      </div>
                      {tree.isMature && (
                        <div className="text-xs text-green-600 mt-1">✨ Mature</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-6xl mb-4">🌱</div>
                  <p>No trees planted yet. Start focusing to grow your forest!</p>
                </div>
              )}
            </div>

            {/* Achievements */}
            {stats && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-green-800 mb-4">Achievements</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-800">Points</div>
                        <div className="text-sm text-blue-600">
                          {stats.achievements.totalPoints.current} / {stats.achievements.totalPoints.nextMilestone}
                        </div>
                      </div>
                      <div className="text-2xl">🎯</div>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${stats.achievements.totalPoints.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-orange-800">Streak</div>
                        <div className="text-sm text-orange-600">
                          {stats.achievements.streak.current} / {stats.achievements.streak.nextMilestone} days
                        </div>
                      </div>
                      <div className="text-2xl">🔥</div>
                    </div>
                    <div className="w-full bg-orange-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{ width: `${stats.achievements.streak.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-800">Forest</div>
                        <div className="text-sm text-green-600">
                          {stats.achievements.trees.total} trees, {stats.achievements.trees.mature} mature
                        </div>
                      </div>
                      <div className="text-2xl">🌲</div>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(stats.achievements.trees.mature / Math.max(stats.achievements.trees.total, 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && shopData && (
          <div className="space-y-6">
            {/* Points Display */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-green-800">Tree Shop</h2>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{shopData.userPoints}</div>
                  <div className="text-sm text-gray-600">Points Available</div>
                </div>
              </div>
            </div>

            {/* Starter Species */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4">🌱 Starter Species (Free)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shopData.starterSpecies.map((species) => (
                  <div key={species.id} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{species.name}</div>
                      <div className="text-sm text-green-600 font-medium">FREE</div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{species.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Owned: {species.ownedCount}
                      </div>
                      <button
                        onClick={() => purchaseSpecies(species.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Plant
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchasable Species by Rarity */}
            {Object.entries(shopData.categories).map(([rarity, speciesList]) => {
              if (speciesList.length === 0) return null;
              
              const rarityColors = {
                common: 'text-gray-600 bg-gray-100',
                rare: 'text-blue-600 bg-blue-100',
                epic: 'text-purple-600 bg-purple-100',
                legendary: 'text-yellow-600 bg-yellow-100'
              };
              
              const rarityIcons = {
                common: '🌿',
                rare: '💎',
                epic: '🌟',
                legendary: '👑'
              };
              
  return (
                <div key={rarity} className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">
                    {rarityIcons[rarity as keyof typeof rarityIcons]} {rarity.charAt(0).toUpperCase() + rarity.slice(1)} Species
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {speciesList.map((species) => (
                      <div key={species.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{species.name}</div>
                          <div className={`text-sm px-2 py-1 rounded-full ${rarityColors[rarity as keyof typeof rarityColors]}`}>
                            {species.unlock_cost} pts
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{species.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Owned: {species.ownedCount}
                          </div>
                          <button
                            onClick={() => purchaseSpecies(species.id)}
                            disabled={!species.canAfford}
                            className={`px-3 py-1 rounded text-sm ${
                              species.canAfford
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {species.canAfford ? 'Purchase' : 'Not Enough Points'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4">Recent Activity</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.recentActivity.sessionsCount}</div>
                  <div className="text-sm text-gray-600">Sessions (7d)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.recentActivity.totalMinutes}</div>
                  <div className="text-sm text-gray-600">Minutes (7d)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.recentActivity.totalPoints}</div>
                  <div className="text-sm text-gray-600">Points (7d)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.recentActivity.averageSessionLength}</div>
                  <div className="text-sm text-gray-600">Avg Session</div>
                </div>
              </div>
            </div>

            {/* Forest Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4">Forest Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.forest_age_days}</div>
                  <div className="text-sm text-gray-600">Forest Age (days)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.mature_trees}</div>
                  <div className="text-sm text-gray-600">Mature Trees</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.average_stage}</div>
                  <div className="text-sm text-gray-600">Avg Stage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.total_growth_sessions}</div>
                  <div className="text-sm text-gray-600">Growth Sessions</div>
                </div>
              </div>
            </div>

            {/* Species Breakdown */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4">Species Breakdown</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.speciesCounts).map(([species, count]) => (
                  <div key={species} className="text-center">
                    <div className="text-2xl font-bold text-green-600">{count}</div>
                    <div className="text-sm text-gray-600">{species}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


