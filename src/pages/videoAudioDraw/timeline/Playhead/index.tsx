import { useEffect, useRef, useState, useCallback } from 'react';
import { useRootStore } from '../../models';
import { RULER_HEIGHT } from '../../models/constant';
import styles from './index.less';

const Playhead = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const parentRef = useRef<HTMLElement | null>(null);
    const animationRef = useRef<number>();
    const [localPosition, setLocalPosition] = useState<number>(0);

    const { 
        playheadPosition,
        scale,
        scrollLeft,
        setIsPlayheadDragging
    } = useRootStore();

        // 处理拖拽开始
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // 防止事件冒泡
        setIsPlayheadDragging(true);
    };

    useEffect(() => {
        if (containerRef.current) {
            parentRef.current = containerRef.current.parentElement;
        }
    }, [containerRef.current])


    // 使用requestAnimationFrame更新位置
    const updatePosition = useCallback((position: number) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        
        animationRef.current = requestAnimationFrame(() => {
            setLocalPosition(position);
        });
    }, []);

    useEffect(() => {
        updatePosition(playheadPosition);
    }, [playheadPosition, updatePosition]);

    return (
        <div  
            ref={containerRef}
            className={styles.playheadContainer}
            onMouseDown={handleDragStart}
            style={{ left: Math.min(
                parentRef.current?.clientWidth || 0, 
                Math.floor(localPosition * scale))
            }}>
            <div>
                <div className={styles.playhead} />
                <div className={styles.playheadline} />
            </div>
        </div>
    )
}

export default Playhead;

