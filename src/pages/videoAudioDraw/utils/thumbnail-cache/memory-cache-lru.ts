interface CacheNode {
  key: number;
  data: ImageBitmap;
  timestamp: number;
  prev: CacheNode | null;
  next: CacheNode | null;
}

export class MemoryThumbnailCacheLRU {
  private cache = new Map<number, CacheNode>();
  private maxSize: number;
  private head: CacheNode | null = null;
  private tail: CacheNode | null = null;
  private currentSize = 0;

  constructor(maxSize = 60) {
    this.maxSize = maxSize;
  }

  async get(time: number): Promise<ImageBitmap | null> {
    const key = this.getKey(time);
    const node = this.cache.get(key);
    
    if (node) {
      this.moveToHead(node);
      return node.data;
    }
    
    return null;
  }

  async set(time: number, data: ImageBitmap): Promise<void> {
    const key = this.getKey(time);
    let node = this.cache.get(key);

    if (node) {
        // 已存在，更新数据并移到头部
        node.data = node.data;
        node.timestamp = Date.now();
        this.moveToHead(node);
    } else {
      // 创建新节点
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
  getOrderedThumbnails({ startTime, endTime, count }: { startTime: number; endTime: number; count: number }): Array<{ time: number; data: ImageBitmap; timestamp: number }> {
    const result: Array<{ time: number; data: ImageBitmap; timestamp: number }> = [];
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
  getRecentAccessOrder(): Array<{ time: number; data: ImageBitmap; timestamp: number }> {
    const result: Array<{ time: number; data: ImageBitmap; timestamp: number }> = [];
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

  private addToHead(node: CacheNode): void {
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

  private removeNode(node: CacheNode): void {

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

  private moveToHead(node: CacheNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): void {
    if (!this.tail) return;

    const key = this.tail.key;
    if (this.tail.data) {
      // 关闭并释放 ImageBitmap 资源
      this.tail.data.close();
    }
    this.removeNode(this.tail);
    this.cache.delete(key);
    this.currentSize--;
  }

  private getKey(time: number): number {
    return Math.round(time * 10) / 10;
  }

  clear(): void {
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