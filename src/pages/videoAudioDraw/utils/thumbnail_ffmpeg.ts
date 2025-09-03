import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// 创建FFmpeg实例
const ffmpeg = new FFmpeg();

// 新增：预加载和缓存管理
let videoCache = new Map<string, string>(); // 文件哈希 -> 虚拟文件名

// 超高速缩略图提取
export async function extractThumbnails({ 
  videoFile, 
  timestamps, 
  startTime = 0,
  endTime = 0,
  numThumbs = 0,
  options = {} 
}: {
  videoFile: File;
  timestamps?: number[];
  startTime?: number;
  endTime?: number;
  numThumbs?: number;
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

        // 一次执行批量出图
        await ffmpeg.exec([
            '-ss', String(startTime),        // 可选：如果只在一个区间内取
            // '-to', String(endTime),          // 可选
            '-i', inputFileName,
            '-vf', `fps=${numThumbs/(endTime-startTime || 1)},scale=${width}:${height}:flags=neighbor`,
            '-qscale:v', '7',               // 质量（7~10 更快）
            '-frames:v', String(numThumbs), // 强制只出 N 张
            '-y',
            'thumb_%03d.jpeg'
          ]);

          const promise = async(num: number) => {
            const data = await ffmpeg.readFile(`thumb_${`${num}`.padStart(3, '0')}.jpeg`);
            const blob = new Blob([data], { type: `image/${format}` });
            const url = URL.createObjectURL(blob);
            return url;
        }
          const promises = Array.from({ length: numThumbs }, (_, i) => promise(i + 1));

        // 并行处理所有时间点
        // const promises = timestamps.map(async (timestamp, index) => {
        //     const outputFileName = `thumb_${uniqueId}_${index}.${format}`;
            
        //     const args = [
        //         '-ss', timestamp.toString(),  // 先定位，减少解码时间
        //         '-i', inputFileName,
        //         '-vframes', '1',
        //         '-vf', `scale=${width}:${height}:flags=neighbor`, // 最快缩放
        //         '-q:v', '20', // 降低质量提升速度
        //         '-y',
        //         outputFileName
        //     ];
            
        //     await ffmpeg.exec(args);
        //     const data = await ffmpeg.readFile(outputFileName);
        //     const blob = new Blob([data], { type: `image/${format}` });
        //     const url = URL.createObjectURL(blob);
        //     // 清理单个输出文件
        //     try {
        //         await ffmpeg.deleteFile(outputFileName);
        //     } catch (error) {
        //         console.warn(`文件清理失败，但不影响功能:`, error);
        //     }
        //     return url;
        // });

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
export function clearCache() {
  if (ffmpeg) {
    ffmpeg.terminate();
  }
}
