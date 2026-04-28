import { AsyncLocalStorage } from 'async_hooks';

interface RlsStore {
  userId: string;
}

const storage = new AsyncLocalStorage<RlsStore>();

export const rlsContext = {
  /**
   * Run `fn` with `userId` set as the RLS identity for every pg query
   * made within this async call tree.
   */
  run<T>(userId: string, fn: () => T): T {
    return storage.run({ userId }, fn);
  },

  /** Returns the current user's Better Auth ID, or null outside a context. */
  getUserId(): string | null {
    return storage.getStore()?.userId ?? null;
  },
};
