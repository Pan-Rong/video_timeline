
import { useEffect, useRef, useState } from 'react';
import { Upload, Button, Form, InputNumber, message, Select, ColorPicker, Checkbox } from 'antd';
import styles from './index.less'
import { extractAudioFromVideo } from '@/utils/ffmpeg';
import VideoView from './videoview';
import VideoTimeline from './timeline/index.new';
import { IVideo } from './types';
import { TrackType } from './models/constant';
import { useRootStore } from './models';


const VideoAudioDraw = () => {

    const [curMaterial, setCurMaterial] = useState<IVideo | null>(null);
    const { setDuration } = useRootStore();

    return (
        <div className={styles.warpper}>
            <div className={"commonTool"}>
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
                        setCurMaterial(null);
                        const videoEle = document.getElementById('custom_video') as HTMLVideoElement;
                        videoEle.src = URL.createObjectURL(file);
                        const bgVideoEle = document.getElementById('custom_video_bg') as HTMLVideoElement;
                        bgVideoEle.src = URL.createObjectURL(file);

                        bgVideoEle.addEventListener('loadeddata', async () => {
                            // 从视频中提取音频
                            const audioBlob = await extractAudioFromVideo(file,bgVideoEle);
                            // 创建音频文件对象
                            const audioFile = new File([audioBlob], `${file.name.split('.')[0]}.wav`, { type: 'audio/wav' });
                            setCurMaterial({
                                ...curMaterial,
                                id: Math.random().toString(36).substring(2),
                                type: TrackType.VIDEO,
                                src: bgVideoEle.src,
                                audioFile,
                                duration: bgVideoEle.duration,
                                width: bgVideoEle.videoWidth,
                                height: bgVideoEle.videoHeight,
                            })
                            setDuration(bgVideoEle.duration);                            
                        })
                        videoEle.addEventListener('error', () => {
                            message.error('视频加载失败');
                        })
                    }}>
                    <Button>上传视频</Button>
                </Upload> 
            </div>
            <div className={styles.rightContainer}>
                <video id="custom_video_bg" style={{ display: 'none' }} />
                <VideoView curMaterial={curMaterial}></VideoView>
                <div>
                    {
                        curMaterial?.duration && curMaterial.audioFile ? 
                        <VideoTimeline 
                            videoId={curMaterial.id}
                            audioFile={curMaterial.audioFile} /> : null
                    }
                </div>
            </div>
        </div>
    )
}

export default VideoAudioDraw;

