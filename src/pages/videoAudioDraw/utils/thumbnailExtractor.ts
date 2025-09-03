import { THUMBNAIL_WIDTH, TRACK_HEIGHT, TrackType } from '../models/constant';

export class FastThumbnailExtractor {
  private videoPool: HTMLVideoElement[] = [];
  private canvasPool: OffscreenCanvas[] = [];
  
  constructor(private maxConcurrency = 4) {
    // 预创建 video 和 canvas 池
    for (let i = 0; i < maxConcurrency; i++) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      this.videoPool.push(video);
      
      const canvas = new OffscreenCanvas(THUMBNAIL_WIDTH * 2, TRACK_HEIGHT[TrackType.VIDEO] * 2);
      this.canvasPool.push(canvas);
    }
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
  }): Promise<string[]> {
    // 分批并行处理
    const url = URL.createObjectURL(videoFile);
    const results = await this.processInBatches(tasks, url);
    
    URL.revokeObjectURL(url);
    return results;
  }

  private async processInBatches(tasks: any[], url: string): Promise<string[]> {

    // 添加错误捕获

    const results = new Array(tasks.length);
    try {
      const batches = this.splitIntoBatches(tasks, this.maxConcurrency);
 
      for (const batch of batches) {
        const batchPromises = batch.map(task => 
          this.extractSingleThumbnail(url, task.time, task.index)
        );
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((result, i) => {
          results[batch[i].index] = result;
        });
      }
      
      return results;
    } catch (err) {
      console.log('-err-111-', err);
    }
    
    return results;
  }

  private async extractSingleThumbnail(
    url: string, 
    time: number, 
    index: number
  ): Promise<{
    startTime: number;
    url: string;
  }> {
    const video = this.videoPool[index % this.maxConcurrency];

   

    let shouldBreak = false;

    
    return new Promise((resolve, reject) => {
      video.onerror = () => {
        reject(new Error('Video loading failed'));
      };
      video.onloadedmetadata = () => {
        video.currentTime = time;
      };
      
      video.onseeked = () => {
        if (video.src !== url) {
          return;
        }

        const canvas = this.canvasPool[index % this.maxConcurrency];
        // 确保画布尺寸正确
        // 每次都重新设置尺寸，确保万无一失
        canvas.width = THUMBNAIL_WIDTH * 2;
        canvas.height = TRACK_HEIGHT[TrackType.VIDEO] * 2;
  
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // 使用同步的 convertToBlob
        canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
          .then(blob => {
          

            try {
              const img = document.createElement('img');
              img.src = URL.createObjectURL(blob);
              document.body.appendChild(img);

              resolve({
                startTime: time,
                url: URL.createObjectURL(blob)
              })
            } catch (err) {
              console.log('-err-222-11111', err);
            }
          })
          .catch(reject);
        
      };
      
      if (video.src !== url) {
        video.src = url;
      } else {
        video.currentTime = time;
      }
    });
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

  destroy() {
    this.videoPool.forEach(v => v.remove());
    this.canvasPool.forEach(c => c.width = 0);
  }
}



/*
// 使用示例
if (videoFile) {
      const extractor = new FastThumbnailExtractor(4);
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