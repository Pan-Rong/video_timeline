// interface ThumbnailRecord {
//   time: number;
//   blob: Blob;
//   timestamp: number;
//   videoId: string;
// }

class IndexedDBThumbnailStore {
  dbName = 'VideoThumbnailsDB';
  version = 1;
  storeName = 'thumbnails';
  db = null;

  // 初始化数据库
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // 创建新存储
          const store = db.createObjectStore(this.storeName, { keyPath: 'time' });
          store.createIndex('videoId', 'videoId', { unique: false });
          // store.createIndex('timestamp', 'timestamp', { unique: false });
        } else {
          // 存储已存在，无需创建,则清空旧数据
          const transaction = db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.clear();
          request.onsuccess = () => {
            console.log('--数据清空成功--')
          };
          request.onerror = () => reject(request.error);
        }
      };
    });
  }

  // 保存缩略图
  async saveThumbnail(time, blob, videoId) {
    if (!this.db) await this.init();
    
    const record = {
      time,
      blob,
      timestamp: Date.now(),
      videoId
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db ? this.db.transaction([this.storeName], 'readwrite') : null;
      if (!transaction) return reject(new Error('数据库事务创建失败'));
      const store = transaction.objectStore(this.storeName);
      const request = store.put(record);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 获取指定时间的缩略图
  async getThumbnail(time, videoId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db ? this.db.transaction([this.storeName], 'readonly') : null;
      if (!transaction) return reject(new Error('数据库事务创建失败'));
      const store = transaction.objectStore(this.storeName);
      const index = store.index('videoId');
      const request = index.getAll(videoId);
      
      request.onsuccess = () => {
        const results = request.result || [];
        const exactMatch = results.find(r => Math.abs(r.time - time) < 0.1);
        resolve(exactMatch ? exactMatch.blob : null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // 清理过期数据
  async cleanup(videoId, maxAge = 1 * 24 * 60 * 60 * 1000) {
    if (!this.db) await this.init();
    
    const cutoffTime = Date.now() - maxAge;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db ? this.db.transaction([this.storeName], 'readwrite') : null;
      if (!transaction) return reject(new Error('数据库事务创建失败'));
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const record = cursor.value;
          if (record.videoId === videoId) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // 清除所有数据
  async clearAll() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db ? this.db.transaction([this.storeName], 'readwrite') : null;
      if (!transaction) return reject(new Error('数据库事务创建失败'));
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 删除数据库
  async deleteDatabase() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}