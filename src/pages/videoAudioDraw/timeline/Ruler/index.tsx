import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../../utils/format';
import { useRootStore } from '../../models';
import { RULER_HEIGHT } from '../../models/constant';

const Ruler = () => { 
    const { scale, scrollLeft } = useRootStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);

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

    return (
      <canvas ref={canvasRef} />
    );
}

export default Ruler;

