import { IModel } from '@/types/editor';
import { useEffect, useRef } from 'react';
import styles from './index.less';

const VideoView = ({
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
         <div className={styles.rightVideo}>
            <div id='custom_video_container'>
                <video id="custom_video" controls />
            </div>
        </div>
    )
}

export default VideoView;
