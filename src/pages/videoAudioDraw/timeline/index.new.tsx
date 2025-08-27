import React, { Fragment, useEffect, useRef, useState } from 'react';
import Ruler from './Ruler';
import styles from './index.new.less';
import { IClipItem, ITrack } from '../types';
import Tracks from './Tracks';
import { Button } from 'antd';
import { useRootStore } from '../models';
import { TRACK_HEIGHT, TrackType, SCALE_STEP, SCALE_MAX, SCALE_MIN, TEXT_DEFAULT_DURATION, MIN_SPLIT_INTERVAL } from '../models/constant';
import { useAudioStore } from '../models/audio';
import Playhead from './Playhead';

const Timeline: React.FC<{ audioFile: File; videoId: string; }> = ({ audioFile, videoId })  => { 
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [loaded, setLoaded] = useState<boolean>(false);
    const { 
        duration, 
        scale, 
        scrollLeft,
        tracks,
        isPlayheadDragging,
        selectedClipItem,
        setTracks,  
        setSelectedClipItem,
        setIsPlayheadDragging,
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
            clips: [{
                parentId: '_1_',
                id: 'video-clip-default',
                type: TrackType.VIDEO,
                startTime: 0,
                endTime: duration,
                trackIndex: 0,
                height: TRACK_HEIGHT[TrackType.VIDEO],
            }],
        }
    ]);
    const [audioTracks, setAudioTracks] = useState<ITrack[]>([]);
    const [addTextDisabled, setAddTextDisabled] = useState<boolean>(false);

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
                const channelData = buffer.getChannelData(0);
                const step = Math.floor(channelData.length / amplitudeArray.length);
                // 结合最大值和平均值的混合方法
                const windowSize = 8; // 窗口大小
                for (let i = 0; i < amplitudeArray.length; i++) {
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
                setWaveformData(amplitudeArray);
                // 创建静态波形数据的副本
                setStaticWaveformData(new Uint8Array(amplitudeArray));
                const audioTrackId = `audio-${Date.now()}`;
                const newAudioTrack: ITrack = {
                        id: audioTrackId,
                        startTime: 0,
                        endTime: buffer.duration,
                        color: '#9333ea', 
                        name: audioFile.name,
                        type: TrackType.AUDIO, 
                        trackIndex: 1,
                        height: TRACK_HEIGHT[TrackType.AUDIO],
                        clips: [{
                            parentId: audioTrackId,
                            id: 'audio-clip-default',
                            type: TrackType.AUDIO,
                            startTime: 0,
                            endTime: buffer.duration,
                            trackIndex: 1,
                            height: TRACK_HEIGHT[TrackType.AUDIO],
                        }],
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

        // 计算播放头位置（秒）
       // 公式：(鼠标相对时间线位置) / 缩放比例 + 滚动偏移
        const newPosition = relativeX / scale + scrollLeft / scale;

        // 确保播放头位置在有效范围内
        const clampedPosition = Math.max(0, Math.min(duration, newPosition));
        
        // 更新播放头位置
        // setPlayheadPosition(clampedPosition);
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

    useEffect(() => {
        const textClips = tracks.find((track) => track.type === TrackType.TEXT)?.clips;
        if (textClips?.length) {
            let canAdd = true;
            textClips.forEach((clip) => {
                if (
                    clip.startTime * scale <= scrollLeft && clip.endTime * scale > scrollLeft ||
                    clip.startTime * scale > scrollLeft && clip.startTime * scale < scrollLeft + TEXT_DEFAULT_DURATION * scale ||
                    duration * scale < scrollLeft + TEXT_DEFAULT_DURATION * scale
                ) {
                    canAdd = false;
                }
            })
            setAddTextDisabled(!canAdd);
        } else {
            setAddTextDisabled(false);
        }
    }, [tracks, scrollLeft, scale, duration])

    return (
        <div className={styles.timelineWrapper}>
            <div className={styles.tools}>
                <div>
                    <span>{`视频时长：${duration}秒`}</span>
                </div>
                <div className={styles.tool}>
                    <Button type='primary' 
                        disabled={addTextDisabled}
                        onClick={() => {
                            const textTrackIdx = tracks.findIndex((track) => track.type === TrackType.TEXT);
                            const defaultDuration = TEXT_DEFAULT_DURATION; // 默认1s；
                            if (textTrackIdx === -1) {
                                const startTime = scrollLeft / scale;
                                const textTrackId = `text-track-${Date.now()}`;
                                const newClip: IClipItem = {
                                    parentId: textTrackId,
                                    id: `text-${Date.now()}`,
                                    type: TrackType.TEXT,
                                    startTime,
                                    endTime: startTime + defaultDuration,
                                    trackIndex: tracks.length,
                                    content: '添加文字',
                                };
                                setTracks([...tracks, {
                                    id: textTrackId,
                                    type: TrackType.TEXT,
                                    height: TRACK_HEIGHT[TrackType.TEXT],
                                    name: '文字轨道',
                                    trackIndex: tracks.length,
                                    clips: [newClip],
                                    startTime: 0,
                                    endTime: duration,
                                }]);
                            } else {
                                const textTrackId = tracks[textTrackIdx].id;
                                const clipLen = tracks[textTrackIdx].clips.length;
                                const startTime = scrollLeft / scale;
                                const newClip: IClipItem = {
                                    parentId: textTrackId,
                                    id: `text-${Date.now()}_${clipLen}`,
                                    type: TrackType.TEXT,
                                    startTime,
                                    endTime: startTime + defaultDuration,
                                    trackIndex: tracks[textTrackIdx].trackIndex,
                                    content: `添加文字-${clipLen}`,
                                };

                                setTracks(tracks.map((track) => {
                                    if (track.id === textTrackId) {
                                        return {
                                            ...track,
                                            clips: [...(track.clips || []), newClip],
                                        }
                                    }
                                    return track;
                                }))
                            }
                        }} >添加文字</Button>
                    <Button type='primary' 
                        disabled={
                            !selectedClipItem || selectedClipItem.type !== TrackType.TEXT ||
                            !(selectedClipItem.originTime.startTime <= (scrollLeft / scale - MIN_SPLIT_INTERVAL) &&
                            selectedClipItem.originTime.endTime >= (scrollLeft / scale + MIN_SPLIT_INTERVAL))
                        }
                        onClick={() => {
                            // 处理分割
                            if (selectedClipItem && selectedClipItem.type === TrackType.TEXT) {
                                const textClips = tracks.find((track) => track.id === selectedClipItem.trackId)?.clips;
                                if (textClips?.length) {
                                    const clipIdx = textClips.findIndex((clip) => clip.id === selectedClipItem.clipId);
                                    if (clipIdx > -1) {
                                        const newClip = {
                                            ...textClips[clipIdx],
                                            id: `split_${Date.now()}`,
                                            startTime: scrollLeft / scale,
                                        }
                                        textClips[clipIdx] = {
                                            ...textClips[clipIdx],
                                            endTime: scrollLeft / scale,
                                        }
                                        textClips.splice(clipIdx, 0, newClip);
                                        setTracks(tracks.map((track) => {
                                            if (track.id === selectedClipItem.trackId) {
                                                return {
                                                    ...track,
                                                    clips: textClips,
                                                }
                                            }
                                            return track;
                                        }));
                                        // 更新选中的切片
                                        setSelectedClipItem({
                                            ...selectedClipItem,
                                            originTime: {
                                                startTime: textClips[clipIdx].startTime,
                                                endTime: textClips[clipIdx].endTime,
                                            }
                                        });
                                    }
                                }
                            }
                        }} >分割</Button>
                    <Button type='primary' 
                        disabled={!selectedClipItem}
                        onClick={() => {
                            if (selectedClipItem) {
                                setTracks(tracks.map((track) => {
                                    if (track.id === selectedClipItem.trackId) {
                                        return {
                                            ...track,
                                            clips: track.clips.filter((clip) => clip.id !== selectedClipItem.clipId),
                                        }
                                    }
                                    return track;
                                }));
                                setSelectedClipItem(null);
                            }
                        }} >删除</Button>
                    <Button type='primary' 
                        onClick={() => {
                            setScale(Math.min(SCALE_MAX, scale + SCALE_STEP));
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
                                <Tracks videoId={videoId} />
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

