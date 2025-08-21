import { useRef, useEffect, useState, useCallback } from 'react';
import { useRootStore } from '../../models';
import { RULER_HEIGHT, TRACK_HEIGHT, TRACK_SPACING, HANDLE_WIDTH } from '../../models/constant';

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
    } = useRootStore();
    const startY = 0;
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [clipItems, setClipItems] = useState<IClipItem[]>(tracks.map((track) => ({
            id: track.id,
            trackIndex: track.trackIndex,
            type: track.type,
            startTime: track.startTime,
            endTime: track.endTime,
            color: track.color,
            name: track.name,
        })));
    const [isDragging, setIsDragging] = useState(false);
    const [isClipping, setIsClipping] = useState(false);
    const animationRef = useRef<number>();

    useEffect(() => {
        setClipItems(tracks.map((track) => ({
            id: track.id,
            trackIndex: track.trackIndex,
            type: track.type,
            startTime: track.startTime,
            endTime: track.endTime,
            color: track.color,
            name: track.name,
        })));
    }, [tracks])

    const checkMousePosition = (e: React.MouseEvent) => {
        e.preventDefault();
        const mouseX = e.clientX - canvasRef.current!.getBoundingClientRect().left;
        const mouseY = e.clientY - canvasRef.current!.getBoundingClientRect().top;

         // 检查是否点击了视频片段
        for (let i = 0; i < clipItems.length; i++) {
            const clip = clipItems[i];

            const startX = clip.startTime * scale - scrollLeft;
            const endX = startX + (clip.endTime - clip.startTime) * scale;
            const trackY = startY + clip.trackIndex * (TRACK_HEIGHT[clip.type] + TRACK_SPACING);
            const trackEndY = trackY + TRACK_HEIGHT[clip.type];

            // 检查是否点击了片段本身
            if (mouseX >= startX - 10 && mouseX <= endX + 10 && mouseY >= trackY && mouseY <= trackEndY) {
                // 选中非手柄部分
                if (mouseX >= startX + HANDLE_WIDTH  && mouseX <= endX - HANDLE_WIDTH) {
                    // 选中片段
                    return { item: clip, dragStartX: mouseX - startX, position: 'clip' };

                }
                let handleType = 'right';
                // 选中左侧手柄
                if (mouseX >= startX - 10 && mouseX <= startX + HANDLE_WIDTH) {
                    handleType = 'left';
                }
            
                return { item: clip, dragStartX: mouseX - startX, position: 'handle', handleType };
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

        const clickedClipData = checkMousePosition(e);

        if (clickedClipData) {
            const { item, dragStartX, position } = clickedClipData;
            if (position === 'clip') {
                setIsDragging(true);
                setDragStartX(dragStartX);
            } else if (position === 'handle') {
                setIsClipping(true);
            }

            setSelectedClipId(item.id);
            drawClip(ctx, item);
        } else {
            // 没有选中
            setDragStartX(e.clientX);
            setSelectedClipId(null);
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

        if (isTimelineDragging || isPlayheadDragging) {
            return
        }
        // 只处理hover 效果
        const clickedClipData = checkMousePosition(e);

        if (clickedClipData) {
            if (clickedClipData.position === 'handle' && clickedClipData.item.id === selectedClipId) {
                // 选中手柄
                updateCanvasCursor('ew-resize');
            } else {
                updateCanvasCursor('pointer');
            }
        } else {
            // 未选中
            updateCanvasCursor('default');
        }

        console.log('isDragging', isDragging, 'clickedClipData', !!clickedClipData, 'isClipping', isClipping)
        if ((!isDragging && !isClipping)) {
            return;
        }

        if (isDragging) {
            updateCanvasCursor('move');
        }

        const mouseX = e.clientX - canvasRef.current!.getBoundingClientRect().left;
        const mouseY = e.clientY - canvasRef.current!.getBoundingClientRect().top;
        // 处理视频片段拖拽或调整
        const clip = clickedClipData?.item || clipItems.find(c => c.id === selectedClipId);

        const handleType = clickedClipData?.handleType || preHandleType;

        if (isDragging && clickedClipData && clickedClipData.item.id === selectedClipId) {

            const { item: clip, dragStartX } = clickedClipData;
            // 确定当前鼠标所在轨道
            const newTrackIndex = Math.max(0, Math.min(2, Math.floor((mouseY - startY) / (TRACK_HEIGHT[clip.type] + TRACK_SPACING))));
            const newStartX = mouseX - dragStartX;
            const newStartTime = Math.max(0, Math.min(duration - (clip.endTime - clip.startTime), newStartX / scale + scrollLeft / scale));
            const newEndTime = newStartTime + (clip.endTime - clip.startTime);

            // setClipItems((clips: IClipItem[]) => 
            //     clips.map(c => 
            //         c.id === clip.id ? { ...c, startTime: newStartTime, endTime: newEndTime, trackIndex: newTrackIndex } : c
            //     )
            // );

            const originTracks = tracks.slice(0);
            const len = originTracks.length;
            for (let i = 0; i < len; i ++) {
                if (originTracks[i].id === clip.id) {
                    // 只与同轨道的后一个片段比较
                    // const nextClip = originTracks.find(c => c.trackIndex === clip.trackIndex && c.startTime >= originTracks[i].endTime);
                    originTracks[i].startTime = newStartTime;
                    originTracks[i].endTime = newEndTime;
                    originTracks[i].trackIndex = newTrackIndex;
                }
            }
            setTracks(originTracks);

        } else if (isClipping && clip && clip.id === selectedClipId) {


            if (handleType === 'left') {
                const newStartX = mouseX;
                const newStartTime = Math.max(0, Math.min(clip.endTime - 0.1, newStartX / scale + scrollLeft / scale));

                const originTracks = tracks.slice(0);
                const len = originTracks.length;
                for (let i = 0; i < len; i ++) {
                    if (originTracks[i].id === clip.id) {
                        // 只与同轨道的前一个片段比较
                        const prevClip = originTracks.find(c => c.trackIndex === clip.trackIndex && c.endTime <= originTracks[i].startTime);
                        originTracks[i].startTime = prevClip ? Math.max(newStartTime, prevClip.endTime) : newStartTime;
                    }
                }
                setTracks(originTracks);
            } else if (handleType === 'right') {
                const newEndX = mouseX;
                const newEndTime = Math.max(clip.startTime + 0.1, Math.min(duration, newEndX / scale + scrollLeft / scale));

                const originTracks = tracks.slice(0);
                const len = originTracks.length;
                for (let i = 0; i < len; i ++) {
                    if (originTracks[i].id === clip.id) {
                        // 只与同轨道的后一个片段比较
                        const nextClip = originTracks.find(c => c.trackIndex === clip.trackIndex && c.startTime >= originTracks[i].endTime);
                        originTracks[i].endTime = nextClip ? Math.min(newEndTime, nextClip.startTime) : newEndTime;
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
       if (selectedClipId) {
            const clip = clipItems.find(c => c.id === selectedClipId);
            if (clip) {
                drawClip(ctx, clip);
            }
       }
    }

    const drawClip = (ctx: CanvasRenderingContext2D, clip: IClipItem) => {
        const startX = clip.startTime * scale - scrollLeft * scale;
        const endX = clip.endTime * scale - scrollLeft * scale;
        const trackY = clip.trackIndex * (TRACK_HEIGHT[clip.type] + TRACK_SPACING) + startY;

        // 绘制选中效果
        const cornerRadius = 6; // 设置6px圆角
        // 绘制带圆角的片段边框
        ctx.strokeStyle = 'rgba(29, 43, 240, 0.9)';
        ctx.fillStyle = 'rgba(29, 43, 240, 0.36)';
        ctx.lineWidth = 2;
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
        ctx.roundRect(startX, handleY, handleWidth, handleHeight, [cornerRadius, 0, 0, cornerRadius]);
        ctx.fill();

        // 右侧手柄
        ctx.fillStyle = 'rgba(29, 43, 240, 0.9)';
        ctx.beginPath();
        ctx.roundRect(endX - handleWidth, handleY, handleWidth, handleHeight, [0, cornerRadius, cornerRadius, 0]);
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

    }, [canvasRef.current, scale, scrollLeft, clipItems, selectedClipId]);


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
