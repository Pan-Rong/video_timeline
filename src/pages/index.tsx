import { useEffect, useRef, useState } from "react"; 
import styles from './index.less';

export default function HomePage() {
  // 使用ref存储音频相关对象和状态
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const javascriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number>(0);
  
  // 存储波形数据
  const waveformDataRef = useRef<Uint8Array | null>(null);
  // 存储静态波形数据
  const staticWaveformDataRef = useRef<Uint8Array | null>(null);
  
  // 状态管理
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>("Loading audio...");

  useEffect(() => {
    // 获取DOM元素
    const msg: any = document.querySelector("output");
    const startBtn: any = document.querySelector("#start_button");
    const stopBtn: any = document.querySelector("#stop_button");
    const canvasElt: any = document.querySelector("#canvas");
    // 获取小窗口画布元素
    const miniCanvasElt: any = document.querySelector("#mini_canvas");

    if (!startBtn || !stopBtn || !canvasElt || !miniCanvasElt) {
      return;
    }

    // 创建音频上下文和加载音频文件
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    // 加载音频文件
    fetch("./4.mp3")
      .then((response) => response.arrayBuffer())
      .then((downloadedBuffer) =>
        audioContext.decodeAudioData(downloadedBuffer)
      )
      .then((decodedBuffer) => {
        audioBufferRef.current = decodedBuffer;
        setStatusMessage("Audio loaded. Click Start to play.");
        setIsLoading(false);
        
        // 设置分析器节点来获取波形数据
        const analyserNode = new AnalyserNode(audioContext, {
          fftSize: 2048,
          smoothingTimeConstant: 0.8,
        });
        analyserNodeRef.current = analyserNode;
        
        // 创建临时的源节点来获取完整波形数据（不实际播放）
        const tempSourceNode = new AudioBufferSourceNode(audioContext, {
          buffer: decodedBuffer,
        });
        
        tempSourceNode.connect(analyserNode);
        
        // 获取波形数据
        const amplitudeArray = new Uint8Array(analyserNode.frequencyBinCount);
        waveformDataRef.current = amplitudeArray;
        
        // 创建静态波形数据的副本
        staticWaveformDataRef.current = new Uint8Array(amplitudeArray);

        // 即使不播放，也渲染静态波形
        renderStaticWaveform(canvasElt, amplitudeArray);
        
      })
      .catch((e) => {
        console.error(`Error: ${e}`);
        setStatusMessage(`Error loading audio: ${e.message}`);
        setIsLoading(false);
      });

    // 渲染静态波形
    function renderStaticWaveform(canvasElt: HTMLCanvasElement, amplitudeArray: Uint8Array) {

     if (!audioBufferRef.current || !analyserNodeRef.current) return;
  
        const buffer = audioBufferRef.current;
        const channelData = buffer.getChannelData(0);
        const step = Math.floor(channelData.length / amplitudeArray.length);

        // 结合最大值和平均值的混合方法
        const windowSize = 8; // 窗口大小
      
        for (let i = 0; i < amplitudeArray.length; i++) {
          let sum = 0;
          let max = 0;
          let count = 0;
          
          for (let j = 0; j < windowSize; j++) {
            const index = i * step + Math.floor(j * step / windowSize);
            if (index < channelData.length) {
              const absValue = Math.abs(channelData[index]);
              sum += absValue;
              if (absValue > max) {
                max = absValue;
              }
              count++;
            }
          }
          const avgValue = sum / count;
          // 使用70%的最大值和30%的平均值混合
          const mixedValue = max * 0.7 + avgValue * 0.3;
          
          // 映射到 [0, 255]
          amplitudeArray[i] = Math.floor((mixedValue + 1) * 128);
        }

          // 保存静态波形数据的副本（新增）
        if (staticWaveformDataRef.current) {
          staticWaveformDataRef.current.set(amplitudeArray);
        }
         // 绘制静态波形
        const canvasContext = canvasElt.getContext("2d");
        if (canvasContext) {
          drawWaveform(canvasContext, canvasElt, amplitudeArray, 0);
        }
    }

    // 绘制波形的通用函数
    function drawWaveform(
      canvasContext: CanvasRenderingContext2D,
      canvasElt: HTMLCanvasElement,
      amplitudeArray: Uint8Array,
      progress: number // 0 到 1 之间的进度值
    ) {

      // 清除画布
      canvasContext.clearRect(0, 0, canvasElt.width, canvasElt.height);

      const centerY = canvasElt.height / 2;
      const barWidth = canvasElt.width / amplitudeArray.length;
      
      // 计算进度线位置
      const progressX = canvasElt.width * progress;
      
      // 创建上半部分渐变（增强版，适应折叠波形）
      const upperGradient = canvasContext.createLinearGradient(0, 0, 0, centerY);
      upperGradient.addColorStop(0, 'rgba(7, 111, 247, 0.7)'); // 深紫色，更不透明
      upperGradient.addColorStop(1, 'rgba(7, 111, 247, 0.5)'); // 透明紫色
      
      // 已播放部分的渐变（增强版）
      const upperGradientPlayed = canvasContext.createLinearGradient(0, 0, 0, centerY);
      upperGradientPlayed.addColorStop(0, 'rgba(7, 111, 247, 1)'); // 粉红色，更不透明
      upperGradientPlayed.addColorStop(1, 'rgba(7, 111, 247, 0.8)'); // 透明粉红色

      // 绘制上半部分波形（包含折叠的下半部分波形）
      canvasContext.beginPath();
      canvasContext.moveTo(0, canvasElt.height); // 从底部开始
      
      for (let i = 0; i < amplitudeArray.length; i++) {
        const value = Math.abs((amplitudeArray[i] - 128) / 128); // 取绝对值，将上下部分合并
        const y = canvasElt.height - (value * centerY); // 从底部向上绘制
        const x = i * barWidth;
        canvasContext.lineTo(x, y);
      }
      
      canvasContext.lineTo(canvasElt.width, canvasElt.height);
      canvasContext.closePath();
      canvasContext.fillStyle = upperGradient;
      canvasContext.fill();
      
      // 绘制已播放部分（如果有进度）
      if (progress > 0 && progress < 1) {
        // 已播放的折叠波形
        canvasContext.beginPath();
        canvasContext.moveTo(0, canvasElt.height);
        
        for (let i = 0; i < amplitudeArray.length; i++) {
          const x = i * barWidth;
          if (x > progressX) break;
          
          const value = Math.abs((amplitudeArray[i] - 128) / 128); // 取绝对值
          const y = canvasElt.height - (value * centerY);
          canvasContext.lineTo(x, y);
        }
        
        canvasContext.lineTo(progressX, canvasElt.height);
        canvasContext.closePath();
        canvasContext.fillStyle = upperGradientPlayed;
        canvasContext.fill();
        
        // 绘制进度指针
        canvasContext.beginPath();
        canvasContext.moveTo(progressX, canvasElt.height - centerY);
        canvasContext.lineTo(progressX, canvasElt.height);
        canvasContext.strokeStyle = 'rgba(255, 0, 0, 1)';
        canvasContext.lineWidth = 1;
        canvasContext.stroke();
      }
      
      // 绘制波形上半部分的轮廓线以增强视觉效果
      canvasContext.beginPath();
      for (let i = 0; i < amplitudeArray.length; i++) {
        const value = Math.abs((amplitudeArray[i] - 128) / 128); // 取绝对值
        const y = canvasElt.height - (value * centerY);
        const x = i * barWidth;
        if (i === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }
      }
      // canvasContext.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      canvasContext.strokeStyle = 'rgba(7, 111, 247, 0.5)';
      canvasContext.lineWidth = 1;
      canvasContext.stroke();
    }

    // 绘制小窗口动态波形（新增）
    function drawMiniWaveform(
      canvasContext: CanvasRenderingContext2D,
      canvasElt: HTMLCanvasElement,
      amplitudeArray: Uint8Array
      // audioData: Float32Array // 注意这里我们使用Float32Array而不是Uint8Array
    ) {
      // 清除画布
      canvasContext.clearRect(0, 0, canvasElt.width, canvasElt.height);

      const centerY = canvasElt.height / 2;
      const barWidth = canvasElt.width / amplitudeArray.length;
      
      // 创建动态波形渐变
      const gradient = canvasContext.createLinearGradient(0, 0, 0, centerY);
      gradient.addColorStop(0, 'rgba(7, 111, 247, 0.9)');
      gradient.addColorStop(1, 'rgba(7, 111, 247, 0.7)');

      // 绘制动态波形
      canvasContext.beginPath();
      canvasContext.moveTo(0, centerY);
      
      for (let i = 0; i < amplitudeArray.length; i++) {
        const value = (amplitudeArray[i] - 128) / 128; // 归一化到 [-1, 1]
        const y = centerY - (value * centerY * 0.8); // 稍微缩小一些以增强视觉效果
        const x = i * barWidth;
        
        if (i === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }
      }
      canvasContext.closePath();
      canvasContext.fillStyle = gradient;
      canvasContext.fill();
      
      // 下半部分
      canvasContext.beginPath();
      canvasContext.moveTo(0, centerY);
      
      for (let i = 0; i < amplitudeArray.length; i++) {
        const value = (amplitudeArray[i] - 128) / 128; // 归一化到 [-1, 1]
        const y = centerY + (value * centerY);
        const x = i * barWidth;
        canvasContext.lineTo(x, y);
      }
      
      canvasContext.lineTo(canvasElt.width, centerY);
      canvasContext.closePath();
      canvasContext.fillStyle = gradient;
      canvasContext.fill();
 
      
      // 绘制中心线
      canvasContext.beginPath();
      canvasContext.moveTo(0, centerY);
      canvasContext.lineTo(canvasElt.width, centerY);
      canvasContext.strokeStyle = 'rgba(255, 0, 0, 1)';
      canvasContext.lineWidth = 0.5;
      canvasContext.stroke();
    }

    // 播放音频的函数
    function playAudio() {
      if (!audioContextRef.current || !audioBufferRef.current) return;
      
      // 停止任何现有的播放
      stopAudio();
      
      const audioContext = audioContextRef.current;
      
      // 如果音频上下文已被暂停，恢复它
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // 创建新的源节点
      const sourceNode = new AudioBufferSourceNode(audioContext, {
        buffer: audioBufferRef.current,
        // playbackRate: 0.2
      });
      sourceNodeRef.current = sourceNode;
      
      // 设置分析器节点
      const analyserNode = new AnalyserNode(audioContext, {
        fftSize: 2048,
        smoothingTimeConstant: 0.8,
      });
      analyserNodeRef.current = analyserNode;
      
      // 创建JavaScript节点
      const javascriptNode = audioContext.createScriptProcessor(1024, 1, 1);
      javascriptNodeRef.current = javascriptNode;
      
      // 连接节点
      sourceNode.connect(audioContext.destination);
      sourceNode.connect(analyserNode);
      analyserNode.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);
      
      // 记录开始时间
      startTimeRef.current = audioContext.currentTime - pausedTimeRef.current;
      isPlayingRef.current = true;
      
      // 播放音频，从暂停的位置开始
      sourceNode.start(0, pausedTimeRef.current);
      
      // 更新状态消息
      setStatusMessage("Audio playing...");
      
      // 设置动画循环来更新进度
      function updateProgress() {
        if (!isPlayingRef.current || !audioContextRef.current || !audioBufferRef.current) return;
        
        const currentTime = audioContextRef.current.currentTime - startTimeRef.current;
        const duration = audioBufferRef.current.duration;
        const progress = Math.min(currentTime / duration, 1);
        
        // 获取当前波形数据
        const analyserNode = analyserNodeRef.current;
        if (analyserNode && waveformDataRef.current) {
          // 获取当前帧的时域数据
          const currentTimeDomainData = new Uint8Array(analyserNode.frequencyBinCount);
          analyserNode.getByteTimeDomainData(currentTimeDomainData);

          // 绘制主波形 - 使用静态波形数据和当前进度（修改）
          if (staticWaveformDataRef.current) {
            const canvasContext = canvasElt.getContext("2d");
            drawWaveform(canvasContext, canvasElt, staticWaveformDataRef.current, progress);
          }

            // 绘制小窗口动态波形（新增）
          const miniCanvasContext = miniCanvasElt.getContext("2d");
          drawMiniWaveform(miniCanvasContext, miniCanvasElt, currentTimeDomainData);
        }
        
        // 继续动画循环
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(updateProgress);
        } else {
          // 播放结束
          stopAudio();
          setStatusMessage("Audio finished.");
        }
      }
      
      // 开始更新进度
      animationFrameRef.current = requestAnimationFrame(updateProgress);
      
      // 监听播放结束事件
      sourceNode.onended = () => {
        stopAudio();
        setStatusMessage("Audio finished.");
      };
    }

    // 停止音频的函数
    function stopAudio() {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      
      if (javascriptNodeRef.current) {
        javascriptNodeRef.current.disconnect();
        javascriptNodeRef.current = null;
      }

      // 取消动画帧
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      
      // 保存暂停位置
      if (isPlayingRef.current && audioContextRef.current) {
        pausedTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      }
      
      isPlayingRef.current = false;
      
      // 重置开始按钮状态
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }

    // 设置开始按钮事件
    startBtn.addEventListener("click", (e: any) => {
      e.preventDefault();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      playAudio();
    });

    // 设置停止按钮事件
    stopBtn.addEventListener("click", (e: any) => {
      e.preventDefault();
      stopAudio();
      setStatusMessage("Audio stopped.");
    });

    // 清理函数
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };

  }, [])

  return (
    <div>
      <h1>Web Audio API examples: audio analyser</h1>
      <canvas id="canvas" width="512" height="256" className={styles.canvas}></canvas>

      {/* 添加小窗口画布元素（新增） */}
      <canvas 
        id="mini_canvas" 
        width="200" 
        height="80" 
        style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          backgroundColor: 'rgba(255, 255, 255, 1)',
          border: '1px solid rgba(0, 0, 0, 0.7)',
          borderRadius: '4px'
        }}
      ></canvas>
      <div id="controls">
        <input type="button" id="start_button" value={isLoading ? "Loading..." : "Start"} disabled={isLoading} />
        &nbsp; &nbsp;
        <input type="button" id="stop_button" value="Stop" disabled />
        <br /><br />
        <output id="msg">{statusMessage}</output>
      </div>
    </div>
  );
}
