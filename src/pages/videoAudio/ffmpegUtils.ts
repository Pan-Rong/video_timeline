import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { FFmpeg } from '@ffmpeg/ffmpeg';


// 创建FFmpeg实例
const ffmpeg = new FFmpeg();

// /**
//  * 从视频文件中提取音频
//  * @param videoFile 视频文件对象
//  * @returns 提取的音频Blob
//  */
// export const extractAudioWithFFmpeg = async (videoFile: File): Promise<Blob> => {
//   try {

//     console.log('---ffmpeg.loaded---', ffmpeg.loaded)
//     // 加载FFmpeg核心库
//     if (!ffmpeg.loaded) {
//       await ffmpeg.load({
//         coreURL: await toBlobURL(`/ffmpeg/ffmpeg-core.js`, "text/javascript"),
//       wasmURL: await toBlobURL(
//        '/ffmpeg/ffmpeg-core.wasm',
//         "application/wasm"
//       ),
//       workerURL: await toBlobURL(
//         `/ffmpeg/ffmpeg-core.worker.js`,
//         "text/javascript"
//       ),
//       });
//     }

//     const processStartTime = Date.now();
    
//     // 为输入和输出文件生成唯一名称
//     const inputFileName = `input_${Date.now()}.${videoFile.name.split('.').pop()}`;
//     const outputFileName = `output_${Date.now()}.MP3`;
    
//     // 将视频文件写入到FFmpeg的虚拟文件系统
//     await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));
    
//     // 5. 执行 FFmpeg 命令提取音频
//     // -i input.mp4: 指定输入文件
//     // -vn: 禁用视频流（只提取音频）
//     // -acodec copy: 直接复制音频编码，不重新编码
//     // output.wav: 输出文件名
//     await ffmpeg.exec([
//         "-i", inputFileName, 
//        "-vn",            // 禁用视频流
//         "-ac", "2",        // 设置为立体声
//         "-ar", "44100",     // 设置采样率为44.1kHz
//         "-b:a", "192k",     // 设置音频比特率为192k
//         "-f", "mp3",        // 设置输出格式为MP3
//         outputFileName
//     ]);

//     // 6. 读取提取的音频文件
//     const audioData: any = await ffmpeg.readFile(outputFileName);

//     // 创建音频Blob对象
//     const audioBlob = new Blob([audioData.buffer], { type: 'audio/mpeg' });

//     const audioUrl = URL.createObjectURL(audioBlob);

//     console.log('----audioUrl----', audioUrl)
    
//     // 性能监控
//     const processTime = Date.now() - processStartTime;
//     console.log(`FFmpeg音频提取完成，耗时: ${processTime}ms`);
    
 
    
//     return audioBlob;
//   } catch (error) {
//     console.error('FFmpeg音频提取失败:', error);
//     throw error;
//   }
// };

// /**
//  * 从视频文件中提取音频
//  * @param videoFile 视频文件对象
//  * @returns 提取的音频Blob
//  */
// export const extractAudioWithFFmpeg = async (videoFile: File): Promise<Blob> => {
//   try {
//     console.log('---ffmpeg.loaded---', ffmpeg.loaded)
//     // 加载FFmpeg核心库
//     if (!ffmpeg.loaded) {
//       await ffmpeg.load({
//         coreURL: await toBlobURL(`/ffmpeg/ffmpeg-core.js`, "text/javascript"),
//         wasmURL: await toBlobURL(
//          '/ffmpeg/ffmpeg-core.wasm',
//           "application/wasm"
//         ),
//         workerURL: await toBlobURL(
//           `/ffmpeg/ffmpeg-core.worker.js`,
//           "text/javascript"
//         ),
//       });
//     }

//     const processStartTime = Date.now();
    
//     // 为输入和输出文件生成唯一名称
//     const inputFileName = `input_${Date.now()}.${videoFile.name.split('.').pop()}`;
//     const outputFileName = `output_${Date.now()}.wav`;
    
//     // 将视频文件写入到FFmpeg的虚拟文件系统
//     await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));
    
//     // 执行 FFmpeg 命令提取音频
//     await ffmpeg.exec([
//         "-i", inputFileName, 
//         "-vn", 
//         "-acodec", "copy", 
//         outputFileName
//     ]);

//     // 读取提取的音频文件
//     const audioData: any = await ffmpeg.readFile(outputFileName);

//     // 创建音频Blob对象
//     const audioBlob = new Blob([audioData.buffer], { type: 'audio/wav' });

//     const audioUrl = URL.createObjectURL(audioBlob);

//     console.log('----audioUrl----', audioUrl)
    
//     // 性能监控
//     const processTime = Date.now() - processStartTime;
//     console.log(`FFmpeg音频提取完成，耗时: ${processTime}ms`);
    
//     return audioBlob;
//   } catch (error) {
//     console.error('FFmpeg音频提取失败:', error);
//     throw error;
//   }
// };

/**
 * 从视频文件中提取音频
 * @param videoFile 视频文件对象
 * @param options 提取选项
 * @returns 提取的音频Blob
 */
export const extractAudioWithFFmpeg = async (videoFile: File, options?: {
  format?: 'wav' | 'mp3' | 'ogg'; // 输出格式
  download?: boolean; // 是否自动下载
  filename?: string; // 下载的文件名
}): Promise<Blob> => {
  try {
    // 设置默认选项
    const { 
      format = 'mp3', 
      download = true, 
      filename = `extracted_audio_${Date.now()}.${format}`
    } = options || {};

    console.log('---ffmpeg.loaded---', ffmpeg.loaded)
    // 加载FFmpeg核心库
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

    const processStartTime = Date.now();
    
    // 为输入和输出文件生成唯一名称
    const inputFileName = `input_${Date.now()}.${videoFile.name.split('.').pop()}`;
    const outputFileName = `output_${Date.now()}.${format}`;
    
    // 将视频文件写入到FFmpeg的虚拟文件系统
    await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));
    
    // 执行FFmpeg命令提取音频
    // 根据不同的输出格式选择合适的命令参数
    let ffmpegArgs: string[] = [];
    if (format === 'wav') {
      // 提取为WAV格式（无损）
      ffmpegArgs = [
        "-i", inputFileName,
        "-vn",            // 禁用视频流
        "-ac", "2",        // 设置为立体声
        "-ar", "44100",     // 设置采样率为44.1kHz
        outputFileName
      ];
    } else if (format === 'mp3') {
      // 提取为MP3格式（有损压缩）
      ffmpegArgs = [
        "-i", inputFileName,
        "-vn",            // 禁用视频流
        "-ac", "2",        // 设置为立体声
        "-ar", "44100",     // 设置采样率为44.1kHz
        "-b:a", "192k",     // 设置音频比特率
        outputFileName
      ];
    } else if (format === 'ogg') {
      // 提取为OGG格式（有损压缩）
      ffmpegArgs = [
        "-i", inputFileName,
        "-vn",            // 禁用视频流
        "-ac", "2",        // 设置为立体声
        "-ar", "44100",     // 设置采样率为44.1kHz
        "-q:a", "5",        // 设置质量级别（1-10，越低质量越好）
        outputFileName
      ];
    }

    await ffmpeg.exec(ffmpegArgs);

    // 读取提取的音频文件
    const audioData: any = await ffmpeg.readFile(outputFileName);

    // 根据格式设置正确的MIME类型
    const mimeType = format === 'wav' ? 'audio/wav' : 
                     format === 'mp3' ? 'audio/mpeg' : 'audio/ogg';
                      
    // 创建音频Blob对象
    const audioBlob = new Blob([audioData.buffer], { type: mimeType });

    // 如果设置了下载选项，则触发文件下载
    if (download) {
      const downloadUrl = URL.createObjectURL(audioBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }, 100);
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    console.log('----audioUrl----', audioUrl)
    
    // 性能监控
    const processTime = Date.now() - processStartTime;
    console.log(`FFmpeg音频提取完成，耗时: ${processTime}ms`);
    
    return audioBlob;
  } catch (error) {
    console.error('FFmpeg音频提取失败:', error);
    throw error;
  }
};

/**
 * 在本地生成音频文件
 * @param options 音频生成选项
 */
export const generateAudioFileLocally = async (options: {
  duration?: number; // 音频时长（秒）
  frequency?: number; // 频率（Hz）
  volume?: number; // 音量（0-1）
  type?: 'sine' | 'square' | 'sawtooth' | 'triangle'; // 波形类型
  format?: 'mp3' | 'wav' | 'ogg'; // 输出格式
  filename?: string; // 文件名
}): Promise<void> => {
  try {
    // 设置默认参数
    const { 
      duration = 5, 
      frequency = 440, 
      volume = 0.5, 
      type = 'sine', 
      format = 'mp3', 
      filename = `generated_audio_${Date.now()}.${format}`
    } = options;

    // 加载FFmpeg核心库
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

    // 使用FFmpeg生成音频
    // 创建一个音频生成的命令
    const inputFileName = `input_${Date.now()}.txt`;
    const outputFileName = `output.${format}`;

    // 创建一个文本文件，用于FFmpeg的aevalsrc滤镜
    // 定义波形生成的表达式
    let waveExpression = `aevalsrc=0`;
    switch (type) {
      case 'sine':
        waveExpression = `aevalsrc=sin(2*PI*${frequency}*t)*${volume}:d=${duration}:sample_rate=44100`;
        break;
      case 'square':
        waveExpression = `aevalsrc=sgn(sin(2*PI*${frequency}*t))*${volume}:d=${duration}:sample_rate=44100`;
        break;
      case 'sawtooth':
        waveExpression = `aevalsrc=(2/${Math.PI})*atan(1/tan(PI*${frequency}*t))*${volume}:d=${duration}:sample_rate=44100`;
        break;
      case 'triangle':
        waveExpression = `aevalsrc=(2/${Math.PI})*asin(sin(2*PI*${frequency}*t))*${volume}:d=${duration}:sample_rate=44100`;
        break;
    }

    // 写入命令文件到FFmpeg虚拟文件系统
    await ffmpeg.writeFile(inputFileName, `file 'dummy'`);

    // 执行FFmpeg命令生成音频
    await ffmpeg.exec([
      '-f', 'lavfi',
      '-i', waveExpression,
      '-y', // 覆盖现有文件
      outputFileName
    ]);

    // 读取生成的音频文件
    const audioData: any = await ffmpeg.readFile(outputFileName);

    // 创建Blob对象
    const mimeType = format === 'mp3' ? 'audio/mpeg' : 
                     format === 'wav' ? 'audio/wav' : 'audio/ogg';
    const audioBlob = new Blob([audioData.buffer], { type: mimeType });

    // 创建下载链接并触发下载
    const downloadUrl = URL.createObjectURL(audioBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    console.log(`音频文件 ${filename} 已生成并开始下载`);
  } catch (error) {
    console.error('生成音频文件失败:', error);
    throw error;
  }
};

/**
 * 检查浏览器是否支持WebAssembly
 */
export const isWebAssemblySupported = (): boolean => {
  try {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
};