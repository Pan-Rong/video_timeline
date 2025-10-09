export class ThumbnailWorkerAdapter {
    private worker: Worker;
    private pendingMessages = new Map<string, { resolve: Function; reject: Function }>(); // 使用字符串ID

    constructor(workerPath: string = '/workers/thumbnail/worker.js') {
        this.worker = new Worker(workerPath);
        this.setupMessageHandler();
    }

    // 获取已存在的时间点
    async getExistedTimes(): Promise<number[]> {
        const result = await this.sendMessage('getExistedTimes', {});
        return result?.existedTimes || [];
    }

    private setupMessageHandler() {
        this.worker.onmessage = (event) => {
            const { type, id, payload } = event.data;
            
            // if (type === 'thumbnailResult') {
            //     // 特殊处理ImageBitmap传输
            //     const { blob, time } = payload;
            //     const pending = this.pendingMessages.get(id);
            //     if (pending) {
            //         pending.resolve({ blob, time });
            //         this.pendingMessages.delete(id);
            //     }
            // } 
            if (type === 'response') {
                const pending = this.pendingMessages.get(id);
                if (pending) {
                    pending.resolve(payload);
                    this.pendingMessages.delete(id);
                }
            } else if (type === 'error' || type === 'workerError') {
                const pending = this.pendingMessages.get(id);
                if (pending) {
                    pending.reject(new Error(payload.error));
                    this.pendingMessages.delete(id);
                }
            }
        };
    }

    private sendMessage(type: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substring(2); // 生成随机ID
            this.pendingMessages.set(id, { resolve, reject });
            
            this.worker.postMessage({
                type,
                id,
                payload
            });
        });
    }

    // 公共API
    async initialize(): Promise<boolean> {
        const result = await this.sendMessage('initialize', {});
        return result.initialized;
    }

    async getThumbnail(time: number): Promise<Blob | null> {
        const result = await this.sendMessage('getThumbnail', { time });
        return result?.blob || null;
    }

    async saveThumbnail(time: number, blob: Blob): Promise<void> {
        await this.sendMessage('saveThumbnail', { time, blob });
    }

    async saveMultiThumbnails(tasks: Array<{ time: number; blob: Blob }>): Promise<void> {
        await this.sendMessage('saveMultiThumbnails', { tasks });
    }

    async preloadAround(currentTime: number, direction?: string, intervalSec?: number): Promise<void> {
        await this.sendMessage('preloadAround', { 
            currentTime, 
            direction: direction || 'none', 
            intervalSec: intervalSec || 1 
        });
    }

    // 新增：获取多时间点的缩略图
    async getMultiThumbnails(times: number[]): Promise<Array<{ time: number; blob: Blob }>> {
        const result = await this.sendMessage('getMultiThumbnails', { times });
        return result?.thumbnails || [];
    }

    async getCacheStats(): Promise<any> {
        return await this.sendMessage('getCacheStats', {});
    }

    async getOrderedThumbnails(options: { startTime: number; endTime: number; count: number }): Promise<any> {
        return await this.sendMessage('getOrderedThumbnails', options);
    }

    async clearAll(): Promise<void> {
        await this.sendMessage('clearAll', {});
    }

    terminate(): void {
        this.worker.terminate();
    }

    // 时间点对齐
    adaptTime(time: number): number {
        return Math.round(time * 10) / 10;
    }
}