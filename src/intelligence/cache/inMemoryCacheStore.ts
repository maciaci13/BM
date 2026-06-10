import type { CacheEntry, CacheStore } from './contracts';

export class InMemoryCacheStore implements CacheStore {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;

    if (entry.expiresAt && new Date(entry.expiresAt).getTime() < Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  async set<T>(entry: CacheEntry<T>): Promise<void> {
    this.entries.set(entry.key, entry as CacheEntry<unknown>);
  }

  async invalidate(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async invalidateByTag(tag: string): Promise<void> {
    for (const [key, entry] of this.entries.entries()) {
      if (entry.tags?.includes(tag)) {
        this.entries.delete(key);
      }
    }
  }
}
