export type CacheEntry<T> = {
  key: string;
  value: T;
  createdAt: string;
  expiresAt?: string | null;
  tags?: string[];
};

export interface CacheStore {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(entry: CacheEntry<T>): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidateByTag(tag: string): Promise<void>;
}
