import React, { Fragment, useEffect, useRef, useState } from 'react';
import Ruler from './Ruler';
import styles from './index.new.less';
import { ITrack } from '../types';
import Tracks from './Tracks';
import { Button } from 'antd';
import { useRootStore } from '../models';
import { TRACK_HEIGHT, TrackType, SCALE_STEP, SCALE_MAX, SCALE_MIN } from '../models/constant';
import { useAudioStore } from '../models/audio';
import Playhead from './Playhead';



const Timeline: React.FC<{ audioFile: File; }> = ({ audioFile })  => { 
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [loaded, setLoaded] = useState<boolean>(false);
    const { 
        duration, 
        scale, 
        scrollLeft,
        tracks,
        isPlayheadDragging,

        setTracks,  
        setPlayheadPosition,
        setIsPlayheadDragging,
        setScrollLeft,
        setScale,
        setIsTimelineDragging
    } = useRootStore();

    const [videoTracks, setVideoTracks] = useState<ITrack[]>([
        {
            id: '_1_',
            height: TRACK_HEIGHT[TrackType.VIDEO],
            name: '视频轨道',
            icon: '',
            type: TrackType.VIDEO,
            trackIndex: 0,
            startTime: 0,
            endTime: duration,
        }
    ]);
    const [audioTracks, setAudioTracks] = useState<ITrack[]>([]);

    const { 
        audioContext,
        setAudioContext,
        setAudioBuffer, 
        setWaveformData, // 存储波形数据
        setStaticWaveformData   // 存储静态波形数据
    } = useAudioStore();

    useEffect(() => {
        setTracks([...videoTracks, ...audioTracks]);
    }, [videoTracks, audioTracks])


    // 处理音频文件
    const handleAudioFile = () => {
        if (!audioFile) return;

        // 创建AudioContext
        if (!audioContext) {
            setAudioContext(new AudioContext());
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!e.target?.result) return;
            // 确保音频上下文处于运行状态
            const context = audioContext || new AudioContext();
            setAudioContext(context);
            
            // 处理浏览器自动播放策略
            if (context.state === 'suspended') {
                context.resume().catch(e => console.error('无法恢复音频上下文:', e));
            }

            context.decodeAudioData(e.target?.result as ArrayBuffer)
            .then((buffer) => {
                // 设置分析器节点来获取波形数据
                const analyserNode = new AnalyserNode(context, {
                    fftSize: 2048,
                    smoothingTimeConstant: 0.8,
                });
                setAudioBuffer(buffer);
                
                // 创建临时的源节点来获取完整波形数据（不实际播放）
                const tempSourceNode = new AudioBufferSourceNode(context, {
                    buffer: buffer,
                });
                
                tempSourceNode.connect(analyserNode);
                // 获取波形数据
                const amplitudeArray = new Uint8Array(analyserNode.frequencyBinCount);
                setWaveformData(amplitudeArray);
                // 创建静态波形数据的副本
                setStaticWaveformData(new Uint8Array(amplitudeArray));
              
                const newAudioTrack: ITrack = {
                        id: `audio-${Date.now()}`,
                        startTime: 0,
                        endTime: buffer.duration,
                        color: '#9333ea', 
                        name: audioFile.name,
                        type: TrackType.AUDIO, 
                        trackIndex: 1,
                        height: TRACK_HEIGHT[TrackType.AUDIO],
                    };
                    
                 setAudioTracks([newAudioTrack]);
            })
            .catch((error) => {
                console.error('音频解码错误:', error);
            });
        };
        
        reader.readAsArrayBuffer(audioFile);
    }

    useEffect(() => {
        handleAudioFile();
    }, [audioFile])

    useEffect(() => {
        if (containerRef.current) {
            setLoaded(true);
        }
    }, [containerRef.current])

    // 指针处理拖拽移动
    const handleDragMove = (e: React.MouseEvent) => {
        if (!isPlayheadDragging || !containerRef.current) {
            return;
        }

        // 计算鼠标相对于容器的位置，并考虑滚动偏移
        const rect = containerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;


        // 计算新的播放头位置（秒）
       // 公式：(鼠标相对时间线位置) / 缩放比例
        const newPosition = relativeX / scale;

        // 确保播放头位置在有效范围内
        const clampedPosition = Math.max(0, Math.min(duration, newPosition));
        
        // 更新播放头位置
        setPlayheadPosition(clampedPosition);
    };


    // 处理拖拽结束
    const handleDragEnd = () => {
        setIsPlayheadDragging(false);
        setIsTimelineDragging(false);
    };

    useEffect(() => {
        window.addEventListener('mouseup', handleDragEnd);
        return () => {
            window.removeEventListener('mouseup', handleDragEnd);
        }
    }, [])

    return (
        <div className={styles.timelineWrapper}>
            <div className={styles.tools}>
                <div>
                    <span>{`视频时长：${duration}秒`}</span>
                </div>
                <div className={styles.tool}>
                    <Button type='primary' 
                        onClick={() => {
                            setScale(Math.min(SCALE_MAX, scale + SCALE_STEP));
                            // setScrollLeft();
                        }} >放大</Button>
                    <Button type='primary'
                        onClick={() => {
                            setScale(Math.max(SCALE_MIN, scale - SCALE_STEP));
                        }} >缩小</Button>
                </div>

            </div>
            <div className={styles.timelineContainer}>
                <div className={styles.leftContent}>
                    {
                        tracks.map((track) => (
                            <div key={track.id} className={styles.trackHeader} style={{ height: track.height }}>
                                <div className={styles.trackIcon}>{track.icon}</div>
                                <div className={styles.trackName}>{track.name}</div>
                            </div>
                        ))
                    }
                </div>
                <div className={styles.rightContent} 
                    onMouseMove={handleDragMove}
                    ref={(el) => {
                        containerRef.current = el;
                    }}>
                    {
                        loaded ? (
                            <Fragment>
                                <Ruler />
                                <Tracks/>
                                <Playhead />
                            </Fragment>
                        ) : null
                    }
                </div>
            </div>
        </div>
    )
}

export default Timeline;

