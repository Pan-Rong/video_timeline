import { useRef, useEffect, useState, useCallback } from 'react';
import { useRootStore } from '../../models';
import { RULER_HEIGHT, TRACK_HEIGHT, TRACK_SPACING, HANDLE_WIDTH, MIN_CLIP_WIDTH, DEFAULT_LEFT_DIS } from '../../models/constant';

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
        selectedClipItem,
        setSelectedClipItem,
        setTracks,
        setIsClippingOrDragging
    } = useRootStore();
    const startY = 0;
    const [dragStartX, setDragStartX] = useState<number>(0);
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
            const startX = track.startTime * scale - scrollLeft + DEFAULT_LEFT_DIS;
            const endX = startX + (track.endTime - track.startTime) * scale;
            const trackY = startY + track.trackIndex * (TRACK_HEIGHT[track.type] + TRACK_SPACING);
            const trackEndY = trackY + TRACK_HEIGHT[track.type];
            // 检查是否点击了该轨道
            if (mouseX >= startX - 10 && mouseX <= endX + 10 && mouseY >= trackY && mouseY <= trackEndY) {
                for (let j = 0; j < track.clips.length; j++) {
                    const clip = track.clips[j];
                    const clipStartX = clip.startTime * scale - scrollLeft + DEFAULT_LEFT_DIS;
                    const clipEndX = clipStartX + (clip.endTime - clip.startTime) * scale;

                    const preClip = j > 0 ? track.clips[j - 1] : null;
                    const nextClip = j < track.clips.length - 1 ? track.clips[j + 1] : null;

                    // 优先判断是否选中了片段
                    if (selectedClipItem && (
                        selectedClipItem.originTime.endTime > (clip.startTime - HANDLE_WIDTH / scale) && preClip && selectedClipItem.clipId === preClip.id || 
                        selectedClipItem.originTime.startTime < (clip.endTime + HANDLE_WIDTH / scale) && nextClip && selectedClipItem.clipId === nextClip.id
                    )) {
                        if (selectedClipItem.originTime.endTime > (clip.startTime - HANDLE_WIDTH / scale) && preClip && selectedClipItem.clipId === preClip.id && mouseX >= clipStartX && mouseX <= clipStartX + HANDLE_WIDTH / 2) {
                            // 选中了前一个片段的右侧手柄
                            return { item: preClip, position: 'handle', handleType: 'right' };
                        } else if (selectedClipItem.originTime.startTime < (clip.endTime + HANDLE_WIDTH / scale) && nextClip && selectedClipItem.clipId === nextClip.id && mouseX >= clipEndX - HANDLE_WIDTH / 2 && mouseX <= clipEndX) {
                            // 选中了后一个片段的左侧手柄
                            return { item: nextClip, position: 'handle', handleType: 'left' };
                        }
                    }

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

        console.log('-aaa--', clickedClipData)
        if (clickedClipData) {
            const { item, position } = clickedClipData;
            const startX = item.startTime * scale - scrollLeft;
            if (position === 'clip') {
                setIsDragging(true);
                setDragStartX(mouseX - startX);
            } else if (position === 'handle') {
                preHandleType = clickedClipData.handleType || '';
                setIsClipping(true);
            }
            setSelectedClipItem({
                type: item.type,
                clipId: item.id,
                trackId: item.parentId,
                originTime: { // 原始位置,用于拖拽后如果有重叠且不能前后调整时还原到最初用
                    startTime: item.startTime,
                    endTime: item.endTime 
                }
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
        let clickedClipData = null;
        
        if (!isClipping && !isDragging) {
            clickedClipData = checkMousePosition(e);
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
            return;
        }
        
        if (isDragging) {
            updateCanvasCursor('move');
        } else if (isClipping) {
            updateCanvasCursor('ew-resize');
        }
        // 处理片段拖拽或调整
        const clip = tracks.find(t => t.id === selectedClipItem?.trackId)?.clips.find((c) => c.id === selectedClipItem?.clipId);
        const handleType = preHandleType;
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
                const newStartTime = Math.max(0, Math.min(clip.endTime - 0.1, newStartX / scale + scrollLeft / scale - DEFAULT_LEFT_DIS / scale));
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
                const newEndTime = Math.max(clip.startTime + 0.1, Math.min(duration, newEndX / scale + scrollLeft / scale - DEFAULT_LEFT_DIS / scale));

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
                        curTrack.clips[clipIdx].endTime = Math.max(nextClip ?
                            Math.min(newEndTime, nextClip.startTime) : newEndTime, 
                            (curTrack.clips[clipIdx].startTime || 0) + MIN_CLIP_WIDTH / scale  // 最小片段时长
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
        const _isDragging = isDragging;
        setIsDragging(false);
        setIsClipping(false);
        preHandleType = '';
        updateCanvasCursor('default');

        // 拖拽结束后，确保每条轨道上的片段不重叠
        const originTracks = tracks.slice(0);
        const curTrackIdx = originTracks.findIndex(t => t.id === selectedClipItem?.trackId);
        const curTrack = originTracks[curTrackIdx];
        if (curTrack && selectedClipItem && _isDragging) {
            const clips = curTrack.clips.slice(0).sort((a, b) => a.startTime - b.startTime);
            const curClip = clips.find(c => c.id === selectedClipItem.clipId);

            if (curClip) {
                // 先判断是否有覆盖其他片段
                const coverClip = clips.find((c) => c.id !== curClip.id && c.startTime >= curClip.startTime && c.endTime <= curClip.endTime);
                if (coverClip) {
                    // 返回原位置
                    curClip.startTime = selectedClipItem.originTime.startTime;
                    curClip.endTime = selectedClipItem.originTime.endTime;
                } else {
                    // 查看当前片段是否与前一个片段重叠，如果重叠部分超过50%，且前一个片段的前面空间足够的话，则放前一个片段的前面； 空间不够的话，则返回原位置；
                    const overlapIdx = clips.findIndex(c => c.id !== curClip.id && c.startTime <= curClip.endTime && c.endTime >= curClip.startTime);
                    if (overlapIdx > -1) {
                        const overlapClip = clips[overlapIdx];
                        const curClipWidth = curClip.endTime - curClip.startTime;
                        // 表示有重叠
                        if (overlapClip.startTime <= curClip.startTime && overlapClip.endTime >= curClip.endTime) {
                            // 全覆盖、则返回原位置
                            curClip.startTime = selectedClipItem.originTime.startTime;
                            curClip.endTime = selectedClipItem.originTime.endTime;
                        } else {
                            if (curClip.startTime > overlapClip.startTime) {
                                // 表示当前片段在重叠片段的后面; 判断前一个片段后的空间是否足够
                                const nextClip = overlapIdx + 2 < clips.length ? clips[overlapIdx + 2] : null; // 去掉自己
                                if (nextClip && (nextClip.startTime - overlapClip.endTime) >= curClipWidth || !nextClip && (duration - overlapClip.endTime) >= curClipWidth) {
                                    // 后一个片段后的空间足够
                                    curClip.startTime = overlapClip.endTime;
                                    curClip.endTime = curClip.startTime + curClipWidth;
                                } else {
                                    // 返回原位置
                                    curClip.startTime = selectedClipItem.originTime.startTime;
                                    curClip.endTime = selectedClipItem.originTime.endTime;
                                }
                            } else {
                                // 表示当前片段在重叠片段的前面; 判断前一个片段前的空间是否足够
                                const pprevClip = overlapIdx - 1 > 0 ? clips[overlapIdx - 2] : null; // 去掉自己
                                if (pprevClip && (overlapClip.startTime - pprevClip.endTime) >= curClipWidth || !pprevClip && overlapClip.startTime >= curClipWidth) {
                                    // 前一个片段前的空间足够
                                    curClip.endTime = overlapClip.startTime;
                                    curClip.startTime = curClip.endTime - curClipWidth;
                                } else {
                                    // 返回原位置
                                    curClip.startTime = selectedClipItem.originTime.startTime;
                                    curClip.endTime = selectedClipItem.originTime.endTime;
                                }
                            }
                        }
                    }
                }
            }
            originTracks[curTrackIdx].clips = clips;
        }
        setTracks(originTracks);
        if (selectedClipItem && curTrack) {
            const curClip = curTrack.clips.find(c => c.id === selectedClipItem.clipId);
            if (curClip) {
                 setSelectedClipItem({
                    ...selectedClipItem,
                    originTime: {
                        startTime: curClip.startTime,
                        endTime: curClip.endTime,
                    }
                })
            } else {
                setSelectedClipItem(null);
            }
        } else {
            setSelectedClipItem(null);
        }
    };

    const renderTracks = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (selectedClipItem) {
            const clip = tracks.find(t => t.id === selectedClipItem.trackId)?.clips.find(c => c.id === selectedClipItem.clipId);
            if (clip) {
                drawClip(ctx, clip);
            }
       }
    }

    const drawClip = (ctx: CanvasRenderingContext2D, clip: IClipItem) => {
        const startX = clip.startTime * scale - scrollLeft + DEFAULT_LEFT_DIS;
        const endX = clip.endTime * scale - scrollLeft + DEFAULT_LEFT_DIS;
        const trackY = clip.trackIndex * (TRACK_HEIGHT[clip.type] + TRACK_SPACING - 1) + startY;

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
