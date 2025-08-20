import { useEffect, useRef, useState } from 'react';
import { Link } from 'umi';
import { IModel } from '@/types/editor';
import { Upload, Button, Form, InputNumber, message, Select, ColorPicker, Checkbox } from 'antd';
import styles from './index.less'
import VideoTimeline from '@/components/VideoTimeline';


const EditorContainer = () => {

    const [curMaterial, setCurMaterial] = useState<IModel>({});
    const [thumbnails, setThumbnails] = useState<string[]>([]);


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
                    customRequest={({ file }: any) => {
                        setCurMaterial({
                            ...curMaterial
                        });

                        const videoEle = document.getElementById('custom_video') as HTMLVideoElement;
                        videoEle.src = URL.createObjectURL(file);
                        const bgVideoEle = document.getElementById('custom_video_bg') as HTMLVideoElement;
                        bgVideoEle.src = URL.createObjectURL(file);

                        bgVideoEle.addEventListener('loadeddata', () => {
                            bgVideoEle.currentTime = 0; // 假设视频的第一秒
                            bgVideoEle.onseeked = () => {
                                setCurMaterial({
                                    ...curMaterial,
                                    id: Math.random().toString(36).substring(2),
                                    type: 'video',
                                    src: bgVideoEle.src,
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

export default EditorContainer