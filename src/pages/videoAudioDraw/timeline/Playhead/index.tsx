import { useEffect, useRef, useState, useCallback } from 'react';
import { useRootStore } from '../../models';
import { RULER_HEIGHT } from '../../models/constant';
import styles from './index.less';

const Playhead = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const parentRef = useRef<HTMLElement | null>(null);

    const { 
        playheadPosition,
        scale,
        scrollLeft,
        isTimelineDragging,
        isClippingOrDragging,

        setIsPlayheadDragging
    } = useRootStore();

        // 处理拖拽开始
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsPlayheadDragging(true);
    };

    useEffect(() => {
        // 处理拖拽过程中，播放头的指针事件
        if (containerRef.current) {
            if (isClippingOrDragging || isTimelineDragging) {
                containerRef.current.style.pointerEvents = 'none'
            } else {
                containerRef.current.style.pointerEvents = 'auto'
            }
        }
    }, [isClippingOrDragging, isTimelineDragging, containerRef.current])


    useEffect(() => {
        if (containerRef.current) {
            parentRef.current = containerRef.current.parentElement;
        }
    }, [containerRef.current])

    return (
        <div  
            ref={containerRef}
            className={styles.playheadContainer}
            onMouseDown={handleDragStart}
            style={{ left: Math.max(
                0,
                Math.min(
                    parentRef.current?.clientWidth || 0, 
                    Math.floor(playheadPosition * scale - scrollLeft))
                )
            }}>
            <div>
                <div className={styles.playhead} />
                <div className={styles.playheadline} />
            </div>
        </div>
    )
}

export default Playhead;

