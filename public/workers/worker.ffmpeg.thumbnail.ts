// worker.thumbnail.ts - 放在 public/workers/ 目录下
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// 创建FFmpeg实例
const ffmpeg = new FFmpeg();

// 消息处理
self.onmessage = async (event) => {
  const { type, payload, id } = event.data;
  
  try {
    switch (type) {
      case 'EXTRACT_THUMBNAILS':
        const result = await extractThumbnails(payload);
        self.postMessage({ type: 'SUCCESS', id, result });
        break;
      case 'CLEAR_CACHE':
        clearCache();
        self.postMessage({ type: 'SUCCESS', id, result: 'Cache cleared' });
        break;
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// 新增：预加载和缓存管理
let videoCache = new Map<string, string>(); // 文件哈希 -> 虚拟文件名

// 超高速缩略图提取
async function extractThumbnails({ 
  videoFile, 
  timestamps, 
  options = {} 
}: {
  videoFile: File;
  timestamps: number[];
  options: {
    width?: number;
    height?: number;
    format?: string;
  };
}) {
    const logStartTime = new Date().getTime();
    const {
        width = 80,       // 默认宽度
        height = 60,      // 默认高度
        format = 'jpeg'    // 默认格式
    } = options;
    try {
        if (!ffmpeg.loaded) {
            await ffmpeg.load({
                coreURL: await toBlobURL(`/ffmpeg/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(
                    '/ffmpeg/ffmpeg-core.wasm',
                    "application/wasm"
                ),
                workerURL: await toBlobURL(
                    `/ffmpeg/ffmpeg-core.worker.js`,
                    "text/javascript"
                ),
            });
        }
        // 生成文件唯一标识（避免重复写入）
        const fileKey = `${videoFile.name}_${videoFile.size}_${videoFile.lastModified}`;
        let inputFileName = videoCache.get(fileKey);
        
        // 只写入一次视频文件
        if (!inputFileName) {
            const writeStart = Date.now();
            inputFileName = `cached_${fileKey.replace(/[^a-zA-Z0-9]/g, '_')}.${videoFile.name.split('.').pop()}`;
            const fileData = await fetchFile(videoFile);
            await ffmpeg.writeFile(inputFileName, fileData);
            videoCache.set(fileKey, inputFileName);
            console.log(`视频文件写入耗时: ${Date.now() - writeStart}ms`);
        }

        const uniqueId = Date.now();
        // 并行处理所有时间点
        const promises = timestamps.map(async (timestamp, index) => {
            const outputFileName = `thumb_${uniqueId}_${index}.${format}`;
            
            const args = [
                '-ss', timestamp.toString(),  // 先定位，减少解码时间
                '-i', inputFileName,
                '-vframes', '1',
                '-vf', `scale=${width}:${height}:flags=neighbor`, // 最快缩放
                '-q:v', '20', // 降低质量提升速度
                '-y',
                outputFileName
            ];
            
            await ffmpeg.exec(args);
            const data = await ffmpeg.readFile(outputFileName);
            const blob = new Blob([data], { type: `image/${format}` });
            const url = URL.createObjectURL(blob);
            // 清理单个输出文件
            try {
                await ffmpeg.deleteFile(outputFileName);
            } catch (error) {
                console.warn(`文件清理失败，但不影响功能:`, error);
            }
            return url;
        });

        const results = await Promise.all(promises);
        // 清理虚拟文件系统
        try {
            await ffmpeg.deleteFile(inputFileName);
            console.log(`文件清理成功`);
        } catch (cleanupError) {
            console.warn(`文件清理失败，但不影响功能:`, cleanupError);
        }
        console.log(`提取视频缩略图成功，耗时: ${new Date().getTime() - logStartTime}ms`);
        return results;
    } catch (error) {
        console.error('批量提取失败:', error);
        throw error;
    }
}

// 清理缓存
function clearCache() {
  if (ffmpeg) {
    ffmpeg.terminate();
  }
}

/*
// 以下为在react 中的使用示例
    const worker = new Worker('/workers/worker.thumbnail.js', { type: 'module' });

    worker.onmessage = (event) => {
      const { type, id, result, error, progress } = event.data;
      switch (type) {
        case 'SUCCESS':
            // 处理成功结果
            console.log('成功提取缩略图:', result);
            break;
        case 'ERROR':
            // 处理错误结果
            console.error('提取缩略图出错:', error);
            break;
        case 'PROGRESS':
            // 处理进度更新
            console.log('提取进度:', progress);
            break;
      }
    };
    worker.onerror = (error) => {
      console.error('Worker error:', error);
      // 清理所有挂起消息
      worker.terminate();
    };


    worker.postMessage({
      type: 'EXTRACT_THUMBNAILS',
      payload: {
        videoFile,
        timestamps,
        options,
      },
      id: 'extract-thumbnails',
    });
*/