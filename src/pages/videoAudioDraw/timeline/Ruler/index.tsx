import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../../utils/format';
import { useRootStore } from '../../models';
import { 
    RULER_HEIGHT, 
    DEFAULT_SCALE, 
    RULER_BG_COLOR,
    RULER_TEXT_COLOR,
    DEFAULT_LEFT_DIS
} from '../../models/constant';

const Ruler = () => { 
    const { 
        duration,
        scale, 
        scrollLeft,
        isTimelineDragging,
        setScrollLeft,
        setIsTimelineDragging
    } = useRootStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dragStartX, setDragStartX] = useState<number>(0);
    const preScrollLeft = useRef<number>(scrollLeft);

    // 绘制时间刻度
    const drawTimeRuler = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = RULER_TEXT_COLOR;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';

        // 始终从0开始绘制刻度
        const startSec = 0;
        const endSec = Math.ceil((scrollLeft + canvasRef.current!.width) / scale);

        // 根据scale确定刻度间隔
        let mainInterval = 1; // 刻度间隔(秒)
        // 动态调整刻度间隔
        // 计算scale 与 DEFAULT_SCALE 的比例
        if (scale >= 170) {
            mainInterval = 0.2;
        } else if (scale >= 150) {
            mainInterval = 0.4;
        } else if (scale >= 130) {
            mainInterval = 0.6;
        } else if (scale >= 110) {
            mainInterval = 0.8;
        } else if (scale >= 90) {
            mainInterval = 1;
        } else if (scale >= 70) {
            mainInterval = 2;
        } else if (scale >= 50) {
            mainInterval = 3;
        } else if (scale >= 30) {
            mainInterval = 5;
        } else if (scale >= 10) {
            mainInterval = 10;
        } else if (scale >= 5) {
            mainInterval = 20;
        }

        for (let sec = startSec, count = 0; sec <= endSec; sec = Number((sec + mainInterval).toFixed(2)), count++) {
            const x = sec * scale - scrollLeft + DEFAULT_LEFT_DIS;
            // 绘制刻度线
            ctx.beginPath();
            ctx.moveTo(x, 0);

            // 绘制时间文本
            if (count % 5 === 0 || sec !== 0 && mainInterval * scale > DEFAULT_SCALE) {
                ctx.lineTo(x, 15);
                if (sec === 0) {
                    ctx.fillText(formatTime(sec), x + 15, 35);
                } else {
                    ctx.fillText(formatTime(sec), x, 35);
                }

                if (mainInterval * scale > DEFAULT_SCALE) {
                    // 绘制刻度线
                    // ctx.beginPath();
                    for (let i = 1; i < 5; i ++) {
                        const subX = (sec + i * mainInterval / 5) * scale - scrollLeft + DEFAULT_LEFT_DIS;
                        ctx.moveTo(subX, 0);
                        ctx.lineTo(subX, 10);
                    }
                }
                
            } else {
                ctx.lineTo(x, 10);
            }
            ctx.strokeStyle = '#666';
            ctx.stroke();
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
                ctx.fillStyle = RULER_BG_COLOR;
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
        preScrollLeft.current = scrollLeft;
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
        const newScrollLeft = Math.max(0, Math.min(duration * scale * 10 - canvasRef.current!.width, scrollLeft - deltaX, duration * scale));
        
        setScrollLeft(newScrollLeft);
        // 更新拖拽起始位置，确保平滑拖动
        setDragStartX(e.clientX);
        preScrollLeft.current = newScrollLeft;
    };

    return (
      <canvas ref={canvasRef} 
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        style={{ 
            cursor: isTimelineDragging ? 'grabbing' : 'grab'
        }}
      />
    );
}

export default Ruler;

