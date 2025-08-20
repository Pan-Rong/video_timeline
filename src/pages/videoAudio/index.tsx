import { useEffect, useRef, useState } from 'react';
import { Link } from 'umi';
import { IModel } from '@/types/editor';
import { Upload, Button, Form, InputNumber, message, Select, ColorPicker, Checkbox } from 'antd';
import styles from './index.less'
import VideoTimeline from '@/components/VideoTimeline';
import { encodeWAV } from '@/utils/tools';
import { extractAudioWithFFmpeg, isWebAssemblySupported  } from './ffmpegUtils';


const VideoAudioContainer = () => {

    const [curMaterial, setCurMaterial] = useState<IModel>({});
    // 从视频文件中提取音频 - 集成FFmpeg优化
    const extractAudioFromVideo = async (videoFile: File, videoElement?: HTMLVideoElement): Promise<Blob> => {
        // 优先使用FFmpeg方法（如果浏览器支持）
        if (isWebAssemblySupported()) {
            try {
                console.log('使用FFmpeg提取音频...');
                return await extractAudioWithFFmpeg(videoFile);
            } catch (ffmpegError) {
                console.error('FFmpeg提取失败，回退到Web Audio API方法:', ffmpegError);
                // 如果FFmpeg方法失败，回退到Web Audio API方法
                if (videoElement) {
                    return extractAudioWithWebAudio(videoElement);
                }
                throw ffmpegError;
            }
        } else {
            console.log('浏览器不支持WebAssembly，使用Web Audio API方法...');
            if (videoElement) {
                return extractAudioWithWebAudio(videoElement);
            }
            throw new Error('无法提取音频，不支持WebAssembly且没有有效的视频元素');
        }
    };

    // 原始的Web Audio API方法（作为备选）
    const extractAudioWithWebAudio = (videoElement: HTMLVideoElement): Promise<Blob> => {
        // 这里可以保留您之前优化的Web Audio API实现
        return new Promise((resolve, reject) => {
            try {
                // 创建音频上下文以获取音频数据
                const audioContext = new AudioContext();
                const sourceNode = audioContext.createMediaElementSource(videoElement);
                
                // 创建ScriptProcessorNode
                const BUFFER_SIZE = 8192;
                const numberOfChannels = 1;
                const audioData: Float32Array[] = [];
                const scriptProcessorNode = audioContext.createScriptProcessor(BUFFER_SIZE, numberOfChannels, numberOfChannels);
                
                // 处理音频数据
                scriptProcessorNode.onaudioprocess = (event) => {
                    const inputData = event.inputBuffer.getChannelData(0);
                    audioData.push(new Float32Array(inputData));
                };
                
                // 连接节点
                sourceNode.connect(scriptProcessorNode);
                scriptProcessorNode.connect(audioContext.destination);
                
                // 设置最高播放速度加速处理
                videoElement.playbackRate = 16;
                
                // 开始播放视频
                videoElement.play().catch(err => {
                    console.error('无法播放视频:', err);
                    cleanupAndReject(err);
                });
                
                // 设置定时器停止捕获
                const stopTimeout = setTimeout(() => {
                    stopCapture();
                }, Math.min(30000, videoElement.duration * 1000 / 16));
                
                // 监听视频结束事件
                videoElement.onended = () => {
                    clearTimeout(stopTimeout);
                    stopCapture();
                };
                
                // 停止捕获并处理数据的函数
                function stopCapture() {
                    try {
                        videoElement.pause();
                        sourceNode.disconnect();
                        scriptProcessorNode.disconnect();
                        
                        // 合并所有音频数据
                        const totalLength = audioData.reduce((acc, curr) => acc + curr.length, 0);
                        const mergedData = new Float32Array(totalLength);
                        let offset = 0;
                        
                        audioData.forEach(data => {
                            mergedData.set(data, offset);
                            offset += data.length;
                        });
                        
                        // 使用encodeWAV函数将数据转换为WAV格式
                        const audioBlob = encodeWAV(mergedData, audioContext.sampleRate);
                        
                        // 清理资源
                        audioContext.close();
                        
                        resolve(audioBlob);
                    } catch (error) {
                        cleanupAndReject(error);
                    }
                }
                
                // 清理资源并拒绝Promise的函数
                function cleanupAndReject(error?: any) {
                    try {
                        videoElement.pause();
                        sourceNode.disconnect();
                        if (scriptProcessorNode) scriptProcessorNode.disconnect();
                        audioContext.close();
                    } catch (cleanupError) {
                        console.error('清理资源时出错:', cleanupError);
                    }
                    reject(error);
                }
            } catch (error) {
                console.error('Web Audio API方法失败:', error);
                reject(error);
            }
        });
    };


    return (
        <div className={styles.warpper}>
            <div className={'commonTool'}>

                <Upload
                    accept='video/*'
                    beforeUpload={(file: any) => {

                        // 判断非视频文件不让上传
                        if (!file.type.includes('video')) {
                            message.error('请上传视频文件');
                            return false;
                        }
                        return true;
                    }}
                    showUploadList={false}
                    customRequest={async ({ file }: any) => {
                        setCurMaterial({
                            ...curMaterial
                        });

                        const videoEle = document.getElementById('custom_video') as HTMLVideoElement;
                        videoEle.src = URL.createObjectURL(file);
                        const bgVideoEle = document.getElementById('custom_video_bg') as HTMLVideoElement;
                        bgVideoEle.src = URL.createObjectURL(file);

                        bgVideoEle.addEventListener('loadeddata', async () => {

                            const startTime = performance.now();

                        // // 从视频中提取音频
                        const audioBlob = await extractAudioFromVideo(file,bgVideoEle);
                            console.log('----1111111---', performance.now() - startTime)

                        // 创建音频文件对象
                        const audioFile = new File([audioBlob], `${file.name.split('.')[0]}.wav`, { type: 'audio/wav' });

                        // // 直接使用FFmpeg从文件对象提取音频，不再需要等待视频元素加载
                        // const audioBlob = await extractAudioWithFFmpeg(file);
                        
                        // // 创建音频文件对象
                        // const audioFile = new File([audioBlob], `${file.name.split('.')[0]}.wav`, { type: 'audio/wav' });
                        

                            bgVideoEle.currentTime = 0; // 假设视频的第一秒
                            bgVideoEle.onseeked = () => {
                                setCurMaterial({
                                    ...curMaterial,
                                    id: Math.random().toString(36).substring(2),
                                    type: 'video',
                                    src: bgVideoEle.src,
                                    audioFile,

                                    duration: bgVideoEle.duration,
                                    width: bgVideoEle.videoWidth,
                                    height: bgVideoEle.videoHeight,
                                })
                            };                            
                        })
                        videoEle.addEventListener('error', () => {
                            message.error('视频加载失败');
                        })
                    }}>
                    <Button>上传视频</Button>
                </Upload>

                <Upload
                    accept='audio/*'
                    beforeUpload={(file: any) => {
                        // 判断非音频文件不让上传
                        if (!file.type.includes('audio')) {
                            message.error('请上传音频文件');
                            return false;
                        }
                        return true;
                    }}
                    showUploadList={false}
                    customRequest={({ file }: any) => {
                        setCurMaterial({
                            ...curMaterial,
                            audioFile: file
                        });
                    }}>
                    <Button>上传音频</Button>
                </Upload>
            </div>
            <VideoContent 
                curMaterial={curMaterial}
            />
        </div>
    );
};

const VideoContent = ({
    curMaterial,
}: {
    curMaterial: IModel | null;
}) => {
    const videoInfo = useRef({ 
        realWidth: 1080, 
        realHeight: 1920,
        eleWidth: 0, 
        eleHeight: 0,
        maxMoveY: 0,
        minMoveY: 0,
        containerHeight: 0,
    });

    useEffect(() => {

        if (curMaterial?.id) {
            const container = document.getElementById('custom_video_container');
            const videoCoverEle = document.getElementById('custom_video');
            if (videoCoverEle && container) {
                const containerRect = container.getBoundingClientRect();
                let eleWidth = 0, eleHeight = 0;
                const tempData = curMaterial;
                const materialHeight = tempData.height;
                const materialWidth = tempData.width;

                const landscape = materialWidth > materialHeight;

                if (landscape) {
                    // 横屏转竖屏
                    eleWidth = Math.ceil(containerRect.height * videoInfo.current.realWidth / videoInfo.current.realHeight);
                    eleHeight = Math.ceil(eleWidth * videoInfo.current.realWidth / videoInfo.current.realHeight);

                    videoCoverEle.style.width = `${eleWidth}px`;
                    videoCoverEle.style.height = 'auto';
                    videoCoverEle.style.backgroundColor = '#000000';
                } else {
                    // 竖屏
                    eleHeight = containerRect.height;
                    eleWidth = Math.ceil(eleHeight * videoInfo.current.realWidth / videoInfo.current.realHeight);

                    videoCoverEle.style.width = `auto`;
                    videoCoverEle.style.height = `${eleHeight}px`;
                    videoCoverEle.style.backgroundColor = 'transparent';
                }
                videoInfo.current = {
                    ...videoInfo.current,
                    eleWidth,
                    eleHeight,
                    maxMoveY: containerRect.height - Math.floor((containerRect.height - eleHeight) / 2),
                    minMoveY: Math.ceil((containerRect.height - eleHeight) / 2),
                    containerHeight: containerRect.height
                }
            }
        } else {
            const videoCoverEle = document.getElementById('custom_video');
            if (videoCoverEle) {
                videoCoverEle.style.backgroundColor = 'transparent';
            }
        }
    }, [curMaterial?.id])
    return (
        <div className={styles.rightContainer}>
            <div className={styles.rightVideo}>
                <div id='custom_video_container'>
                    <video id="custom_video" controls />
                </div>
                <video id="custom_video_bg" style={{ display: 'none' }} />
                {/* <div className={styles.rightVideoCover}>
                    {curMaterial?.cover ? <img src={curMaterial.cover} alt="" /> : null}
                </div> */}
            </div>
            <div>
                {
                    curMaterial?.duration && curMaterial.audioFile ? <VideoTimeline 
                        audioFile={curMaterial.audioFile}
                        duration={curMaterial.duration} /> : null
                }
            </div>
        </div>
    )
}

export default VideoAudioContainer
