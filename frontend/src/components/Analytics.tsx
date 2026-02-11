import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

// Get user ID from localStorage
function getUserId(): string {
  let userId = localStorage.getItem('deviceId');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('deviceId', userId);
  }
  return userId;
}

interface SummaryStats {
  totalImagesGenerated: number;
  totalImagesFailed: number;
  totalCreditsPurchased: number;
  totalCreditsUsed: number;
  totalRevenue: number;
  uniqueUsers: number;
  topModels: { model: string; count: number }[];
  conversionRate: number;
  avgRevenuePerUser: number;
  lastUpdated: string;
}

interface DailyStats {
  date: string;
  imagesGenerated: number;
  imagesFailed: number;
  creditsPurchased: number;
  creditsUsed: number;
  revenue: number;
  uniqueUsers: number;
  modelsUsed: Record<string, number>;
}

interface FunnelMetrics {
  totalUsers: number;
  generatingUsers: number;
  purchasingUsers: number;
  generationRate: number;
  purchaseRate: number;
  purchaseRateFromGenerators: number;
}

export function AnalyticsDashboard() {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [daily, setDaily] = useState<DailyStats[]>([]);
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const headers = { 'x-device-id': getUserId() };
      
      const [summaryRes, dailyRes, funnelRes] = await Promise.all([
        apiFetch('/api/analytics/summary', { headers }),
        apiFetch('/api/analytics/daily?days=30', { headers }),
        apiFetch('/api/analytics/funnel', { headers }),
      ]);

      setSummary(await summaryRes.json());
      setDaily(await dailyRes.json());
      setFunnel(await funnelRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatModelName = (model: string) => {
    return model
      .replace('dall-e-', 'DALL-E ')
      .replace('gpt-image-', 'GPT Image ')
      .replace('-mini', ' Mini');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          <p>Failed to load analytics: {error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalImages = (summary?.totalImagesGenerated || 0) + (summary?.totalImagesFailed || 0);
  const successRate = totalImages > 0 
    ? ((summary?.totalImagesGenerated || 0) / totalImages * 100).toFixed(1)
    : '0';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <button
          onClick={fetchAnalytics}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-green-400">
            {formatCurrency(summary?.totalRevenue || 0)}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Images Generated</p>
          <p className="text-2xl font-bold text-blue-400">
            {summary?.totalImagesGenerated.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500">{successRate}% success rate</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Unique Users</p>
          <p className="text-2xl font-bold text-purple-400">
            {summary?.uniqueUsers.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Conversion Rate</p>
          <p className="text-2xl font-bold text-yellow-400">
            {(summary?.conversionRate || 0).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">
            {formatCurrency((summary?.avgRevenuePerUser || 0) * 100)} ARPU
          </p>
        </div>
      </div>

      {/* Funnel */}
      {funnel && funnel.totalUsers > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-white">{funnel.totalUsers}</p>
                <p className="text-sm text-gray-400">Total Users</p>
              </div>
            </div>
            <div className="text-gray-500">→</div>
            <div className="flex-1">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{funnel.generatingUsers}</p>
                <p className="text-sm text-blue-300">Generated Images</p>
                <p className="text-xs text-blue-400/70">{funnel.generationRate.toFixed(1)}%</p>
              </div>
            </div>
            <div className="text-gray-500">→</div>
            <div className="flex-1">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{funnel.purchasingUsers}</p>
                <p className="text-sm text-green-300">Purchased</p>
                <p className="text-xs text-green-400/70">{funnel.purchaseRateFromGenerators.toFixed(1)}% of generators</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Usage */}
      {summary && summary.topModels.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Model Usage</h2>
          <div className="space-y-3">
            {summary.topModels.map((model) => {
              const total = summary.topModels.reduce((acc, m) => acc + m.count, 0);
              const percentage = (model.count / total) * 100;
              return (
                <div key={model.model} className="flex items-center gap-4">
                  <span className="text-sm text-gray-400 w-32 truncate">
                    {formatModelName(model.model)}
                  </span>
                  <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-300 w-16 text-right">
                    {model.count}
                  </span>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Stats Chart */}
      {daily.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Daily Activity (Last 30 Days)</h2>
          <div className="h-48 flex items-end gap-1">
            {daily.slice(-30).map((day) => {
              const maxImages = Math.max(...daily.map(d => d.imagesGenerated), 1);
              const height = (day.imagesGenerated / maxImages) * 100;
              return (
                <div
                  key={day.date}
                  className="flex-1 bg-blue-500/30 hover:bg-blue-500/50 transition-colors rounded-t"
                  style={{ height: `${Math.max(height, 5)}%` }}
                  title={`${day.date}: ${day.imagesGenerated} images, ${day.uniqueUsers} users`}
                ></div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{daily[0]?.date}</span>
            <span>{daily[daily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Credits Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Credits Economy</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Purchased</span>
              <span className="text-green-400">+{summary?.totalCreditsPurchased.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Used</span>
              <span className="text-red-400">-{summary?.totalCreditsUsed.toLocaleString() || 0}</span>
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between">
              <span className="text-gray-300">Net</span>
              <span className="text-blue-400">
                {((summary?.totalCreditsPurchased || 0) - (summary?.totalCreditsUsed || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Revenue per Image</h3>
          <div className="text-3xl font-bold text-white">
            {summary && summary.totalImagesGenerated > 0
              ? formatCurrency(summary.totalRevenue / summary.totalImagesGenerated)
              : '$0.00'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Average revenue generated per image created
          </p>
        </div>
      </div>
    </div>
  );
}
