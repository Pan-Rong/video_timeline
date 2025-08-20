class WaveformProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      // 可以在这里处理从主线程发送的消息
    };
  }

  process(inputs, outputs, parameters) {
    // 获取输入缓冲区
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      
      // 为了避免过多的消息传递，我们对数据进行降采样
      const sampleRate = 10; // 每秒发送10次数据
      const blockSize = Math.floor(channelData.length / sampleRate);
      
      if (blockSize > 0) {
        // 创建降采样后的数组
        const downsampledData = new Float32Array(sampleRate);
        
        for (let i = 0; i < sampleRate; i++) {
          let sum = 0;
          const startIndex = i * blockSize;
          
          // 计算块的平均值
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[startIndex + j]);
          }
          
          downsampledData[i] = sum / blockSize;
        }
        
        // 向主线程发送降采样后的波形数据
        this.port.postMessage(downsampledData);
      }
    }
    
    // 返回true表示继续处理
    return true;
  }
}

// 注册处理器
registerProcessor('waveform-processor', WaveformProcessor);