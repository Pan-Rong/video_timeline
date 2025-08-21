import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../../utils/format';
import { useRootStore } from '../../models';
import { RULER_HEIGHT } from '../../models/constant';

const Ruler = () => { 
    const { 
        duration,
        scale, 
        scrollLeft,
        playheadPosition,
        isTimelineDragging,
        setScrollLeft,
        setPlayheadPosition,
        setIsTimelineDragging
    } = useRootStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dragStartX, setDragStartX] = useState<number>(0);

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

    // 初始化Canvas
    useEffect(() => {
        const parentEle = canvasRef.current?.parentElement;
        if (!parentEle) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 设置Canvas尺寸
        const resizeCanvas = () => {
            const container = parentEle;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = RULER_HEIGHT;
                // 清除画布
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // 绘制背景
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 绘制时间刻度
                drawTimeRuler(ctx);
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [scale, scrollLeft]);

    // 处理拖拽开始
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();

        setIsTimelineDragging(true);
        setDragStartX(e.clientX);
        // 更新播放头位置
        //   setPlayheadPosition(Math.min(duration, clickTime));
    };

    // 处理拖拽移动
    const handleDragMove = (e: React.MouseEvent) => {
        const parentEle = canvasRef.current?.parentElement;
        if (!isTimelineDragging || !parentEle) {
            return;
        }
        // 处理时间线拖拽
        const deltaX = e.clientX - dragStartX;
        // 确保scrollLeft不会小于0，防止出现负刻度
        const newScrollLeft = Math.max(0, Math.min((duration * scale  * 2) - canvasRef.current!.width, scrollLeft - deltaX));
        
        setScrollLeft(newScrollLeft);
        // 更新拖拽起始位置，确保平滑拖动
        setDragStartX(e.clientX);

        setPlayheadPosition(Math.max(
            Math.min(playheadPosition, duration - newScrollLeft / scale, (parentEle.clientWidth || 0) /scale),
            0,
        ));
    };

    // 处理拖拽结束
    const handleDragEnd = () => {
        setIsTimelineDragging(false);
    };

    return (
      <canvas ref={canvasRef} 
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        style={{ 
            cursor: isTimelineDragging ? 'grabbing' : 'grab'
        }}
      />
    );
}

export default Ruler;

