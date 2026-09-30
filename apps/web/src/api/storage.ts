export interface IStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const createMemoryStorage = (): IStorageLike => {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
};

// localStorage can be missing (tests) or throw (private mode); fall back to memory.
export const getBrowserStorage = (): IStorageLike => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const probeKey = "sleightbook.probe";
      window.localStorage.setItem(probeKey, probeKey);
      window.localStorage.removeItem(probeKey);
      return window.localStorage;
    }
  } catch {
    // Fall through to in-memory storage.
  }
  return createMemoryStorage();
};
