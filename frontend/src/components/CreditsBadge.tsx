import { useState, useEffect } from 'react';
import { getCreditBalance } from '../lib/credits';

export function CreditsBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBalance();
    // Refresh every 30 seconds
    const interval = setInterval(loadBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadBalance() {
    try {
      const data = await getCreditBalance();
      setBalance(data.balance);
      setError(null);
    } catch (err) {
      console.error('Failed to load balance:', err);
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Error</span>
      </div>
    );
  }

  const isLow = balance !== null && balance < 5;

  return (
    <a 
      href="/credits"
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        isLow 
          ? 'bg-red-50 text-red-600 hover:bg-red-100' 
          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{balance} credits</span>
      {isLow && <span className="text-xs">(Low)</span>}
    </a>
  );
}
