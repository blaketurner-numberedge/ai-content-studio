// Credit system API client
import { apiFetch } from './api';

export interface CreditBalance {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
}

export interface PricingTier {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
}

export interface PaymentHistory {
  id: string;
  tierId: string;
  credits: number;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

// Model credit costs
export const MODEL_CREDIT_COSTS: Record<string, number> = {
  'dall-e-2': 1,
  'dall-e-3': 2,
  'gpt-image-1': 3,
  'gpt-image-1-mini': 1,
};

// Get user ID from localStorage or generate new one
function getUserId(): string {
  let userId = localStorage.getItem('deviceId');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('deviceId', userId);
  }
  return userId;
}

// Headers with user ID
function getHeaders(): Record<string, string> {
  return { 'x-device-id': getUserId() };
}

export async function getCreditBalance(): Promise<CreditBalance> {
  const res = await apiFetch('/api/credits/balance', { headers: getHeaders() });
  return res.json();
}

export async function getPricingTiers(): Promise<PricingTier[]> {
  const res = await apiFetch('/api/credits/tiers');
  return res.json();
}

export async function getModelCosts(): Promise<Record<string, number>> {
  const res = await apiFetch('/api/credits/model-costs');
  return res.json();
}

export async function createCheckoutSession(tierId: string): Promise<{ sessionId: string; url: string }> {
  const res = await apiFetch('/api/credits/checkout', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ tierId }),
  });
  return res.json();
}

export async function verifyPayment(sessionId: string): Promise<{ success: boolean; creditsAdded: number; balance: number }> {
  const res = await apiFetch('/api/credits/verify', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sessionId }),
  });
  return res.json();
}

export async function getPaymentHistory(): Promise<PaymentHistory[]> {
  const res = await apiFetch('/api/credits/history', { headers: getHeaders() });
  return res.json();
}
