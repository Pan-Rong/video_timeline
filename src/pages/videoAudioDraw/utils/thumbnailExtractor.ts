import { THUMBNAIL_WIDTH, TRACK_HEIGHT, TrackType } from '../models/constant';

export class FastThumbnailExtractor {
  private maxConcurrency = 3;
  private width = THUMBNAIL_WIDTH;
  private height = TRACK_HEIGHT[TrackType.VIDEO];
  private currentUrl: string | null = null;
  private currentFile: File | null = null;
  private clearURLTimeOptimizedFlg: NodeJS.Timeout | null = null;
  private clearURLTimeFlg: NodeJS.Timeout | null = null;
  
  constructor(maxConcurrency = this.maxConcurrency, width = THUMBNAIL_WIDTH, height = TRACK_HEIGHT[TrackType.VIDEO]) {
    this.width = width;
    this.height = height;
  }

  private getUrl(videoFile: File) {
    // 复用现有URL， 解决多次调用时生产不同url 的问题；
    if (this.currentFile !== videoFile || !this.currentUrl) {
      // 清理旧的
      if (this.currentUrl) {
        URL.revokeObjectURL(this.currentUrl);
      }
      // 创建新的
      this.currentUrl = URL.createObjectURL(videoFile);
      this.currentFile = videoFile;
    }
    return this.currentUrl;
  }

  async optimizedExtractThumbnails({
    videoFile,
    tasks, // 并行任务分组
    partFinishCallback, // 每个并行任务分组完成后的回调
  }: {
    videoFile: File;
    tasks: {
      time: number;
      index: number;
    }[];
    partFinishCallback?: (results: {
      startTime: number;
      blob: Blob;
    }[]) => void; // 每个并行任务分组完成后的回调 
  }) {
    // 优化提取缩略图的逻辑
    const url = this.getUrl(videoFile);
    if (this.clearURLTimeOptimizedFlg) {
      clearTimeout(this.clearURLTimeOptimizedFlg);
    }

    const maxConcurrent = Math.min(6, navigator.hardwareConcurrency || 4); // 限制并发
    const promiseList = [];
    try {
      const batches = this.splitIntoBatches(tasks, maxConcurrent);
 
      for (const batch of batches) {
        // 分批并行处理
        const batchPromises = batch.map(task => 
          this.extractSingleThumbnail(url, task.time, task.index)
        );
        promiseList.push(await Promise.all(batchPromises).then(batchResults => {
          if (partFinishCallback) {
              partFinishCallback(batchResults); // 过滤出成功的结果
            }
        }));
        // // 可选：添加小延迟，避免浏览器过载
        // await new Promise(resolve => setTimeout(resolve, 20));
      }
    } catch (err) {
      console.error('-processInBatches-error-', err);
    }
    Promise.all(promiseList).finally(() => {
      // 10秒后清理URL
      this.clearURLTimeOptimizedFlg = setTimeout(() => URL.revokeObjectURL(url), 10 * 1000);
    });
  }

  async extractThumbnails({
    videoFile,
    tasks, // 并行任务分组
  }: {
    videoFile: File;
    tasks: {
      time: number;
      index: number;
    }[];
  }): Promise<{
    startTime: number;
    blob: Blob;
  }[]> {
    const url = this.getUrl(videoFile);

    // 清理旧的URL
    if (this.clearURLTimeFlg) {
      clearTimeout(this.clearURLTimeFlg);
    }

    // 分批并行处理
    const results = await this.processInBatches(tasks, url);
    // 10秒后清理URL
    this.clearURLTimeFlg = setTimeout(() => URL.revokeObjectURL(url), 10 * 1000);
    return results;
  }

  private async processInBatches(tasks: any[], url: string): Promise<{
    startTime: number;
    url: string;
    blob: Blob;
  }[]> {

    const maxConcurrent = Math.min(6, navigator.hardwareConcurrency || 4); // 限制并发
    const results = new Array(tasks.length).fill(null);
    try {
      const batches = this.splitIntoBatches(tasks, maxConcurrent);
 
      for (const batch of batches) {
        const batchPromises = batch.map(task => 
          this.extractSingleThumbnail(url, task.time, task.index)
        );
        const batchResults = await Promise.all(batchPromises);

        batchResults.forEach((result, i) => {
          results[batch[i].index] = result;
        });
        // 可选：添加小延迟，避免浏览器过载
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    } catch (err) {
      console.error('-processInBatches-error-', err);
    }
    
    return results.filter(item => !!item); // 过滤出成功的结果;
  }

  private async extractSingleThumbnail(
    url: string, 
    time: number, 
    index: number,
  ): Promise<{
    startTime: number;
    blob: Blob;
  }> {

    // 为每个任务创建独立video，避免状态污染
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    // 每次都重新设置尺寸，确保万无一失
    const width = this.width || THUMBNAIL_WIDTH;
    const height = this.height || TRACK_HEIGHT[TrackType.VIDEO];
    const canvas = new OffscreenCanvas(width, height);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
            this.destroyResource({ video, canvas });
            reject(new Error(`Timeout at ${time}s`));
        }, 10 * 1000); // 10秒超时

      video.onerror = () => {
        clearTimeout(timeout);
        this.destroyResource({ video, canvas });
        reject(new Error('Video loading failed'));
      };

      video.onloadedmetadata = () => {
        const safeTime = Math.min(time, video.duration);
        video.currentTime = safeTime;
      };
      
      video.onseeked = async () => {
        console.log('--video-.readyState---', video.readyState)
        if (video.readyState < 2) {
          return;
        }
        try {
          const bmp = await createImageBitmap(video, { 
            resizeWidth: width, 
            resizeHeight: height,
            resizeQuality: 'medium'
          });
    
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(bmp, 0, 0, width, height);
          // 释放资源
          bmp.close();
          if (!!canvas.width) {
            canvas.convertToBlob({ type: 'image/webp', quality: 0.7 }).then((blob) => {
              // const img = document.createElement('img');
              // img.src = URL.createObjectURL(blob);
              // document.body.appendChild(img);
              clearTimeout(timeout);
              this.destroyResource({ video, canvas });
              resolve({
                startTime: time,
                blob,
              })
            });
          } else {
            clearTimeout(timeout);
            this.destroyResource({ video, canvas });
            reject(`抽帧失败-canvas:0--time:${time}`)
          }
        } catch (err) {
          clearTimeout(timeout);
          this.destroyResource({ video, canvas });
          reject(`抽帧失败--time:${time}`)
        }
      };
      video.src = url;
      video.load();
    });
  }

  private destroyResource({ video, canvas }: { video: HTMLVideoElement; canvas: OffscreenCanvas }) {
    video.remove(); // 移除当前video实例
    // 重置canvas尺寸，避免内存泄漏
    canvas.width = 0;
    canvas.height = 0;
  }

  private async getVideoDuration(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = reject;
      video.src = url;
    });
  }

  private splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
}



/*
// 使用示例
if (videoFile) {
      const extractor = new FastThumbnailExtractor(3, testData.width, testData.height);
      const tasks = [];
      const startTime = Date.now();
      for (let time = testData.startTimeSec, index = 0; time <= testData.endTimeSec; time += testData.intervalSec, index++) {
          tasks.push({ time, index });
      }
      extractor.extractThumbnails({ videoFile, tasks }).then(res => {
          console.log('----res-FastThumbnailExtractor---', Date.now() - startTime, res);
      });
      extractor.destroy();
  }
*/