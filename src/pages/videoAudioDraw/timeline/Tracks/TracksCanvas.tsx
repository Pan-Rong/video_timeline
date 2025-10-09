import { useRef, useEffect, useState } from 'react';
import { useRootStore } from '../../models';
import { 
    TrackType, 
    TRACK_HEIGHT, 
    THUMBNAIL_WIDTH, 
    TRACK_SPACING, 
    DEFAULT_SCALE, 
    TRACK_BG_COLOR,
    CANVAS_BG_COLOR,
    TRACK_DURATION_BG_RADIUS,
    TRACK_DURATION_BG_COLOR,
    DEFAULT_LEFT_DIS,
    RULER_SCALE_DATA,
    THUMBNAIL_REDUNDANCY_COUNT
} from '../../models/constant';
import { ITrack, IVideoThumbnail, IClipItem, IRulerScaleKey } from '../../types';
import { useAudioStore } from '../../models/audio';
import { ThumbnailManager } from '../../utils/thumbnail-cache/thumbnail-manager';
import { FastThumbnailExtractor } from '../../utils/thumbnailExtractor';
// import { ThumbnailWorkerAdapter } from '../../utils/thumbnail-cache/thumbnailWorkerAdapter';

const preData = {
    preScale: DEFAULT_SCALE,
    preScrollLeft: 0,
    preTasksString: '',
    preVideoChangedTime: 0, // 用于标识视频文件更新时间，以便更新缩略图画布
}
const TracksCanvas = () => {
    const thumbnailManagerRef = useRef<ThumbnailManager | null>(null);
    const { scale, scrollLeft, tracks, videoFile, duration, setScale, setScrollLeft } = useRootStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const clearRequestFrameRef = useRef<number>(0);
    const startY = 0;
    const [initialized, setInitialized] = useState(false);
    const [dataUpdateTime, setDataUpdateTime] = useState(0); // 用于标识数据更新时间，以便更新缩略图画布
    const [videoChangedTime, setVideoChangedTime] = useState(0); // 用于标识视频文件更新时间，以便更新缩略图画布

    const { 
        audioBuffer,
        staticWaveformData,
    } = useAudioStore();

    useEffect(() => {
        thumbnailManagerRef.current = new ThumbnailManager();
        if (thumbnailManagerRef.current) {
            thumbnailManagerRef.current.initialize().then((initialized) => {
                setInitialized(initialized);
            })
        }
 
        return () => {
            thumbnailManagerRef.current?.clearAll();
        }
    }, []);

    useEffect(() => {
        preData.preVideoChangedTime = 0; // 视频文件更新时间，用于标识视频文件更新时间，以便更新缩略图画布
        setScale(DEFAULT_SCALE);
        setScrollLeft(0);
        setVideoChangedTime(Date.now()); // 视频文件更新时间，用于标识视频文件更新时间，以便更新缩略图画布
        return () => {
            clearRequestFrameRef.current && cancelAnimationFrame(clearRequestFrameRef.current);
        }
    },[videoFile])

    useEffect(() => {
        // 获取视频缩略图，用于绘制视频轨道
        const adaptThumbnailDatas = async () => {
            if (duration && videoFile && canvasRef.current && thumbnailManagerRef.current && initialized) {
                const drawEndTime = Math.min(duration - scrollLeft / scale , (canvasRef.current?.width + scrollLeft - DEFAULT_LEFT_DIS + THUMBNAIL_REDUNDANCY_COUNT * THUMBNAIL_WIDTH) / scale);
                const drawStartTime = Math.max(0, Math.floor(
                            (scrollLeft - THUMBNAIL_REDUNDANCY_COUNT * THUMBNAIL_WIDTH - DEFAULT_LEFT_DIS) / scale));
                
                const intervalSec = RULER_SCALE_DATA[`${scale}` as IRulerScaleKey].thumbTimeStep || 1; // 缩略图取样时间间隔
                const firstLoadedFlg = thumbnailManagerRef.current.getCacheSize() === 0;
                const adaptStartTime = Math.floor(drawStartTime / intervalSec) * intervalSec; // 对齐到最近的时间点

                const testData = {
                    width: THUMBNAIL_WIDTH * 2,
                    height: TRACK_HEIGHT[TrackType.VIDEO] * 2,
                    startTimeSec: Math.max(0, adaptStartTime - intervalSec * (firstLoadedFlg ? 5: 20)),  // 首次加载余量只加载5张，后续加载20张
                    endTimeSec: Math.min(duration, drawEndTime + intervalSec * (firstLoadedFlg ? 5: 20)), // 首次加载余量只加载5张，后续加载20张
                }

                const fastExtractor = new FastThumbnailExtractor(3, testData.width, testData.height);
                const startTime = Date.now();

                let preTaskTimes = [];
                console.log('---123456---', preData.preScale !== scale, preData.preVideoChangedTime, videoChangedTime)
                if (preData.preScale !== scale || preData.preVideoChangedTime === 0 && !!videoChangedTime) {
                    // 缩放比例改变时，清空旧数据
                    await thumbnailManagerRef.current.clearAll();
                    preData.preTasksString = '';
                }
                preTaskTimes = preData.preTasksString.split(',');

                const handleData = async () => {
                    const tasks = [];
                    console.log('-1111---')
                    if (!thumbnailManagerRef.current) {
                        return
                    }

                    for (let time = testData.startTimeSec, index = 0; time <= testData.endTimeSec; time += intervalSec, index++) {
                        const aTime = thumbnailManagerRef.current.adaptTime(time);
                        // 首次加载全都要
                        tasks.push({ time: aTime, index });  
                    }
                    const curTasksString = tasks.map(item => item.time).join(',');

                    console.log('-22222---', preData.preTasksString, curTasksString, preTaskTimes, thumbnailManagerRef.current?.getExistedTimes())

                    // newTasks 应该是tasks过滤掉 preTaskTimes里的值
                    const newTasks = tasks.filter(item => preTaskTimes.indexOf(`${item.time}`) === -1 && !thumbnailManagerRef.current?.hasExistedTime(item.time));
                    console.log('-33333---', newTasks.length)
                    if (newTasks.length > 0 && preData.preTasksString !== curTasksString) {
                        console.log('newTasks', newTasks);
                        fastExtractor.optimizedExtractThumbnails({
                            videoFile,
                            tasks: newTasks,
                            partFinishCallback: (results) => {
                                if (thumbnailManagerRef.current) {
                                    const partList = results.filter((rr) => !!rr.blob).map(item => ({ time: item.startTime, blob: item.blob }));
                                    console.log('----vaildPartList---', partList)
                                    thumbnailManagerRef.current.saveMultiThumbnails({ 
                                        tasks: partList
                                    })
                                    .then(() => {
                                        // 数据更新完成时间
                                        setDataUpdateTime(new Date().getTime());
                                        console.log('-part-endTime----', new Date().getTime() - startTime);
                                    })
                                }
                            }
                        }).finally(() => {
                            console.log('--endTime----', new Date().getTime() - startTime);
                        })
                    }
                    preData.preTasksString = curTasksString;
                }
                handleData();
            }
            preData.preScale = scale;
            preData.preVideoChangedTime = videoChangedTime; // 视频文件更新时间，用于标识视频文件更新时间，以便更新缩略图画布
        }
        
        clearRequestFrameRef.current = requestAnimationFrame(() => {
            adaptThumbnailDatas();
        })
       
    }, [duration, scale, canvasRef.current, scrollLeft, videoFile, initialized, videoChangedTime]);

    useEffect(() => {
        // 滚动时预加载缩略图
        if (canvasRef.current && thumbnailManagerRef.current && initialized) {
            const intervalSec = RULER_SCALE_DATA[`${scale}` as IRulerScaleKey].thumbTimeStep || 1;
            const adaptStartTime = Math.floor(Math.max(0, (scrollLeft - DEFAULT_LEFT_DIS)) / scale / intervalSec) * intervalSec; // 对齐到最近的时间点

            const adaptEndTime = Math.floor(
                Math.min(duration, (canvasRef.current.width + scrollLeft - DEFAULT_LEFT_DIS)) / scale / intervalSec) * intervalSec; // 对齐到最近的时间点
            
            const scrollDir = scrollLeft - preData.preScrollLeft > 0 ? 'right' : 'left';

            if (scrollDir === 'left') {
                thumbnailManagerRef.current.preloadAround(adaptStartTime, scrollDir, intervalSec);
            } else {
                thumbnailManagerRef.current.preloadAround(adaptEndTime, scrollDir, intervalSec);
            }
        }
        preData.preScrollLeft = scrollLeft;
    }, [scrollLeft, duration, scale, canvasRef.current, initialized, thumbnailManagerRef.current])

    // 绘制视频轨道
    const drawVideoClip = (ctx: CanvasRenderingContext2D, clip: IClipItem) => {
        if (!thumbnailManagerRef.current || !initialized) {
            return;
        }
        const trackY = startY + clip.trackIndex * (TRACK_HEIGHT[clip.type] + TRACK_SPACING);
   
        // 仅绘制可见的片段
        const intervalSec = RULER_SCALE_DATA[`${scale}` as IRulerScaleKey].thumbTimeStep || 1; // 缩略图取样时间间隔
        const adaptStartTime = Math.floor(Math.max(0, (scrollLeft - DEFAULT_LEFT_DIS)) / scale / intervalSec) * intervalSec; // 对齐到最近的时间点
        const thumbStartx = adaptStartTime * scale - scrollLeft + DEFAULT_LEFT_DIS;
        const availableWidth = Math.min(
            canvasRef.current!.width + scrollLeft - DEFAULT_LEFT_DIS, 
            clip.endTime * scale - (scrollLeft - DEFAULT_LEFT_DIS < 0 ? 0 : scrollLeft - DEFAULT_LEFT_DIS), 
            canvasRef.current!.width
        ) - Math.min(0, thumbStartx); // 减去边距
   
        const drawImgCount = Math.ceil(availableWidth / THUMBNAIL_WIDTH);

        const realImgCount = Math.ceil(availableWidth / scale / intervalSec);
        const repeatCountList = new Array(realImgCount).fill(1);
        if (drawImgCount > realImgCount) {
            const integer = Math.floor(drawImgCount / realImgCount); // 每个元素至少重复的次数
            const remainder = drawImgCount % realImgCount; // 剩余需要分配的元素数量
            // 重新计算每个元素应该出现的次数
            for (let i = 0; i < realImgCount; i++) {
                repeatCountList[i] = i < remainder ? integer + 1 : integer;
            }                
        } else {
            // 当imgCount <= len时，尽量将 realImg 中元素均匀分布
            const interval = Math.floor(realImgCount / drawImgCount); // 计算填充比例
            for (let i = 0; i < drawImgCount; i++) {
                repeatCountList[i] = 0;
                repeatCountList[i * interval] = 1;
            }
        }

        for (let i = 0; i < realImgCount; i++) {
            if (repeatCountList[i] === 0) {
                continue;
            } else {
                const curTime = adaptStartTime + i * intervalSec;
                // 存在时
                if (thumbnailManagerRef.current.hasExistedTime(curTime)) {
                    thumbnailManagerRef.current.getThumbnail(curTime).then((img) => {
                        if (img) {
                           const thumbHeight = TRACK_HEIGHT[TrackType.VIDEO];
                            const thumbY = trackY;

                            for (let j = 0; j < repeatCountList[i]; j++) {
                                const thumbIdx = repeatCountList.slice(0, i).reduce((pre, cur) => pre + cur, 0) + j;
                                const thumbX = thumbStartx + thumbIdx * THUMBNAIL_WIDTH; // 
                            
                                // 确保缩略图不会超出片段范围
                                const remainingWidth = availableWidth - thumbIdx * THUMBNAIL_WIDTH;
                                const drawWidth = Math.min(THUMBNAIL_WIDTH, remainingWidth);

                                // 如果需要裁剪，计算裁剪参数
                                if (drawWidth <= 0) {
                                    break;
                                }
                                if (drawWidth < THUMBNAIL_WIDTH) {
                                    // 计算裁剪比例
                                    const clipRatio = drawWidth / THUMBNAIL_WIDTH;
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

        // 仅绘制可见部分,不需要考虑最初与左边的边距
        if (canvasRef.current && (startX + width > 0 && startX < canvasRef.current!.width)) {
            const startIdx = Math.floor(Math.max(clip.startTime, startX / scale) / duration * staticWaveformData.length);
            const endIdx = Math.ceil( Math.min(clip.endTime, canvasRef.current.width / scale) / duration * staticWaveformData.length);
            const amplitudeArray = staticWaveformData.slice(startIdx, endIdx);
            // 绘制静态波形
            drawWaveform({ startX: startX + DEFAULT_LEFT_DIS, ctx, width, trackY, amplitudeArray });
        }
    }

     // 绘制波形的通用函数
    function drawWaveform({
        startX,
        ctx,
        amplitudeArray,
        width,
        trackY
    }: {
        startX: number;
        ctx: CanvasRenderingContext2D,
        amplitudeArray: Uint8Array,
        width: number;
        trackY: number;
    }) {

        const audioRealHeight = trackY + TRACK_HEIGHT[TrackType.AUDIO];
        const centerY = TRACK_HEIGHT[TrackType.AUDIO] / 1;
        const barWidth = width / amplitudeArray.length;

        const progress = scrollLeft / scale / duration;
        
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
        if (progress > 0 && progress <= 1) {
            // 已播放的折叠波形
            ctx.beginPath();
            ctx.moveTo(startX, audioRealHeight);
            // 计算进度线位置
            const progressX = width * progress + startX;
            
            let progressY = audioRealHeight;

            for (let i = 0; i < amplitudeArray.length; i++) {
                const x = i * barWidth + startX; 

                if (x > progressX) break;
                
                const value = Math.abs((amplitudeArray[i] - 128) / 128); // 取绝对值
                progressY = audioRealHeight - (value * centerY);
                ctx.lineTo(x, progressY);
            }

            if (progressY !== audioRealHeight) {
                ctx.lineTo(progressX, progressY + (audioRealHeight - progressY) / 2);
            }
            
            ctx.lineTo(progressX, audioRealHeight);
            ctx.closePath();
            ctx.fillStyle = upperGradientPlayed;
            ctx.fill();
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
        const startX = clip.startTime * scale - scrollLeft + DEFAULT_LEFT_DIS;
        const width = (clip.endTime - clip.startTime) * scale;
        ctx.fillStyle = 'rgba(9, 178, 245, 0.36)';
        ctx.beginPath();
        ctx.roundRect(startX, trackY, width, TRACK_HEIGHT[clip.type], cornerRadius);
        ctx.fill();

        // 绘制文字
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        const textStartX = clip.startTime * scale - scrollLeft + 10  + DEFAULT_LEFT_DIS;;
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
        ctx.fillStyle = CANVAS_BG_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制轨道
        tracks.forEach((track, index) => {
            // 轨道背景
            const trackY = startY + track.trackIndex * (TRACK_HEIGHT[track.type] + TRACK_SPACING);
            ctx.fillStyle = TRACK_BG_COLOR;
            ctx.fillRect(0, trackY, canvasRef.current!.width, TRACK_HEIGHT[track.type]);

            // 当前轨道中总时长的背景
            ctx.beginPath();
            ctx.fillStyle =  TRACK_DURATION_BG_COLOR;

            ctx.roundRect(
                track.startTime * scale - scrollLeft + DEFAULT_LEFT_DIS, 
                trackY, 
                Math.min(canvasRef.current!.width + scrollLeft, duration * scale), 
                TRACK_HEIGHT[track.type], 
                TRACK_DURATION_BG_RADIUS
            );
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

    useEffect(() => {
        if (dataUpdateTime && initialized && !!thumbnailManagerRef.current?.getCacheSize()) {
            renderTracks();
        }
        // 待提取视频轨道单独更新
    }, [dataUpdateTime, initialized, thumbnailManagerRef.current]); // 数据更新时重新渲染轨道

    // 初始化Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !initialized) return;

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
    }, [scale, scrollLeft, canvasRef.current, tracks, initialized]);


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

