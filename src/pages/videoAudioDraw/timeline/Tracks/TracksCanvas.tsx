import { useRef, useEffect, useState } from 'react';
import { useRootStore } from '../../models';
import { TrackType, TRACK_HEIGHT, RULER_HEIGHT, TRACK_SPACING } from '../../models/constant';
import { ITrack, IVideoThumbnail } from '../../types';
import { useAudioStore } from '../../models/audio';


const TracksCanvas = ({
    tracks
}: {
    tracks: ITrack[]
}) => {
    const { scale, scrollLeft } = useRootStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { duration } = useRootStore();
    const [videoThumbnails, setVideoThumbnails] = useState<IVideoThumbnail[]>([]);
    // 1. 添加预加载缩略图的状态
    const [preloadedThumbnails, setPreloadedThumbnails] = useState<Record<string, HTMLImageElement>>({});
    const startY = 0;

    const { 
        audioBuffer,
        staticWaveformData,
        setStaticWaveformData   // 存储静态波形数据
    } = useAudioStore();

    useEffect(() => {
        // 获取视频缩略图，用于绘制视频轨道
        const videoEle = document.getElementById('custom_video_bg') as HTMLVideoElement;
        if (videoEle) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = 100; // 缩略图宽度
                canvas.height = TRACK_HEIGHT[TrackType.VIDEO]; // 缩略图高度

                // 帧数间隔
                let newThumbnails: IVideoThumbnail[] = [];
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
                                const newThumbnail: IVideoThumbnail = {
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
    }, [duration, scale]);

    // 绘制视频轨道
    const drawVideoTrack = (ctx: CanvasRenderingContext2D, track: ITrack) => {
        const trackY = startY + track.trackIndex * (TRACK_HEIGHT[TrackType.VIDEO] + TRACK_SPACING);
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(0, trackY, canvasRef.current!.width, TRACK_HEIGHT[TrackType.VIDEO]);
        const clip = {
            startTime: track.startTime,
            endTime: track.endTime,
        }
        const startX = clip.startTime * scale - scrollLeft;
        const width = (clip.endTime - clip.startTime) * scale;

        // 仅绘制可见的片段
        if (startX + width > 0 && startX < canvasRef.current!.width) {
            if (Object.keys(preloadedThumbnails).length > 0) {  
                // 计算每个缩略图的宽度
                const availableWidth = width - 10; // 减去边距
                let thumbWidth = Math.max(40, Math.min(80, availableWidth)); // 最大宽度60px
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
                            const thumbHeight = TRACK_HEIGHT[TrackType.VIDEO];
                            const thumbX = startX + index * thumbWidth; // 
                            const thumbY = trackY + (TRACK_HEIGHT[TrackType.VIDEO] - thumbHeight) / 2;

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
        }
    }

    // 绘制音频波形
    const drawAudioWaveTrack = (ctx: CanvasRenderingContext2D, track: ITrack) => {
        const trackY = startY + track.trackIndex * (TRACK_HEIGHT[TrackType.AUDIO] + TRACK_SPACING);
        // 绘制音频轨道背景
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(0, trackY, canvasRef.current!.width, TRACK_HEIGHT[TrackType.AUDIO]);
   
        // 绘制波形
        const startX = track.startTime * scale - scrollLeft;
        const endX = track.endTime * scale - scrollLeft;
        const width = endX - startX;
        if (!audioBuffer || !staticWaveformData) return;

        // 仅绘制可见部分
        if (startX + width > 0 && startX < canvasRef.current!.width) {
            const buffer = audioBuffer;
            const channelData = buffer.getChannelData(0);
            const amplitudeArray = staticWaveformData.slice(0);
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
            setStaticWaveformData(new Uint8Array(amplitudeArray));
            
            // 绘制静态波形
            drawWaveform({ startX, ctx, width, trackY, amplitudeArray, progress: 0 });
        }
    }

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

        const audioRealHeight = trackY + TRACK_HEIGHT[TrackType.AUDIO];

        const centerY = TRACK_HEIGHT[TrackType.AUDIO] / 1;

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


    const renderTracks = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 绘制背景
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // drawTrack(ctx);
        // 绘制视频轨道
        tracks.forEach((track, index) => {
            if (track.type === TrackType.VIDEO) {
                drawVideoTrack(ctx, track);
            } else if (track.type === TrackType.AUDIO) {
                drawAudioWaveTrack(ctx, track);
            }
        })
    }

    // 初始化Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 设置Canvas尺寸
        const resizeCanvas = () => {
            const parentEle = canvasRef.current?.parentElement;
            if (!parentEle) return;

            canvas.width = parentEle.clientWidth;
            // 计算总高度：视频轨道高度 + 音频轨道高度 + 文本轨道高度 + 图片轨道高度
            const totalHeight = startY + tracks.reduce((prev, cur) => {
                return prev + TRACK_HEIGHT[cur.type];
            }, tracks.length * TRACK_SPACING); // 

            canvas.height = Math.max(320, totalHeight);
            renderTracks();
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [scale, scrollLeft, canvasRef.current, tracks, videoThumbnails, preloadedThumbnails]);


    return (
        <canvas  id={'custom_tracks_canvas'} ref={canvasRef}/>
    )
}

export default TracksCanvas;

