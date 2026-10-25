// Keep the game playable if browser storage is unavailable.
const memory = new Map<string, string>();
export const safeStorage = {
  getItem(key: string): string | null {
    try { return localStorage.getItem(key) ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; }
  },
  setItem(key: string, value: string) {
    memory.set(key, value);
    try { localStorage.setItem(key, value); } catch { /* Session-only fallback. */ }
  },
  removeItem(key: string) {
    memory.delete(key);
    try { localStorage.removeItem(key); } catch { /* Session-only fallback. */ }
  },
};
