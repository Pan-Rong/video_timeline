import { MemoryThumbnailCacheLRU } from './memory-cache-lru';
import { PreloadStrategy } from './preload-strategy';
import { ThumbnailWorkerAdapter } from './thumbnailWorkerAdapter';

export class ThumbnailManager {
    private memoryCache = new MemoryThumbnailCacheLRU(60);
    private preloadStrategy = new PreloadStrategy();
    private thumbnailWorkerAdapter = new ThumbnailWorkerAdapter();
    private existedTimes = new Set<number>(); // 已存在的时间点

    private isInitialized = false;

    constructor(videoId: string = '_current_video_') {
       // todo 
    }

    async initialize(): Promise<boolean> {
        // 初始化
        const initialized = await this.thumbnailWorkerAdapter.initialize();
        this.isInitialized = initialized;
        return initialized;
    }

    getInitialized(): boolean { 
        return this.isInitialized;
    }

    getOrderedThumbnails({ startTime, endTime, count }: { startTime: number, endTime: number, count: number }) {
        return this.memoryCache.getOrderedThumbnails({ startTime, endTime, count });
    }

    async getThumbnail(time: number): Promise<ImageBitmap | null> {
        const aTime = this.adaptTime(time);

        if (!this.isInitialized) {
            throw new Error('ThumbnailManager not initialized');
        }

        // 1. 内存缓存
        const fromMemory = await this.memoryCache.get(aTime);
        if (fromMemory) return fromMemory;

        // 2. worker 中获取
        const fromWorker = await this.thumbnailWorkerAdapter.getThumbnail(aTime);
        if (fromWorker) {
            const img = await createImageBitmap(fromWorker);
            this.memoryCache.set(aTime, img);
            return img;
        }

        return null;
    }

    // 并行存储到两层缓存
    async saveThumbnail({ time, blob }: {time: number, blob: Blob}){
        const aTime = this.adaptTime(time);
        this.existedTimes.add(aTime); // 标记为已存在

        if (blob?.constructor.name !== 'Blob') {
            console.error('saveThumbnail: blob is not a Blob instance');
            return;
        }

        // 并行处理存储
        Promise.all([
            createImageBitmap(blob).then(img => this.memoryCache.set(aTime, img)),
            this.thumbnailWorkerAdapter.saveThumbnail(aTime, blob)
        ])
    }

    async saveMultiThumbnails({ tasks }: { tasks: { time: number, blob: Blob }[] }) {
        await Promise.all(tasks.map(task => this.saveThumbnail(task)));
    }

    async preloadAround(currentTime: number, direction?: 'left' | 'right', intervalSec?: number): Promise<void> {
        const preloadTimes = this.preloadStrategy.calculate(currentTime, direction, intervalSec);
        
        // 批量预加载，使用 Promise.allSettled 避免阻塞
        const promises = preloadTimes.map(time => 
            this.getThumbnail(time).catch(() => null)
        );
        
        await Promise.allSettled(promises);
    }

    adaptTime(time: number): number {
        // 四舍五入到0.1秒，减少缓存碎片
        return Math.round(time * 10) / 10;
    }
    getCacheStats() {
        return {
            memory: this.memoryCache.getStats(),
        };
    }
    getCacheSize(): number {
        return this.memoryCache.getStats().size || 0;
    }

    getExistedTimes(): Set<number> {
        return this.existedTimes;
    }

    hasExistedTime(time: number): boolean {
        return this.existedTimes.has(this.adaptTime(time));
    }

    async clearAll(): Promise<void> {
        this.existedTimes.clear(); // 清空已存在的时间点
        this.memoryCache.clear();
        await this.thumbnailWorkerAdapter.clearAll();
    }
}