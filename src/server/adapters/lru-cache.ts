/** Doubly-linked-list node. */
interface Node<V> {
  key: string;
  value: V;
  prev: Node<V> | null;
  next: Node<V> | null;
}

/**
 * Simple in-memory LRU cache.
 * Evicts the least-recently-used entry when `capacity` is exceeded.
 * get() and set() are both O(1).
 */
export class LruCache<V> {
  private readonly map = new Map<string, Node<V>>();
  private head: Node<V> | null = null; // most-recently used
  private tail: Node<V> | null = null; // least-recently used

  constructor(private readonly capacity: number) {
    if (capacity < 1) throw new RangeError('LruCache capacity must be >= 1');
  }

  get size(): number {
    return this.map.size;
  }

  get(key: string): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.promote(node);
    return node.value;
  }

  set(key: string, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.promote(existing);
      return;
    }
    const node: Node<V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.prepend(node);
    if (this.map.size > this.capacity) {
      this.evict();
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Move an existing node to the head (most-recently used). */
  private promote(node: Node<V>): void {
    if (node === this.head) return;
    this.unlink(node);
    this.prepend(node);
  }

  /** Insert a node at the head. */
  private prepend(node: Node<V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  /** Detach a node from the list without removing from map. */
  private unlink(node: Node<V>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  /** Remove the tail (LRU). */
  private evict(): void {
    if (!this.tail) return;
    this.map.delete(this.tail.key);
    this.unlink(this.tail);
  }
}
