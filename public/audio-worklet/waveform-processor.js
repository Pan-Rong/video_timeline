onmessage = (event) => {
  // 可以在这里处理从主线程发送的消息
  const { channelData, bufferLength, step, windowSize } = event.data;
  
  const amplitudeArray = new Uint8Array(bufferLength);
  
  // 音频数据处理逻辑
  for (let i = 0; i < bufferLength; i++) {
      let sum = 0;
      let max = 0;
      let count = 0;
      
      for (let j = 0; j < windowSize; j++) {
          const index = i * step + Math.floor(j * step / windowSize);
          if (index < channelData.length) {
              const absValue = Math.abs(channelData[index]);
              sum += absValue;
              if (absValue > max) {
                  max = absValue;
              }
              count++;
          }
      }
      const avgValue = sum / count;
      // 使用70%的最大值和30%的平均值混合
      const mixedValue = max * 0.7 + avgValue * 0.3;
      
      // 映射到 [0, 255]
      amplitudeArray[i] = Math.floor((mixedValue + 1) * 128);
  }
  // 发送处理结果回主线程
  postMessage(amplitudeArray, [amplitudeArray.buffer]);
};
