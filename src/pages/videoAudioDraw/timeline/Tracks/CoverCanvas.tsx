import { useRef, useEffect, useState } from 'react';
import { useRootStore } from '../../models';
import { RULER_HEIGHT, TRACK_HEIGHT, TRACK_SPACING } from '../../models/constant';

import styles from './index.less';
import { ITrack, IClipItem } from '../../types';

const Tracks = ({
    tracks,
}: {
    tracks: ITrack[]
}) => {
    const containerRef = useRef<HTMLCanvasElement>(null);
    const { 
        scale, 
        scrollLeft, 
        isTimelineDragging,
        duration,
        setScrollLeft,
        setScale
    } = useRootStore();
    const startY = RULER_HEIGHT;
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [clipItems, setClipItems] = useState<IClipItem[]>([]);


    // 处理拖拽开始
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        const mouseX = e.clientX - containerRef.current!.getBoundingClientRect().left;
        const mouseY = e.clientY - containerRef.current!.getBoundingClientRect().top;

        // 检查是否点击了视频片段
        const clickedClip = clipItems.find((clip: IClipItem) => {

        const startX = clip.startTime * scale - scrollLeft;
        const endX = startX + (clip.endTime - clip.startTime) * scale;
        const trackY = startY + clip.trackIndex * (TRACK_HEIGHT[clip.type] + TRACK_SPACING);

        const trackEndY = trackY + TRACK_HEIGHT[clip.type];

        // 检查鼠标是否在当前片段的轨道内
        if (mouseY < trackY || mouseY > trackEndY) return false;

        // 检查是否点击了左侧调整手柄
        if (mouseX >= startX - 10 && mouseX <= startX + 10) {
            setClipItems((clips: IClipItem[]) => 
                clips.map((c) => 
                    c.id === clip.id ? { ...c, resizeHandle: 'left' } : c
                )
            );
            return true;
        }

        // 检查是否点击了右侧调整手柄
        if (mouseX >= endX - 10 && mouseX <= endX + 10) {
            setClipItems((clips: IClipItem[]) => 
                clips.map(c => 
                    c.id === clip.id ? { ...c, resizeHandle: 'right' } : c
                )
            );
            return true;
        }

        // 检查是否点击了片段本身
        if (mouseX >= startX && mouseX <= endX) {
            setSelectedClipId(clip.id);
            setClipItems((clips: IClipItem[]) => 
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
            setDragStartX(e.clientX);
            setSelectedClipId(null);
            // 更新播放头位置
            //   setPlayheadPosition(Math.min(duration, clickTime));
        }
    };

    // 处理拖拽移动
    const handleDragMove = (e: React.MouseEvent) => {
        if (!isTimelineDragging && !clipItems.some((clip: IClipItem) => clip.isDragging || clip.resizeHandle)) {
            return;
        }

        const mouseX = e.clientX - containerRef.current!.getBoundingClientRect().left;
        const mouseY = e.clientY - containerRef.current!.getBoundingClientRect().top;

        // 处理时间线拖拽
        if (isTimelineDragging) {
            const deltaX = e.clientX - dragStartX;
            // 确保scrollLeft不会小于0，防止出现负刻度
            const newScrollLeft = Math.max(0, Math.min((duration * scale) - containerRef.current!.getBoundingClientRect().width, scrollLeft - deltaX));
            setScrollLeft(newScrollLeft);
            // 更新拖拽起始位置，确保平滑拖动
            setDragStartX(e.clientX);
            return;
        }

        // 处理视频片段拖拽或调整
        clipItems.forEach((clip: IClipItem) => {
        if (clip.isDragging) {
            // 确定当前鼠标所在轨道
            const newTrackIndex = Math.max(0, Math.min(2, Math.floor((mouseY - startY) / (TRACK_HEIGHT[clip.type] + TRACK_SPACING))));

            const newStartX = mouseX - dragStartX;
            const newStartTime = Math.max(0, Math.min(duration - (clip.endTime - clip.startTime), newStartX / scale + scrollLeft / scale));
            const newEndTime = newStartTime + (clip.endTime - clip.startTime);

            setClipItems((clips: IClipItem[]) => 
                clips.map(c => 
                    c.id === clip.id ? { ...c, startTime: newStartTime, endTime: newEndTime, trackIndex: newTrackIndex } : c
                )
            );
        } else if (clip.resizeHandle === 'left') {
            const newStartX = mouseX;
            const newStartTime = Math.max(0, Math.min(clip.endTime - 0.1, newStartX / scale + scrollLeft / scale));

            setClipItems((clips: IClipItem[]) => {
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

            setClipItems((clips: IClipItem[]) => {
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
        // 拖拽结束后，确保每条轨道上的片段不重叠
        setClipItems((clips: IClipItem[]) => {
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
                resizeHandle: ''
            }));
        });
    };

    // 处理鼠标滚轮缩放
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();

        // 获取鼠标在时间线上的位置
        const mouseX = e.clientX - containerRef.current!.getBoundingClientRect().left;
        const timeAtMouse = (mouseX + scrollLeft) / scale;

        // 调整缩放比例
        const newScale = Math.max(10, Math.min(500, scale - e.deltaY * 0.1));

        // 保持鼠标位置的时间点不变
        const newScrollLeft = timeAtMouse * newScale - mouseX;

        setScale(newScale);
        setScrollLeft(newScrollLeft);
    };

    const handleClick = (e: React.MouseEvent) => {
        // 如果已经在拖拽中，则不处理点击
        if (isTimelineDragging || clipItems.some((clip: IClipItem) => clip.isDragging || clip.resizeHandle)) {
            return;
        }

        const mouseX = e.clientX - containerRef.current!.getBoundingClientRect().left;
        const mouseY = e.clientY - containerRef.current!.getBoundingClientRect().top;

        // 检查是否点击了视频片段以外的区域
        const clickedClip = clipItems.find((clip: IClipItem) => {
            const startX = clip.startTime * scale - scrollLeft;
            const endX = startX + (clip.endTime - clip.startTime) * scale;
            const trackY = startY + clip.trackIndex * (TRACK_HEIGHT[clip.type] + TRACK_SPACING);
            const trackEndY = trackY + TRACK_HEIGHT[clip.type];

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

    return (
        <canvas
            ref={containerRef}
            id={'custom_cover_canvas'}
            className={styles.customCoverCanvas}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            // onWheel={handleWheel}
            onClick={handleClick} />
    )
}

export default Tracks;
