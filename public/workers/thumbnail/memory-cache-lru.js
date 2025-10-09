// interface CacheNode {
//   key: number;
//   data: ImageBitmap;
//   timestamp: number;
//   prev: CacheNode | null;
//   next: CacheNode | null;
// }

class MemoryThumbnailCacheLRU {
  cache = new Map();// new Map<number, CacheNode>();
  maxSize = 100;
  head = null;
  tail = null;
  currentSize = 0;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  async get(time) {
    const key = this.getKey(time);
    const node = this.cache.get(key);
    
    if (node) {
      this.moveToHead(node);
      return node.data;
    }
    
    return null;
  }

  async set(time, data) {
    const key = this.getKey(time);
    let node = this.cache.get(key);

    if (node) {
        // 已存在，更新数据并移到头部
        node.data = node.data;
        node.timestamp = Date.now();
        this.moveToHead(node);
    } else {
        node = {
            key,
            data,
            timestamp: Date.now(),
            prev: null,
            next: null
        };

        if (this.currentSize >= this.maxSize) {
            this.removeTail();
        }

        this.addToHead(node);
        this.cache.set(key, node);
        this.currentSize++;
    }
  }

  // 获取按时间排序的所有缩略图
  getOrderedThumbnails({ startTime, endTime, count }) {
    const result = [];
    let current = this.head;

    while (current) {
        // 过滤出指定时间范围内的缩略图   
        if (current.key >= startTime && current.key <= endTime) {
            result.push({
                time: current.key,
                data: current.data,
                timestamp: current.timestamp
            });
        }
      current = current.next;
    }
    // 按时间排序
    const filtered = result.sort((a, b) => a.time - b.time);

    // 只返回指定数量的缩略图
    return filtered.slice(0, count);
  }

  // 获取最近访问的缩略图（LRU顺序）
  getRecentAccessOrder() { //  Array<{ time: number; data: ImageBitmap; timestamp: number }>
    const result = [];
    let current = this.head;

    while (current) {
      result.push({
        time: current.key,
        data: current.data,
        timestamp: current.timestamp
      });
      current = current.next;
    }

    return result;
  }

  addToHead(node) {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  removeNode(node) {

    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  moveToHead(node) {
    this.removeNode(node);
    this.addToHead(node);
  }

  removeTail() {
    if (!this.tail) return;

    const key = this.tail.key;
    if (this.tail.data) {
      // 释放资源
      this.tail.data = null;
    }
    this.removeNode(this.tail);
    this.cache.delete(key);
    this.currentSize--;
  }

  getKey(time) {
    return Math.round(time * 10) / 10;
  }

  clear() {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.currentSize = 0;
  }

  getStats() {
    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      hitRate: `${((this.maxSize - this.currentSize) / this.maxSize * 100).toFixed(1)}%`,
      headTime: this.head ? new Date(this.head.timestamp).toLocaleTimeString() : null,
      tailTime: this.tail ? new Date(this.tail.timestamp).toLocaleTimeString() : null
    };
  }
}