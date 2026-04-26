import { LruCache } from '@/server/adapters/lru-cache';
import { describe, expect, it } from 'vitest';

describe('LruCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = new LruCache<string>(3);
    expect(cache.get('x')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    const cache = new LruCache<string>(3);
    cache.set('a', 'alpha');
    expect(cache.get('a')).toBe('alpha');
  });

  it('evicts the least-recently-used entry when at capacity', () => {
    const cache = new LruCache<number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    // 'a' is LRU — access 'b' and 'c' to push 'a' to the back
    cache.get('b');
    cache.get('c');
    cache.set('d', 4); // should evict 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('d')).toBe(4);
  });

  it('promotes a recently accessed key (get refreshes LRU order)', () => {
    const cache = new LruCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' is now MRU; 'b' is LRU
    cache.set('c', 3); // should evict 'b', not 'a'
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('promotes a key on set if it already exists', () => {
    const cache = new LruCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 99); // update 'a'; 'b' is now LRU
    cache.set('c', 3); // should evict 'b'
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(99);
  });

  it('handles a capacity of 1', () => {
    const cache = new LruCache<string>(1);
    cache.set('a', 'alpha');
    cache.set('b', 'beta'); // evicts 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('beta');
  });

  it('reports size correctly', () => {
    const cache = new LruCache<number>(5);
    expect(cache.size).toBe(0);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);
  });
});
