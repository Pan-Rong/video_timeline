export class PreloadStrategy {
    private bufferSize = 20; // 预加载数量

    calculate(currentTime: number, direction: 'left' | 'right' | 'none' = 'none', step: number = 0.5): number[] {
        const times: number[] = [];
        
        switch (direction) {
            case 'right':
                // 向右拖动，预加载后面的
                for (let i = 1; i <= this.bufferSize; i++) {
                    times.push(currentTime + i * step);
                }
                break;
            case 'left':
                // 向左拖动，预加载前面的
                for (let i = 1; i <= this.bufferSize; i++) {
                    times.push(Math.max(0, currentTime - i * step));
                }
                break;
            default:
                // 静止状态，双向预加载
                const halfBuffer = Math.floor(this.bufferSize / 2);
                for (let i = -halfBuffer; i <= halfBuffer; i++) {
                    const time = currentTime + i * step;
                    if (time >= 0) times.push(time);
                }
        }
        
        // 去重
        return times.filter((time, index, arr) => arr.indexOf(time) === index);
    }
}