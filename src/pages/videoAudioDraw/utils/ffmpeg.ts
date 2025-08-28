import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { encodeWAV } from './tools';


  // 从视频文件中提取音频 - 集成FFmpeg优化
  export const extractAudioFromVideo = async (videoFile: File, videoElement?: HTMLVideoElement): Promise<Blob> => {
        // 优先使用FFmpeg方法（如果浏览器支持）
        if (isWebAssemblySupported()) {
            try {
                console.log('使用FFmpeg提取音频...');
                return await extractAudioWithFFmpeg(videoFile);
            } catch (ffmpegError) {
                console.error('FFmpeg提取失败，回退到Web Audio API方法:', ffmpegError);
                // 如果FFmpeg方法失败，回退到Web Audio API方法
                if (videoElement) {
                    return extractAudioWithWebAudio(videoElement);
                }
                throw ffmpegError;
            }
        } else {
            console.log('浏览器不支持WebAssembly，使用Web Audio API方法...');
            if (videoElement) {
                return extractAudioWithWebAudio(videoElement);
            }
            throw new Error('无法提取音频，不支持WebAssembly且没有有效的视频元素');
        }
    };

// 原始的Web Audio API方法（作为备选）
const extractAudioWithWebAudio = (videoElement: HTMLVideoElement): Promise<Blob> => {
    // 这里可以保留您之前优化的Web Audio API实现
    const processStartTime = Date.now();

    return new Promise((resolve, reject) => {
        try {
            // 创建音频上下文以获取音频数据
            const audioContext = new AudioContext();
            const sourceNode = audioContext.createMediaElementSource(videoElement);
            
            // 创建ScriptProcessorNode
            const BUFFER_SIZE = 8192;
            const numberOfChannels = 1;
            const audioData: Float32Array[] = [];
            const scriptProcessorNode = audioContext.createScriptProcessor(BUFFER_SIZE, numberOfChannels, numberOfChannels);
            
            // 处理音频数据
            scriptProcessorNode.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                audioData.push(new Float32Array(inputData));
            };
            
            // 连接节点
            sourceNode.connect(scriptProcessorNode);
            scriptProcessorNode.connect(audioContext.destination);
            
            // 设置最高播放速度加速处理
            videoElement.playbackRate = 16;
            
            // 开始播放视频
            videoElement.play().catch(err => {
                console.error('无法播放视频:', err);
                cleanupAndReject(err);
            });
            
            // 设置定时器停止捕获
            const stopTimeout = setTimeout(() => {
                stopCapture();
            }, Math.min(30000, videoElement.duration * 1000 / 16));
            
            // 监听视频结束事件
            videoElement.onended = () => {
                clearTimeout(stopTimeout);
                stopCapture();
            };
            
            // 停止捕获并处理数据的函数
            function stopCapture() {
                try {
                    videoElement.pause();
                    sourceNode.disconnect();
                    scriptProcessorNode.disconnect();
                    
                    // 合并所有音频数据
                    const totalLength = audioData.reduce((acc, curr) => acc + curr.length, 0);
                    const mergedData = new Float32Array(totalLength);
                    let offset = 0;
                    
                    audioData.forEach(data => {
                        mergedData.set(data, offset);
                        offset += data.length;
                    });
                    
                    // 使用encodeWAV函数将数据转换为WAV格式
                    const audioBlob = encodeWAV(mergedData, audioContext.sampleRate);
                    
                    // 清理资源
                    audioContext.close();
                    
                    console.log('Web Audio API提取音频完成，耗时:', Date.now() - processStartTime, 'ms');

                    resolve(audioBlob);
                } catch (error) {
                    cleanupAndReject(error);
                }
            }
            
            // 清理资源并拒绝Promise的函数
            function cleanupAndReject(error?: any) {
                try {
                    videoElement.pause();
                    sourceNode.disconnect();
                    if (scriptProcessorNode) scriptProcessorNode.disconnect();
                    audioContext.close();
                } catch (cleanupError) {
                    console.error('清理资源时出错:', cleanupError);
                }
                reject(error);
            }
        } catch (error) {
            console.error('Web Audio API方法失败:', error);
            reject(error);
        }
    });
};


// 创建FFmpeg实例
const ffmpeg = new FFmpeg();
let initialized = false;
let videoInitialized = false;
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
      download = false, 
      filename = `extracted_audio_${Date.now()}.${format}`
    } = options || {};

    console.log('---ffmpeg.loaded--audio-', ffmpeg.loaded, initialized)
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
      initialized = true;
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

    // 清理虚拟文件系统
    ffmpeg.deleteFile(inputFileName);
    ffmpeg.deleteFile(outputFileName);
    
    // 清理DOM元素
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