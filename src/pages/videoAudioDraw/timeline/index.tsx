import React, { useEffect, useRef, useState } from 'react';
import styles from './index.less';

interface TimelineOptions {
  width: number;
  height: number;
  scale: number;
  duration: number;
}

interface VideoClip {
  id: string;
  startTime: number;
  endTime: number;
  color: string;
  name: string;
  trackIndex: number; // 添加轨道索引
  isDragging?: boolean;
  resizeHandle?: 'left' | 'right' | null;
  thumbnails: string[];
}

interface VideoThumbnail {
  id: string;
  startTime: number;
  endTime: number;
  thumbnail: string; // 添加缩略图属性
}

interface AudioTrack {
  id: string;
  startTime: number;
  endTime: number;
  color: string;
  name: string;
  trackIndex: number;
  audioData: Uint8Array;
}

const VideoTimeline: React.FC<{ duration: number; audioFile: any; }> = ({ duration, audioFile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(100); // 像素/秒
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const [isTimelineDragging, setIsTimelineDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  const [playheadPosition, setPlayheadPosition] = useState<number>(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [videoThumbnails, setVideoThumbnails] = useState<VideoThumbnail[]>([]);
  // 1. 添加预加载缩略图的状态
const [preloadedThumbnails, setPreloadedThumbnails] = useState<Record<string, HTMLImageElement>>({});

 const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const audioTrackHeight = 60; // 音频轨道高度
    // 轨道参数
    const trackHeight = 60;
    const trackSpacing = 10;
    const startY = 50;
    const trackCount = 3; // 轨道数量

      // 存储波形数据
  const waveformDataRef = useRef<Uint8Array | null>(null);
  // 存储静态波形数据
  const staticWaveformDataRef = useRef<Uint8Array | null>(null);

    const audioBufferRef = useRef<AudioBuffer | null>(null);

  // 初始化视频片段
  useEffect(() => {
    setVideoClips([
      {
        id: '1',
        startTime: 0,
        endTime: 1,
        color: '#3b82f6',
        name: '视频片段 1',
        trackIndex: 0, // 轨道1
        thumbnails: [],
        isDragging: false,
        resizeHandle: null
      },
      {
        id: '2',
        startTime:1,
        endTime: 2,
        color: '#10b981',
        name: '视频片段 2',
        trackIndex: 0, // 轨道1
        thumbnails: [],

        isDragging: false,
        resizeHandle: null
      },
      {
        id: '3',
        startTime:2,
        endTime: 3,
        color: '#ff5f96',
        name: '视频片段 3',
        thumbnails: [],
        trackIndex: 1, // 轨道2
        isDragging: false,
        resizeHandle: null
      },
      {
        id: '4',
        startTime:3,
        endTime: 4,
        color: '#f1961f',
        name: '视频片段 4',
        trackIndex: 2, // 轨道3
        thumbnails: [],
        isDragging: false,
        resizeHandle: null
      },
    ].map((vv) => ({
        ...vv,
        thumbnails: videoThumbnails.filter(
            (item) => !(item.startTime > vv.endTime || item.endTime < vv.startTime)
        ).map((item) => item.thumbnail)
    })));
  }, [videoThumbnails]);

  // 渲染时间线
  const renderTimeline = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制时间刻度
    drawTimeRuler(ctx);

    // 绘制视频轨道
    drawVideoTrack(ctx);

    // 绘制视频片段
    drawVideoClips(ctx);

      // 绘制音频波形
    drawAudioWaveform(ctx);

    // 绘制播放头
    drawPlayhead(ctx);
  };

  // 绘制时间刻度
  const drawTimeRuler = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    // 始终从0开始绘制刻度
    const startSec = 0;
    const endSec = Math.ceil((scrollLeft + canvasRef.current!.width) / scale);

    for (let sec = startSec; sec <= endSec; sec++) {
      const x = sec * scale - scrollLeft;
        // 绘制刻度线
        ctx.beginPath();
        ctx.moveTo(x, 0);

      // 绘制时间文本
      if (sec % 5 === 0) {
        ctx.lineTo(x, 15);
        ctx.fillText(formatTime(sec), x, 35);
      } else {
        ctx.lineTo(x, 10);
      }
        ctx.strokeStyle = '#666';
        ctx.stroke();

      // 对于0刻度，确保它左对齐并且更加明显
      if (sec === 0) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 20);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText('0', x + 5, 20);
        ctx.textAlign = 'center';
      }
    }
  };

  // 绘制视频轨道
  const drawVideoTrack = (ctx: CanvasRenderingContext2D) => {

    for (let i = 0; i < trackCount; i++) {
      const y = startY + i * (trackHeight + trackSpacing);
      ctx.fillStyle = '#2d2d2d';
      ctx.fillRect(0, y, canvasRef.current!.width, trackHeight);

      // 绘制轨道标签
      ctx.fillStyle = '#888';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`轨道 ${i + 1}`, 10, y + 15);

      // 绘制轨道分隔线
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasRef.current!.width, y);
      ctx.moveTo(0, y + trackHeight);
      ctx.lineTo(canvasRef.current!.width, y + trackHeight);
      ctx.strokeStyle = '#444';
      ctx.stroke();
    }
  };

  // 绘制视频片段
  const drawVideoClips = (ctx: CanvasRenderingContext2D) => {

    videoClips.forEach(clip => {
      const startX = clip.startTime * scale - scrollLeft;
      const width = (clip.endTime - clip.startTime) * scale;
      const trackY = startY + clip.trackIndex * (trackHeight + trackSpacing);
      // 仅绘制可见的片段
      if (startX + width > 0 && startX < canvasRef.current!.width) {
        // // 绘制片段背景
        // ctx.fillStyle = clip.isDragging || selectedClipId === clip.id ? clip.color + 'cc' : clip.color;
        // ctx.fillRect(startX, trackY + 5, width, trackHeight - 10);
        // 绘制缩略图（如果有）
 
        if (Object.keys(preloadedThumbnails).length > 0) {
            // 计算每个缩略图的宽度
            const availableWidth = width - 10; // 减去边距
            let thumbWidth = Math.max(40, Math.min(80, availableWidth)); // 最大宽度80px
            const imgCount = Math.ceil(width / thumbWidth);
            // 获取当前片段对应的所有缩略图ID
            const clipThumbnailIds = videoThumbnails
                .filter(item => !(item.startTime > clip.endTime || item.endTime < clip.startTime))
                .map(item => item.id);

            if (clipThumbnailIds.length) {
                const tempList: string[] = [];
                const len = clipThumbnailIds.length;
                if (imgCount > len) {
                    const integer = Math.floor(imgCount / len); // 每个元素至少重复的次数
                    const remainder = imgCount % len; // 剩余需要分配的元素数量

                    // 重新计算每个元素应该出现的次数
                    const counts = clipThumbnailIds.map((_, index) => {
                        return index < remainder ? integer + 1 : integer;
                    });
                    
                    // 按照计算的次数构建新数组
                    clipThumbnailIds.forEach((id, index) => {
                        for (let i = 0; i < counts[index]; i++) {
                            tempList.push(id);
                        }
                    });
                } else {
                    // 当imgCount <= len时，直接取前imgCount个元素
                    tempList.push(...clipThumbnailIds.slice(0, imgCount));
                }

                tempList.forEach((thumbId, index) => {
                    const img = preloadedThumbnails[thumbId];
                    if (img) {
                        // 计算缩略图尺寸，保持宽高比
                        const thumbHeight = trackHeight - 20;
                        const thumbX = startX + 5 + index * thumbWidth; // +5是左边距
                        const thumbY = trackY + 10 + (trackHeight - 20 - thumbHeight) / 2;

                        // 确保缩略图不会超出片段范围
                        const remainingWidth = availableWidth - index * thumbWidth;
                        const drawWidth = Math.min(thumbWidth, remainingWidth);

                        // 如果需要裁剪，计算裁剪参数
                        if (drawWidth < thumbWidth) {
                            // 计算裁剪比例
                            const clipRatio = drawWidth / thumbWidth;
                            const sourceWidth = img.width * clipRatio;

                            // 绘制裁剪后的图片（只显示左侧部分）
                            ctx.drawImage(
                                img,
                                0, 0, // 源图片起始位置
                                sourceWidth, img.height, // 源图片宽度（被裁剪）和高度
                                thumbX, thumbY, // 目标位置
                                drawWidth, thumbHeight // 目标尺寸
                            );
                        } else {
                            // 正常绘制
                            ctx.drawImage(img, thumbX, thumbY, drawWidth, thumbHeight);
                        }
                    }
                });
            }
        }

        // 绘制片段边框
        ctx.strokeStyle = selectedClipId === clip.id ? '#fff' : '#666';
        ctx.lineWidth = selectedClipId === clip.id ? 2 : 1;
        ctx.strokeRect(startX, trackY + 5, width, trackHeight - 10);

        // 绘制调整手柄
        // 左侧手柄
        ctx.fillStyle = '#fff';
        ctx.fillRect(startX - 3, trackY + 5, 6, trackHeight - 10);

        // 右侧手柄
        ctx.fillRect(startX + width - 3, trackY + 5, 6, trackHeight - 10);

        // 绘制片段名称
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(clip.name, startX + width / 2, trackY + 35);
      }
    });
  };

  // 绘制播放头
  const drawPlayhead = (ctx: CanvasRenderingContext2D) => {
    const x = playheadPosition * scale - scrollLeft;
    const endY = startY + (trackHeight + trackSpacing) * trackCount;

    // 绘制垂直线
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, endY);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制三角形
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(x - 5, 0);
    ctx.lineTo(x + 5, 0);
    ctx.lineTo(x, 10);
    ctx.closePath();
    ctx.fill();
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理鼠标滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    // 获取鼠标在时间线上的位置
    const mouseX = e.clientX - canvasRef.current!.getBoundingClientRect().left;
    const timeAtMouse = (mouseX + scrollLeft) / scale;

    // 调整缩放比例
    const newScale = Math.max(10, Math.min(500, scale - e.deltaY * 0.1));

    // 保持鼠标位置的时间点不变
    const newScrollLeft = timeAtMouse * newScale - mouseX;

    setScale(newScale);
    setScrollLeft(newScrollLeft);
  };

  // 处理拖拽开始
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const mouseX = e.clientX - canvasRef.current!.getBoundingClientRect().left;
    const mouseY = e.clientY - canvasRef.current!.getBoundingClientRect().top;

    // 检查是否点击了视频片段
    const clickedClip = videoClips.find(clip => {
      const startX = clip.startTime * scale - scrollLeft;
      const endX = startX + (clip.endTime - clip.startTime) * scale;
      const trackY = startY + clip.trackIndex * (trackHeight + trackSpacing);
      const trackEndY = trackY + trackHeight;

      // 检查鼠标是否在当前片段的轨道内
      if (mouseY < trackY || mouseY > trackEndY) return false;

      // 检查是否点击了左侧调整手柄
      if (mouseX >= startX - 10 && mouseX <= startX + 10) {
        setVideoClips(clips => 
          clips.map(c => 
            c.id === clip.id ? { ...c, resizeHandle: 'left' } : c
          )
        );
        return true;
      }

      // 检查是否点击了右侧调整手柄
      if (mouseX >= endX - 10 && mouseX <= endX + 10) {
        setVideoClips(clips => 
          clips.map(c => 
            c.id === clip.id ? { ...c, resizeHandle: 'right' } : c
          )
        );
        return true;
      }

      // 检查是否点击了片段本身
      if (mouseX >= startX && mouseX <= endX) {
        setSelectedClipId(clip.id);
        setVideoClips(clips => 
          clips.map(c => 
            c.id === clip.id ? { ...c, isDragging: true } : c
          )
        );
        setDragStartX(mouseX - startX);
        return true;
      }

      return false;
    });

    // 如果没有点击视频片段，则拖动时间线
    if (!clickedClip) {
      setIsTimelineDragging(true);
      setDragStartX(e.clientX);
      setSelectedClipId(null);

      // 更新播放头位置
    //   setPlayheadPosition(Math.min(duration, clickTime));
    }
  };

  // 处理拖拽移动
  const handleDragMove = (e: React.MouseEvent) => {
    if (!isTimelineDragging && !videoClips.some(clip => clip.isDragging || clip.resizeHandle)) {
      return;
    }

    const mouseX = e.clientX - canvasRef.current!.getBoundingClientRect().left;
    const mouseY = e.clientY - canvasRef.current!.getBoundingClientRect().top;

    // 处理时间线拖拽
    if (isTimelineDragging) {
      const deltaX = e.clientX - dragStartX;
      // 确保scrollLeft不会小于0，防止出现负刻度
      const newScrollLeft = Math.max(0, Math.min((duration * scale) - canvasRef.current!.width, scrollLeft - deltaX));
      setScrollLeft(newScrollLeft);
      // 更新拖拽起始位置，确保平滑拖动
        setDragStartX(e.clientX);
      return;
    }

    // 处理视频片段拖拽或调整
    videoClips.forEach(clip => {
      if (clip.isDragging) {
        // 确定当前鼠标所在轨道
        const newTrackIndex = Math.max(0, Math.min(2, Math.floor((mouseY - startY) / (trackHeight + trackSpacing))));

        const newStartX = mouseX - dragStartX;
        const newStartTime = Math.max(0, Math.min(duration - (clip.endTime - clip.startTime), newStartX / scale + scrollLeft / scale));
        const newEndTime = newStartTime + (clip.endTime - clip.startTime);

        setVideoClips(clips => 
          clips.map(c => 
            c.id === clip.id ? { ...c, startTime: newStartTime, endTime: newEndTime, trackIndex: newTrackIndex } : c
          )
        );
      } else if (clip.resizeHandle === 'left') {
        const newStartX = mouseX;
        const newStartTime = Math.max(0, Math.min(clip.endTime - 0.1, newStartX / scale + scrollLeft / scale));

        setVideoClips(clips => {
            const list = clips.slice(0);
            const len = list.length;
            for (let i = 0; i < len; i ++) {
                if (list[i].id === clip.id) {
                    // 只与同轨道的前一个片段比较
                    const prevClip = list.find(c => c.trackIndex === clip.trackIndex && c.endTime <= list[i].startTime);
                    list[i].startTime = prevClip ? Math.max(newStartTime, prevClip.endTime) : newStartTime;
                }
            }
            return list;
        });
      } else if (clip.resizeHandle === 'right') {
        const newEndX = mouseX;
        const newEndTime = Math.max(clip.startTime + 0.1, Math.min(duration, newEndX / scale + scrollLeft / scale));

        setVideoClips(clips => {
            const list = clips.slice(0);
            const len = list.length;
            for (let i = 0; i < len; i ++) {
                if (list[i].id === clip.id) {
                    // 只与同轨道的后一个片段比较
                    const nextClip = list.find(c => c.trackIndex === clip.trackIndex && c.startTime >= list[i].endTime);
                    list[i].endTime = nextClip ? Math.min(newEndTime, nextClip.startTime) : newEndTime;
                }
            }
            return list;
        });
      }
    });
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setIsTimelineDragging(false);

    // 拖拽结束后，确保每条轨道上的片段不重叠
    setVideoClips(clips => {
      // 按轨道和startTime排序所有片段
      const sortedClips = [...clips].sort((a, b) => {
        if (a.trackIndex !== b.trackIndex) {
          return a.trackIndex - b.trackIndex;
        }
        return a.startTime - b.startTime;
      });
      const adjustedClips = [...sortedClips];

      // 检查并调整每条轨道上的重叠
      for (let i = 1; i < adjustedClips.length; i++) {
        const currentClip = adjustedClips[i];
        const prevClip = adjustedClips[i - 1];

        // 只检查同轨道的片段
        if (currentClip.trackIndex === prevClip.trackIndex) {
          // 如果当前片段与前一个片段重叠
          if (currentClip.startTime < prevClip.endTime) {
            // 调整当前片段的startTime到前一个片段的endTime
            const duration = currentClip.endTime - currentClip.startTime;
            adjustedClips[i] = {
              ...currentClip,
              startTime: prevClip.endTime,
              endTime: prevClip.endTime + duration
            };
          }
        }
      }

      // 重置拖拽状态
      return adjustedClips.map(c => ({
        ...c,
        isDragging: false,
        resizeHandle: null
      }));
    });
  };

const handleTimelineClick = (e: React.MouseEvent) => {
  // 如果已经在拖拽中，则不处理点击
  if (isTimelineDragging || videoClips.some(clip => clip.isDragging || clip.resizeHandle)) {
    return;
  }

  const mouseX = e.clientX - canvasRef.current!.getBoundingClientRect().left;
  const mouseY = e.clientY - canvasRef.current!.getBoundingClientRect().top;

  // 检查是否点击了视频片段以外的区域
  const clickedClip = videoClips.find(clip => {
    const startX = clip.startTime * scale - scrollLeft;
    const endX = startX + (clip.endTime - clip.startTime) * scale;
    const trackY = startY + clip.trackIndex * (trackHeight + trackSpacing);
    const trackEndY = trackY + trackHeight;

    // 检查鼠标是否在当前片段的轨道内
    if (mouseY < trackY || mouseY > trackEndY) return false;
    
    return mouseX >= startX && mouseX <= endX;
  });

  if (!clickedClip) {
    setSelectedClipId(null);
  } else {
    setSelectedClipId(clickedClip.id);
  }
};

useEffect(() => {
    const videoEle = document.getElementById('custom_video_bg') as HTMLVideoElement;
    if (videoEle) {

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            canvas.width = 100; // 缩略图宽度
            canvas.height = trackHeight; // 缩略图高度
            // 帧数间隔
            let newThumbnails: VideoThumbnail[] = [];
            const frameInterval = Math.ceil(1 * duration * 100 / (scale * 5));

            //   const newThumbnails: VideoThumbnail[] = [];
            const imageCache: Record<string, HTMLImageElement> = {};
            // 创建一个加载所有缩略图的Promise数组
            const loadPromises = [];
            // setVideoThumbnails(newThumbnails);
              for (let time = 0; time < duration; time += frameInterval) {
                    loadPromises.push(new Promise<void>((resolve) => {
                        // 设置视频.currentTime来获取对应时间点的帧
                        videoEle.currentTime = time;
                        // 使用setTimeout确保视频帧已更新
                        setTimeout(() => {
                            ctx.drawImage(videoEle, 0, 0, canvas.width, canvas.height);
                            const thumbnail = canvas.toDataURL('image/jpeg');
                            // 创建新的视频片段
                            const thumbnailId = `thumb-${Date.now()}-${time}`;
                            const newThumbnail: VideoThumbnail = {
                                id: thumbnailId,
                                startTime: time,
                                endTime: Math.min(time + frameInterval, duration),
                                thumbnail: thumbnail,
                            };
                            newThumbnails.push(newThumbnail);

                            // 预加载图片
                            const img = new Image();
                            img.onload = () => {
                                imageCache[thumbnailId] = img;
                                resolve();
                            };
                            // img.onerror = resolve;
                            img.src = thumbnail;
                        }, 100);
                    }));
                }

                // 所有缩略图加载完成后更新状态
                Promise.all(loadPromises).then(() => {
                    setVideoThumbnails(newThumbnails);
                    setPreloadedThumbnails(imageCache);
                });
        }
    }
}, [duration, scale])

// 绘制音频波形
const drawAudioWaveform = (ctx: CanvasRenderingContext2D) => {
  // 计算音频轨道起始Y坐标（在视频轨道下方）
  const audioTrackStartY = startY + (trackHeight + trackSpacing) * trackCount;
  
  audioTracks.forEach(track => {
    const trackY = audioTrackStartY + track.trackIndex * (audioTrackHeight + trackSpacing);
    
    // 绘制音频轨道背景
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, trackY, canvasRef.current!.width, audioTrackHeight);
    
    // 绘制轨道标签
    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`音频轨道 ${track.trackIndex + 1}: ${track.name}`, 10, trackY + 15);
    
    // 绘制波形
    const startX = track.startTime * scale - scrollLeft;
    const endX = track.endTime * scale - scrollLeft;
    const width = endX - startX;

     if (!audioBufferRef.current) return;
        // 仅绘制可见部分
        if (startX + width > 0 && startX < canvasRef.current!.width) {
            const buffer = audioBufferRef.current;
            const channelData = buffer.getChannelData(0);
            const amplitudeArray = track.audioData.slice(0);
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
            drawWaveform({ startX, ctx, width, trackY, amplitudeArray, progress: 0 });
        }
  });
};

 // 绘制波形的通用函数
    function drawWaveform({
        startX,
        ctx,
        amplitudeArray,
        progress,
        width,
        trackY
    }: {
        startX: number;
        ctx: CanvasRenderingContext2D,
        amplitudeArray: Uint8Array,
        progress: number ;// 0 到 1 之间的进度值
        width: number;
        trackY: number;
    }) {

        const audioRealHeight = trackY + audioTrackHeight;

      const centerY = audioTrackHeight / 2;

      const barWidth = width / amplitudeArray.length;
      
      // 计算进度线位置
      const progressX = width * progress;
      
      // 创建上半部分渐变（增强版，适应折叠波形）
      const upperGradient = ctx.createLinearGradient(0, 0, 0, centerY);
      upperGradient.addColorStop(0, 'rgba(7, 111, 247, 0.7)'); // 深紫色，更不透明
      upperGradient.addColorStop(1, 'rgba(7, 111, 247, 0.5)'); // 透明紫色
      
      // 已播放部分的渐变（增强版）
      const upperGradientPlayed = ctx.createLinearGradient(0, 0, 0, centerY);
      upperGradientPlayed.addColorStop(0, 'rgba(7, 111, 247, 1)'); // 粉红色，更不透明
      upperGradientPlayed.addColorStop(1, 'rgba(7, 111, 247, 0.8)'); // 透明粉红色

      // 绘制上半部分波形（包含折叠的下半部分波形）
      ctx.beginPath();
      ctx.moveTo(startX, audioRealHeight); // 从底部开始
      
      for (let i = 0; i < amplitudeArray.length; i++) {
        const value = Math.abs((amplitudeArray[i] - 128) / 128); // 取绝对值，将上下部分合并
        const y = audioRealHeight - (value * centerY); // 从底部向上绘制
        const x = i * barWidth + startX;

        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, audioRealHeight);
      ctx.closePath();
      ctx.fillStyle = upperGradient;
      ctx.fill();
      
      // 绘制已播放部分（如果有进度）
      if (progress > 0 && progress < 1) {
        // 已播放的折叠波形
        ctx.beginPath();
        ctx.moveTo(startX, audioRealHeight);
        
        for (let i = 0; i < amplitudeArray.length; i++) {
          const x = i * barWidth + startX;

          if (x > progressX) break;
          
          const value = Math.abs((amplitudeArray[i] - 128) / 128); // 取绝对值
          const y = audioRealHeight - (value * centerY);
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(progressX, audioRealHeight);
        ctx.closePath();
        ctx.fillStyle = upperGradientPlayed;
        ctx.fill();
        
        // 绘制进度指针
        ctx.beginPath();
        ctx.moveTo(progressX, audioRealHeight - centerY);
        ctx.lineTo(progressX, audioRealHeight);
        ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      // 绘制波形上半部分的轮廓线以增强视觉效果
      ctx.beginPath();
      for (let i = 0; i < amplitudeArray.length; i++) {
        const value = Math.abs((amplitudeArray[i] - 128) / 128); // 取绝对值
        const y = audioRealHeight - (value * centerY);
        const x = i * barWidth + startX;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      // ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = 'rgba(7, 111, 247, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

// 处理音频上传
const handleAudioFile = (file: any) => {
  if (!file) return;

  // 创建AudioContext
  if (!audioContext) {
    setAudioContext(new AudioContext());
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    if (!e.target?.result) return;
     // 确保音频上下文处于运行状态
    const context = audioContext || new AudioContext();
    setAudioContext(context);
    
    // 处理浏览器自动播放策略
    if (context.state === 'suspended') {
      context.resume().catch(e => console.error('无法恢复音频上下文:', e));
    }

    context.decodeAudioData(e.target?.result as ArrayBuffer)
      .then((buffer) => {
       
         audioBufferRef.current = buffer;
        
        // 设置分析器节点来获取波形数据
        const analyserNode = new AnalyserNode(context, {
          fftSize: 2048,
          smoothingTimeConstant: 0.8,
        });
        // analyserNodeRef.current = analyserNode;
        
        // 创建临时的源节点来获取完整波形数据（不实际播放）
        const tempSourceNode = new AudioBufferSourceNode(context, {
          buffer: buffer,
        });
        
        tempSourceNode.connect(analyserNode);
        
        // 获取波形数据
        const amplitudeArray = new Uint8Array(analyserNode.frequencyBinCount);
        waveformDataRef.current = amplitudeArray;
        
        // 创建静态波形数据的副本
        staticWaveformDataRef.current = new Uint8Array(amplitudeArray);

         const newAudioTrack: AudioTrack = {
              id: `audio-${Date.now()}`,
              startTime: 0,
              endTime: buffer.duration,
              color: '#9333ea', 
              name: file.name,
              trackIndex: 0,
              audioData: staticWaveformDataRef.current
            };
            
            setAudioTracks([newAudioTrack]);
      })
      .catch((error) => {
        console.error('音频解码错误:', error);
      });
  };
  
  reader.readAsArrayBuffer(file);
};

useEffect(() => {
    handleAudioFile(audioFile);
}, [audioFile])

// 初始化Canvas
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 设置Canvas尺寸
  const resizeCanvas = () => {
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      // 计算总高度：视频轨道高度 + 音频轨道高度 + 控制栏高度
      const totalHeight = startY + 
        (trackHeight + trackSpacing) * trackCount + 
        (audioTrackHeight + trackSpacing) * audioTracks.length + 
        40; // 控制栏高度
      canvas.height = Math.max(320, totalHeight);
      renderTimeline();
    }
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  return () => {
    window.removeEventListener('resize', resizeCanvas);
  };
}, [scale, scrollLeft, videoClips, playheadPosition, audioTracks]);

console.log('---audioTracks--', audioTracks);
  return (
    <div 
      ref={containerRef}
      className={styles.timelineContainer}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onWheel={handleWheel}
      onClick={handleTimelineClick}
      style={{ 
        cursor: isTimelineDragging || videoClips.some(clip => clip.isDragging) ? 'grabbing' : 
                videoClips.some(clip => clip.resizeHandle) ? 'ew-resize' : 'grab'
      }}
    >
      <canvas ref={canvasRef} />
      <div className={styles.controls}>
        <button onClick={() => setScale(100)}>重置缩放</button>
        <span>缩放级别: {Math.round(scale)} px/秒</span>
      </div>
    </div>
  );
};

export default VideoTimeline;