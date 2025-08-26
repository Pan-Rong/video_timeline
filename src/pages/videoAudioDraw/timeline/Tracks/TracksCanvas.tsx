import { useRef, useEffect, useState } from 'react';
import { useRootStore } from '../../models';
import { TrackType, TRACK_HEIGHT, THUMBNAIL_WIDTH, TRACK_SPACING, DEFAULT_SCALE } from '../../models/constant';
import { ITrack, IVideoThumbnail, IClipItem } from '../../types';
import { useAudioStore } from '../../models/audio';


const scaleData = {
    preScale: DEFAULT_SCALE
}
const TracksCanvas = (props: { videoId: string; }) => {
    const { videoId } = props;
    const { scale, scrollLeft, tracks, } = useRootStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { duration } = useRootStore();
    // 1. 添加预加载缩略图的状态
    const [preloadedThumbnails, setPreloadedThumbnails] = useState<{
        [key: string]: {
            img: HTMLImageElement;
            startTime: number;
            endTime: number;
            id: string;
        }
    }>({});
    const startY = 0;
    const cornerRadius = 6; // 设置6px圆角

    const { 
        audioBuffer,
        staticWaveformData,
    } = useAudioStore();

    useEffect(() => {
        setPreloadedThumbnails({});
    }, [videoId]);

    useEffect(() => {
        // 获取视频缩略图，用于绘制视频轨道
        const videoEle = document.getElementById('custom_video_bg') as HTMLVideoElement;
        if (videoEle && canvasRef.current) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const handleThumbnailLoad = async () => {
                    if (!canvasRef.current) {
                        return;
                    }
                    // 增加冗余10张，防止拖拽时图片更新不及时
                    const drawEndTime = Math.min(duration, (canvasRef.current?.width + scrollLeft + THUMBNAIL_WIDTH * 10) / scale);
                    const drawStartTime = Math.max(0, Math.floor(scrollLeft / scale));
                    // 帧数间隔
                    const frameInterval = DEFAULT_SCALE / scale;  //
                    const imageCache: any = {};
                    canvas.width = THUMBNAIL_WIDTH * 2; // 缩略图宽度
                    canvas.height = TRACK_HEIGHT[TrackType.VIDEO] * 2; // 缩略图高度
                    
                    for (let time = drawStartTime; time < drawEndTime; time += frameInterval) {
                        await new Promise<void>((resolve) => {
                            // 设置视频.currentTime来获取对应时间点的帧
                            videoEle.currentTime = time;
                            // 使用setTimeout确保视频帧已更新
                            videoEle.onseeked = () => {
                                ctx.drawImage(videoEle, 0, 0, canvas.width, canvas.height);
                                const thumbnail = canvas.toDataURL('image/jpeg');
                                // 创建新的视频片段
                                const thumbnailId = `thumb-${tracks[0].id}-${time.toFixed(2)}`;
                                // 预加载图片
                                const img = new Image();
                                img.onload = () => {
                                    imageCache[thumbnailId] = {
                                        img,
                                        startTime: time,
                                        endTime: Math.min(time + frameInterval, drawEndTime),
                                        id: thumbnailId,
                                    };
                                    resolve();
                                };
                                // img.onerror = resolve;
                                img.src = thumbnail;
                                // document.body.appendChild(img);
                            };     
                        });
                    }
                    if (scaleData.preScale != scale) {
                        // 缩放改动时，全更新
                        setPreloadedThumbnails(imageCache);
                    } else {
                        // 部分更新
                        setPreloadedThumbnails((prev) => ({
                            ...prev,
                            ...imageCache,
                        }));
                    }
                    scaleData.preScale = scale;
                }
                handleThumbnailLoad();
            }
        }
    }, [duration, scale, canvasRef.current, scrollLeft, videoId]);

    // 绘制视频轨道
    const drawVideoClip = (ctx: CanvasRenderingContext2D, clip: IClipItem) => {
        const trackY = startY + clip.trackIndex * (TRACK_HEIGHT[clip.type] + TRACK_SPACING);
   
        const startX = clip.startTime * scale - scrollLeft;
        const width = (clip.endTime - clip.startTime) * scale;

        // 仅绘制可见的片段
        if (startX + width > 0 && startX < canvasRef.current!.width) {
            const videoThumbnails = Object.values(preloadedThumbnails).map((item) => ({
                startTime: item.startTime,
                endTime: item.endTime,
                id: item.id,
            })).sort((a, b) => a.startTime - b.startTime);

            if (videoThumbnails.length > 0) {  
                // 计算每个缩略图的宽度
                const availableWidth = Math.min(canvasRef.current!.width - startX, width); // 减去边距
                let thumbWidth = THUMBNAIL_WIDTH; // 宽度60px
                const imgCount = Math.ceil(availableWidth / thumbWidth);
                const timeRanges = [clip.startTime + scrollLeft / scale, Math.min(clip.endTime, (canvasRef.current!.width + scrollLeft) /scale)];

                // 获取当前片段对应的所有缩略图ID
                const clipThumbnailIds = videoThumbnails
                    .filter(item => !(item.startTime > timeRanges[1] || item.endTime < timeRanges[0]))
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
                        // 当imgCount <= len时，尽量将 clipThumbnailIds 中元素均匀分布
                        const interval = Math.floor(len / imgCount); // 计算填充比例
                        for (let i = 0; i < imgCount; i++) {
                            tempList.push(clipThumbnailIds[i * interval]);
                        }
                    }
                    tempList.forEach((thumbId, index) => {
                        const img = preloadedThumbnails[thumbId].img;
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
    const drawAudioWaveClip = (ctx: CanvasRenderingContext2D, clip: IClipItem) => {
        const trackY = startY + clip.trackIndex * (TRACK_HEIGHT[clip.type] + TRACK_SPACING);

        // 绘制波形
        const startX = clip.startTime * scale - scrollLeft;
        const endX = clip.endTime * scale - scrollLeft;
        const width = endX - startX;
        if (!audioBuffer || !staticWaveformData) return;

        // 仅绘制可见部分
        if (canvasRef.current && (startX + width > 0 && startX < canvasRef.current!.width)) {
            const startIdx = Math.floor(Math.max(clip.startTime, startX / scale) / duration * staticWaveformData.length);
            const endIdx = Math.ceil( Math.min(clip.endTime, canvasRef.current.width / scale) / duration * staticWaveformData.length);
            const amplitudeArray = staticWaveformData.slice(startIdx, endIdx);
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
        
        ctx.lineTo(width + startX, audioRealHeight);
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = 'rgba(7, 111, 247, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 绘制文字片段
    const drawTextClip = (ctx: CanvasRenderingContext2D, clip: IClipItem) => {
        // 绘制剪辑的时间轴,带圆角的片段边框
        const trackY = startY + clip.trackIndex * (TRACK_HEIGHT[clip.type] + TRACK_SPACING);  
        const cornerRadius = 6; // 设置6px圆角
        const startX = clip.startTime * scale - scrollLeft;
        const width = (clip.endTime - clip.startTime) * scale;
        ctx.fillStyle = 'rgba(9, 178, 245, 0.36)';
        ctx.beginPath();
        ctx.roundRect(startX, trackY, width, TRACK_HEIGHT[clip.type], cornerRadius);
        ctx.fill();

        // 绘制文字
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        const textStartX = clip.startTime * scale - scrollLeft + 10;
        const textStartY = trackY + TRACK_HEIGHT[TrackType.TEXT] / 2;
        // 测量文字宽度
        const text = clip.content || '';
        const textWidth = ctx.measureText(text).width;
        const maxWidth= Math.max(10, width - 20);
        if (textWidth <= maxWidth) {
            ctx.fillText(text, textStartX, textStartY);
        } else {
            // 文字宽度超过最大宽度，需要截断并添加省略号
            let ellipsis = '...';
            const ellipsisWidth = ctx.measureText(ellipsis).width;
            // 计算可用于显示文字的最大宽度（扣除省略号宽度）
            const availableWidth = maxWidth - ellipsisWidth;

            // 寻找最大可显示的文字长度
            let displayText = text;
            let displayWidth = textWidth;

            // 逐个字符减少，直到文字宽度小于可用宽度
            while (displayWidth > availableWidth && displayText.length > 0) {
                displayText = displayText.substring(0, displayText.length - 1);
                displayWidth = ctx.measureText(displayText).width;
            }

            // 添加省略号并绘制
            ctx.fillText(displayText + ellipsis, textStartX, textStartY);   
        }
    }

    // 绘制贴图轨道
    const drawImageTrack = (ctx: CanvasRenderingContext2D, track: ITrack) => {
        const trackY = startY + track.trackIndex * (TRACK_HEIGHT[TrackType.IMAGE] + TRACK_SPACING);
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(0, trackY, canvasRef.current!.width, TRACK_HEIGHT[TrackType.IMAGE]);
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

        // 绘制轨道
        tracks.forEach((track, index) => {
            // 轨道背景
            const trackY = startY + track.trackIndex * (TRACK_HEIGHT[track.type] + TRACK_SPACING);
            ctx.fillStyle = '#2d2d2d';
            ctx.fillRect(0, trackY, canvasRef.current!.width, TRACK_HEIGHT[track.type]);

            // 当前轨道中总时长的背景
            ctx.fillStyle = 'rgba(98, 138, 4, 0.08)';
            ctx.beginPath();
            ctx.roundRect(track.startTime * scale - scrollLeft, trackY, Math.min(canvasRef.current!.width, duration * scale), TRACK_HEIGHT[track.type], [0, cornerRadius, cornerRadius, 0]);
            ctx.fill();

            if (track.type === TrackType.VIDEO) {
                if (track.clips) {
                    track.clips.forEach(clip => {
                        drawVideoClip(ctx, clip);
                    })
                }
            } else if (track.type === TrackType.AUDIO) {
                 if (track.clips) {
                    track.clips.forEach(clip => {
                        drawAudioWaveClip(ctx, clip);
                    })
                }
            } else if (track.type === TrackType.TEXT) {
                if (track.clips) {
                    track.clips.forEach(clip => {
                        drawTextClip(ctx, clip);
                    })
                }
            } else if (track.type === TrackType.IMAGE) {
                drawImageTrack(ctx, track);
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
    }, [scale, scrollLeft, canvasRef.current, tracks, preloadedThumbnails]);


    // 在组件中添加useEffect钩子来设置Canvas尺寸
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // 获取Canvas的实际显示尺寸
        const container = canvas.parentElement;
        if (container) {
            const { width, height } = container.getBoundingClientRect();
            
            // 设置Canvas的绘图表面尺寸与显示尺寸一致
            canvas.width = width;
            canvas.height = height;
        }
    }, [canvasRef.current]);

    return (
        <canvas  id={'custom_tracks_canvas'} ref={canvasRef}/>
    )
}

export default TracksCanvas;

