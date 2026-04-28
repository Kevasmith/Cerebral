import { create } from 'zustand';
import { api } from '../api/client';

const useBillingStore = create((set, get) => ({
  plan: 'free',            // 'free' | 'growth' | 'pro'
  status: 'active',        // 'active' | 'past_due' | 'canceled'
  currentPeriodEnd: null,
  loaded: false,

  fetch: async () => {
    try {
      const res = await api.get('/billing/subscription');
      set({ ...res.data, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  reset: () => set({ plan: 'free', status: 'active', currentPeriodEnd: null, loaded: false }),

  isPaid: () => get().plan !== 'free',
  isPro:  () => get().plan === 'pro',
}));

export default useBillingStore;
