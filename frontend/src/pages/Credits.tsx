import { useState, useEffect } from 'react';
import { getCreditBalance, getPricingTiers, getPaymentHistory, createCheckoutSession, verifyPayment, PricingTier, PaymentHistory, CreditBalance } from '../lib/credits';

export default function CreditsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
    
    // Check for success/cancel params
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const canceled = params.get('canceled');
    const sessionId = params.get('session_id');
    
    if (success === 'true' && sessionId) {
      handleSuccess(sessionId);
    } else if (canceled === 'true') {
      setMessage({ type: 'error', text: 'Payment was canceled. No credits were charged.' });
    }
  }, []);

  async function loadData() {
    try {
      const [balanceData, tiersData, historyData] = await Promise.all([
        getCreditBalance(),
        getPricingTiers(),
        getPaymentHistory(),
      ]);
      setBalance(balanceData);
      setTiers(tiersData);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setMessage({ type: 'error', text: 'Failed to load credits data' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSuccess(sessionId: string) {
    try {
      const result = await verifyPayment(sessionId);
      if (result.success) {
        setMessage({ type: 'success', text: `Success! Added ${result.creditsAdded} credits. Your new balance is ${result.balance}.` });
        loadData();
        // Clear query params
        window.history.replaceState({}, '', '/credits');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to verify payment. Please contact support.' });
    }
  }

  async function handleCheckout(tierId: string) {
    setCheckoutLoading(tierId);
    try {
      const { url } = await createCheckoutSession(tierId);
      window.location.href = url;
    } catch (err) {
      console.error('Checkout failed:', err);
      setMessage({ type: 'error', text: 'Failed to start checkout. Please try again.' });
      setCheckoutLoading(null);
    }
  }

  function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <a href="/" className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className="text-3xl font-bold text-gray-900">Credits</h1>
          </div>
          <p className="text-gray-600">Purchase credits to generate AI images</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Current Balance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Current Balance</p>
              <p className="text-4xl font-bold text-gray-900">{balance?.balance || 0}</p>
              <p className="text-sm text-gray-500 mt-1">credits remaining</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Total Purchased</div>
              <div className="text-xl font-semibold text-gray-700">{balance?.totalPurchased || 0}</div>
              <div className="text-sm text-gray-500 mt-2 mb-1">Total Used</div>
              <div className="text-xl font-semibold text-gray-700">{balance?.totalUsed || 0}</div>
            </div>
          </div>
        </div>

        {/* Pricing Tiers */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Purchase Credits</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {tiers.map((tier) => (
            <div key={tier.id} className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all hover:shadow-md ${tier.id === 'pro' ? 'border-indigo-500 relative' : 'border-gray-200'}`}>
              {tier.id === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-900 mb-1">{tier.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{tier.description}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">{formatPrice(tier.price)}</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {tier.credits} image generations
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All AI models
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Never expires
                </li>
              </ul>
              <button
                onClick={() => handleCheckout(tier.id)}
                disabled={checkoutLoading === tier.id}
                className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${
                  tier.id === 'pro'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {checkoutLoading === tier.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  'Purchase'
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Credit Costs Info */}
        <div className="bg-blue-50 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-blue-900 mb-3">Credit Costs Per Image</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500">DALL-E 2</div>
              <div className="text-lg font-semibold text-gray-900">1 credit</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500">DALL-E 3</div>
              <div className="text-lg font-semibold text-gray-900">2 credits</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500">GPT Image 1 Mini</div>
              <div className="text-lg font-semibold text-gray-900">1 credit</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500">GPT Image 1</div>
              <div className="text-lg font-semibold text-gray-900">3 credits</div>
            </div>
          </div>
        </div>

        {/* Purchase History */}
        {history.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Purchase History</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Package</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Credits</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(payment.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 capitalize">{payment.tierId}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{payment.credits}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatPrice(payment.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
