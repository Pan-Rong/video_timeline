import { IVideo } from '../types';
import { useEffect, useRef, useState } from 'react';
import styles from './index.less';
import { useRootStore } from '../models';

const VideoView = ({
    curMaterial,
}: {
    curMaterial: IVideo | null;
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

    const { 
        scrollLeft,
        scale,
        isPlayheadDragging,
        isClippingOrDragging,
        isTimelineDragging,
        videoIsPlaying,
        setVideoIsPlaying,
        setScrollLeft
    } = useRootStore();

    const [videoTime, setVideoTime] = useState(0);

    useEffect(() => {
        const videoCoverEle: any = document.getElementById('custom_video');
        if (videoCoverEle) {
            if (curMaterial?.id) {
                const container = document.getElementById('custom_video_container');
                if (container) {
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
                videoCoverEle.style.backgroundColor = 'transparent';
            }

            const handleVideoTimeupdate = () => {
                const videoCoverEle: any = document.getElementById('custom_video');
                if (videoCoverEle) {
                    console.log('视频播放进度', videoCoverEle.currentTime);
                    setVideoTime(videoCoverEle.currentTime || 0);
                }
            }
            // 监听视频播放进度
            videoCoverEle.addEventListener('timeupdate', handleVideoTimeupdate);
            // 监听视频播放状态
            videoCoverEle.addEventListener('play', () => {
                setVideoIsPlaying(true);
            })
            videoCoverEle.addEventListener('pause', () => {
                setVideoIsPlaying(false);
            })
            videoCoverEle.addEventListener('ended', () => {
                setVideoIsPlaying(false);
            })
            
            return () => {
               videoCoverEle.removeEventListener('timeupdate', handleVideoTimeupdate);
            }
        }
    }, [curMaterial?.id])

    useEffect(() => {
        if (videoIsPlaying) {
            setScrollLeft(videoTime * scale);
        }
    }, [videoTime, videoIsPlaying])

    // 修改前面添加的useEffect
    useEffect(() => {
        const videoElement = document.getElementById('custom_video') as HTMLVideoElement;
        if (videoElement && !videoIsPlaying) {
            // 总是更新视频时间，无论播放状态如何
            requestAnimationFrame(() => {
                videoElement.currentTime = Math.max(
                    scrollLeft / scale,
                    0,
                );
            })
        }
    }, [videoIsPlaying, scrollLeft, scale]);

    useEffect(() => {
        const videoElement = document.getElementById('custom_video') as HTMLVideoElement;
        if (videoElement) {
            videoElement.pause();
        }
    }, [isClippingOrDragging, isTimelineDragging, isPlayheadDragging, scale])

    return (
         <div className={styles.rightVideo}>
            <div id='custom_video_container'>
                <video id="custom_video" controls />
            </div>
        </div>
    )
}

export default VideoView;
