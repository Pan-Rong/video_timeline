import { useRef, useEffect, useState, useCallback } from 'react';
import { useRootStore } from '../../models';
import { RULER_HEIGHT, TRACK_HEIGHT, TRACK_SPACING, HANDLE_WIDTH, MIN_CLIP_WIDTH } from '../../models/constant';

import styles from './index.less';
import { ITrack, IClipItem } from '../../types';

let preHandleType: string = '';
const Tracks = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { 
        scale, 
        scrollLeft, 
        isTimelineDragging,
        isPlayheadDragging,
        duration,
        tracks,
        setTracks,
        setScrollLeft,
        setScale,
        setIsClippingOrDragging
    } = useRootStore();
    const startY = 0;
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [selectedClipItem, setSelectedClipItem] = useState<{
        clipId: string,
        trackId: string,
    } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isClipping, setIsClipping] = useState(false);
    const animationRef = useRef<number>();

    useEffect(() => {
       setIsClippingOrDragging(isDragging || isClipping);
    }, [isDragging, isClipping])

    const checkMousePosition = (e: React.MouseEvent) => {
        e.preventDefault();
        const mouseX = e.clientX - canvasRef.current!.getBoundingClientRect().left;
        const mouseY = e.clientY - canvasRef.current!.getBoundingClientRect().top;
        // 检查是否点击了视频片段
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const startX = track.startTime * scale - scrollLeft;
            const endX = startX + (track.endTime - track.startTime) * scale;
            const trackY = startY + track.trackIndex * (TRACK_HEIGHT[track.type] + TRACK_SPACING);
            const trackEndY = trackY + TRACK_HEIGHT[track.type];
            // 检查是否点击了该轨道
            if (mouseX >= startX - 10 && mouseX <= endX + 10 && mouseY >= trackY && mouseY <= trackEndY) {
                for (let j = 0; j < track.clips.length; j++) {
                    const clip = track.clips[j];
                    const clipStartX = clip.startTime * scale - scrollLeft;
                    const clipEndX = clipStartX + (clip.endTime - clip.startTime) * scale;
                    // 检查是否点击了片段本身
                    if (mouseX >= clipStartX - 10 && mouseX <= clipEndX + 10 && mouseY >= trackY && mouseY <= trackEndY) {
                        // 选中非手柄部分
                        if (mouseX >= clipStartX + HANDLE_WIDTH  && mouseX <= clipEndX - HANDLE_WIDTH) {
                            // 选中片段
                            return { item: clip, position: 'clip' };
                        }
                        let handleType = 'right';
                        // 选中左侧手柄
                        if (mouseX >= clipStartX - 10 && mouseX <= clipStartX + HANDLE_WIDTH) {
                            handleType = 'left';
                        }
                        return { item: clip, position: 'handle', handleType };
                    }
                }
            }
        }
        return null;
    }

    // 处理拖拽开始
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        preHandleType = '';
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const mouseX = e.clientX - canvasRef.current!.getBoundingClientRect().left;
        const clickedClipData = checkMousePosition(e);
        if (clickedClipData) {
            const { item, position } = clickedClipData;
            if (position === 'clip') {
                const startX = item.startTime * scale - scrollLeft;
                setIsDragging(true);
                setDragStartX(mouseX - startX);
            } else if (position === 'handle') {
                setIsClipping(true);
            }
            setSelectedClipItem({
                clipId: item.id,
                trackId: item.parentId,
            });
            drawClip(ctx, item);
        } else {
            // 没有选中
            setSelectedClipItem(null);
            setIsClipping(false);
            setIsDragging(false);
        }
    };

    // 使用requestAnimationFrame更新位置
    const updateCanvasCursor = useCallback((cursor: string) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = requestAnimationFrame(() => {
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.style.cursor = cursor;
            }
        });
    }, []);

    // 处理拖拽移动
    const handleDragMove = (e: React.MouseEvent) => {
        const mouseX = e.clientX - canvasRef.current!.getBoundingClientRect().left;
        const mouseY = e.clientY - canvasRef.current!.getBoundingClientRect().top;
        if (isTimelineDragging || isPlayheadDragging) {
            return
        }
        // 只处理hover 效果
        const clickedClipData = checkMousePosition(e);
        if (clickedClipData) {
            if (clickedClipData.position === 'handle' && clickedClipData.item.id === selectedClipItem?.clipId) {
                // 选中手柄
                updateCanvasCursor('ew-resize');
            } else {
                updateCanvasCursor('pointer');
            }
        } else {
            // 未选中
            updateCanvasCursor('default');
        }
        if ((!isDragging && !isClipping)) {
            return;
        }
        if (isDragging) {
            updateCanvasCursor('move');
        }
        // 处理片段拖拽或调整
        const clip = clickedClipData?.item || tracks.find(t => t.id === selectedClipItem?.trackId)?.clips.find((c) => c.id === selectedClipItem?.clipId);
        const handleType = clickedClipData?.handleType || preHandleType;
        if (isDragging && clip) {
            const newTrackIndex = Math.max(0, Math.min(tracks.length - 1, Math.floor((mouseY - startY) / (TRACK_HEIGHT[clip.type] + TRACK_SPACING))));
            // 确定当前鼠标所在轨道
            const newStartX = mouseX - dragStartX;
            // 处理片段拖拽
            const originTracks = tracks.slice(0);
            const curTrack = originTracks.find(t => t.id === clip.parentId);
            const clipDuration = clip.endTime - clip.startTime;
            if (curTrack && clip.trackIndex === newTrackIndex) {
                const clipIdx = curTrack.clips.findIndex(c => c.id === clip.id);
                if (clipIdx > -1) {
                    const newStartTime = Math.max(0, Math.min(duration - clipDuration, newStartX / scale + scrollLeft / scale));
                    const newEndTime = newStartTime + clipDuration;
                    curTrack.clips[clipIdx].startTime = newStartTime;
                    curTrack.clips[clipIdx].endTime = newEndTime;
                    curTrack.clips[clipIdx].trackIndex = newTrackIndex;
                }
            }
            setTracks(originTracks);
        } else if (isClipping && clip && clip.id === selectedClipItem?.clipId) {
            const newTrackIndex = Math.max(0, Math.min(tracks.length - 1, Math.floor((mouseY - startY) / (TRACK_HEIGHT[clip.type] + TRACK_SPACING))));

            if (handleType === 'left' && clip.trackIndex === newTrackIndex) {
                const newStartX = mouseX;
                const newStartTime = Math.max(0, Math.min(clip.endTime - 0.1, newStartX / scale + scrollLeft / scale));
                // 处理片段拖拽
                const originTracks = tracks.slice(0);
                const curTrack = originTracks.find(t => t.id === clip.parentId);
                if (curTrack) {
                    // 只与同轨道的前一个片段比较
                    const clipIdx = curTrack.clips.findIndex(c => c.id === clip.id && c.trackIndex === clip.trackIndex);
   
                    if (clipIdx > -1) {
                        // 与同轨道的前一个片段比较
                        const prevClip = curTrack.clips.find(c => c.endTime <= curTrack.clips[clipIdx].startTime);
                        curTrack.clips[clipIdx].startTime = Math.min(
                            prevClip ? Math.max(newStartTime, prevClip.endTime) : newStartTime,
                            clip.endTime - MIN_CLIP_WIDTH / scale
                        );
                    }
                }
                setTracks(originTracks);
            } else if (handleType === 'right' && clip.trackIndex === newTrackIndex) {
                const newEndX = mouseX;
                const newEndTime = Math.max(clip.startTime + 0.1, Math.min(duration, newEndX / scale + scrollLeft / scale));
                // 处理片段拖拽
                const originTracks = tracks.slice(0);
                const curTrackIdx = originTracks.findIndex(t => t.id === clip.parentId);
                if (curTrackIdx > -1) {
                    const curTrack = originTracks[curTrackIdx];
                    // 只与同轨道的前一个片段比较
                    const clipIdx = curTrack.clips.findIndex(c => c.id === clip.id && c.trackIndex === clip.trackIndex); 
                    if (clipIdx > -1) {
                        // 与同轨道的前后片段各比较
                        const nextClip = curTrack.clips.find(c => c.startTime >= curTrack.clips[clipIdx].endTime);
                        const prevClip = curTrack.clips.find(c => c.endTime <= curTrack.clips[clipIdx].startTime);
                        curTrack.clips[clipIdx].endTime = Math.max(nextClip ?
                            Math.min(newEndTime, nextClip.startTime) : newEndTime, 
                            (prevClip?.endTime || 0) + MIN_CLIP_WIDTH / scale  // 最小片段时长
                        );
                    }
                }
                setTracks(originTracks);
            }
        }
        preHandleType = handleType || '';
    };

    // 处理拖拽结束
    const handleDragEnd = () => {
        setIsDragging(false);
        setIsClipping(false);
        preHandleType = '';

        updateCanvasCursor('default');
        // 拖拽结束后，确保每条轨道上的片段不重叠
      
        // setClipItems((clips: IClipItem[]) => {
        // // 按轨道和startTime排序所有片段
        //     const sortedClips = [...clips].sort((a, b) => {
        //         if (a.trackIndex !== b.trackIndex) {
        //         return a.trackIndex - b.trackIndex;
        //         }
        //         return a.startTime - b.startTime;
        //     });
        //     const adjustedClips = [...sortedClips];

        //     // 检查并调整每条轨道上的重叠
        //     for (let i = 1; i < adjustedClips.length; i++) {
        //         const currentClip = adjustedClips[i];
        //         const prevClip = adjustedClips[i - 1];

        //         // 只检查同轨道的片段
        //         if (currentClip.trackIndex === prevClip.trackIndex) {
        //         // 如果当前片段与前一个片段重叠
        //         if (currentClip.startTime < prevClip.endTime) {
        //             // 调整当前片段的startTime到前一个片段的endTime
        //             const duration = currentClip.endTime - currentClip.startTime;
        //             adjustedClips[i] = {
        //             ...currentClip,
        //             startTime: prevClip.endTime,
        //             endTime: prevClip.endTime + duration
        //             };
        //         }
        //         }
        //     }

        //     // 重置拖拽状态
        //     return adjustedClips;
        // });
    };

    const renderTracks = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // drawTrack(ctx);
        console.log('-----selectedClipItem---', selectedClipItem)
        if (selectedClipItem) {
        
            const clip = tracks.find(t => t.id === selectedClipItem.trackId)?.clips.find(c => c.id === selectedClipItem.clipId);
            if (clip) {
                drawClip(ctx, clip);
            }
       }
    }

    const drawClip = (ctx: CanvasRenderingContext2D, clip: IClipItem) => {
        const startX = clip.startTime * scale - scrollLeft;
        const endX = clip.endTime * scale - scrollLeft;
        const trackY = clip.trackIndex * (TRACK_HEIGHT[clip.type] + TRACK_SPACING) + startY - 2;

        // 绘制选中效果
        const cornerRadius = 6; // 设置6px圆角
        // 绘制带圆角的片段边框
        ctx.strokeStyle = 'rgba(29, 43, 240, 0.9)';
        ctx.fillStyle = 'rgba(29, 43, 240, 0.36)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(startX, trackY, (endX - startX), TRACK_HEIGHT[clip.type], cornerRadius);
        ctx.fill();
        ctx.stroke();

        // 绘制左侧手柄
        const handleWidth = 12;
        const handleHeight = TRACK_HEIGHT[clip.type];
        const handleY = trackY;
        
        // 左侧手柄
        ctx.fillStyle = 'rgba(29, 43, 240, 0.9)';
        ctx.beginPath();
        ctx.roundRect(startX - 5, handleY, handleWidth, handleHeight, [cornerRadius, 0, 0, cornerRadius]);
        ctx.fill();

        // 右侧手柄
        ctx.fillStyle = 'rgba(29, 43, 240, 0.9)';
        ctx.beginPath();
        ctx.roundRect(endX - handleWidth + 5, handleY, handleWidth, handleHeight, [0, cornerRadius, cornerRadius, 0]);
        ctx.fill();
    }


    // 在组件中添加useEffect钩子来设置Canvas尺寸
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

    }, [canvasRef.current, scale, scrollLeft, tracks, selectedClipItem]);


    return (
        <canvas
            ref={canvasRef}
            id={'custom_cover_canvas'}
            className={styles.customCoverCanvas}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}/>
    )
}

export default Tracks;
