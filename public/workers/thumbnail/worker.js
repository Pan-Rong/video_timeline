importScripts("indexeddb-store.js", "memory-cache-lru.js", "preload-strategy.js");


class ThumbnailManager {
    memoryCache = new MemoryThumbnailCacheLRU();
    indexedDB = new IndexedDBThumbnailStore();
    preloadStrategy = new PreloadStrategy();
    videoId = '';
    isInitialized = false;

    constructor(videoId = '_current_video_') {
        this.videoId = videoId;  // 目前保留一个视频的信息
    }

    async initialize(callback) {
        await this.indexedDB.init();
        this.isInitialized = true;
        callback?.();
    }

    getInitialized() { 
        return this.isInitialized;
    }

    getOrderedThumbnails({ startTime, endTime, count }) {
        return this.memoryCache.getOrderedThumbnails({ startTime, endTime, count });
    }

    async getThumbnail(time, dataMode = 'string') {
        const aTime = this.adaptTime(time);

        if (!this.isInitialized) {
            throw new Error('ThumbnailManager not initialized');
        }

        // 1. 内存缓存
        const fromMemory = await this.memoryCache.get(aTime);
        if (fromMemory) return dataMode === 'obj' ? { blob: fromMemory, time: aTime } : fromMemory;

        // 2. IndexedDB
        const fromDB = await this.indexedDB.getThumbnail(aTime, this.videoId);
        if (fromDB) {
            this.memoryCache.set(aTime, fromDB);
            return dataMode === 'obj' ? { blob: fromDB, time: aTime } : fromDB;
        }

        return null;
    }

    async getMultiThumbnails({ times }) {
        const results = await Promise.all(times.map(time => this.getThumbnail(time, 'obj')));
        return results;
    }

    // 并行存储到两层缓存
    async saveThumbnail({ time, blob }){
        const aTime = this.adaptTime(time);

        await Promise.all([
            this.memoryCache.set(aTime, blob),
            this.indexedDB.saveThumbnail(aTime, blob, this.videoId)
        ]);
    }

    async saveMultiThumbnails({ tasks }) {
        await Promise.all(tasks.map(task => this.saveThumbnail(task)));
    }

    async preloadAround(currentTime, direction = 'none', intervalSec = 1) {
        const preloadTimes = this.preloadStrategy.calculate(currentTime, direction, intervalSec);
        
        // 批量预加载，使用 Promise.allSettled 避免阻塞
        const promises = preloadTimes.map(time => 
            this.getThumbnail(time).catch(() => null)
        );
        
        await Promise.allSettled(promises);
    }

    adaptTime(time) {
        // 四舍五入到0.1秒，减少缓存碎片
        return Math.round(time * 10) / 10;
    }

    getCacheStats() {
        return {
            memory: this.memoryCache.getStats(),
            indexedDB: 'IndexedDB stats would go here'
        };
    }
    getCacheSize() {
        return this.memoryCache.getStats().size || 0;
    }

    async clearAll() {
        this.memoryCache.clear();
        // IndexedDB 清理在初始化时自动处理
        await this.indexedDB.clearAll(); 
    }
}

// 创建全局实例
const thumbnailManager = new ThumbnailManager();

// 消息处理系统
self.onmessage = async function(event) {
    const { type, id, payload } = event.data;
    try {
        let result;
        
        switch(type) {
            case 'initialize':
                await thumbnailManager.initialize();
                result = { success: true, initialized: thumbnailManager.getInitialized() };
                break;
                
            case 'getThumbnail':
                const blob = await thumbnailManager.getThumbnail(payload.time);

                result = { blob, time: payload.time };
                break;
                // if (blob) {
                //     // 传输Blob到主线程
                //     self.postMessage({
                //         type: 'thumbnailResult',
                //         id,
                //         payload: { blob, time: payload.time }
                //     }, [blob]); // 转移所有权
                // } else {
                //     result = { success: false, error: 'Thumbnail not found' };
                // }
                // return; // 已经手动发送响应
            case 'getMultiThumbnails':
                result = await thumbnailManager.getMultiThumbnails(payload);
                break;
            case 'saveThumbnail':
                await thumbnailManager.saveThumbnail(payload);
                result = { success: true };
                break;
                
            case 'saveMultiThumbnails':
                await thumbnailManager.saveMultiThumbnails(payload);
                result = { success: true };
                break;
                
            case 'preloadAround':
                await thumbnailManager.preloadAround(
                    payload.currentTime, 
                    payload.direction, 
                    payload.intervalSec
                );
                result = { success: true };
                break;
                
            case 'getCacheStats':
                result = thumbnailManager.getCacheStats();
                break;

            case 'getExistedTimes':
                result = thumbnailManager.getExistedTimes();
                break;
                
            case 'getOrderedThumbnails':
                result = thumbnailManager.getOrderedThumbnails(payload);
                break;
                
            case 'clearAll':
                await thumbnailManager.clearAll();
                result = { success: true };
                break;
                
            // case 'setVideoId':
            //     thumbnailManager.videoId = payload.videoId;
            //     result = { success: true };
            //     break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
        
        // 标准响应格式
        self.postMessage({
            type: 'response',
            id,
            payload: result
        });
        
    } catch (error) {
        self.postMessage({
            type: 'error',
            id,
            payload: { 
                error: error.message,
                stack: error.stack 
            }
        });
    }
};

// 错误处理
self.onerror = function(error) {
    console.error('Worker error:', error);
    self.postMessage({
        type: 'workerError',
        payload: { error: error.message }
    });
};