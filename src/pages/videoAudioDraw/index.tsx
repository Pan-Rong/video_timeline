
import { useEffect, useRef, useState } from 'react';
import { Upload, Button, Form, InputNumber, message, Select, ColorPicker, Checkbox } from 'antd';
import styles from './index.less'
import { extractAudioFromVideo } from '@/utils/ffmpeg';
import VideoView from './videoview';
import VideoTimeline from './timeline/index.new';
import { IVideo, IRulerScaleKey } from './types';
import { THUMBNAIL_WIDTH, TRACK_HEIGHT, TrackType, RULER_SCALE_DATA } from './models/constant';
import { useRootStore } from './models';
import { FastThumbnailExtractor } from './utils/thumbnailExtractor';
// import { extractThumbnails } from './utils/thumbnail_ffmpeg';


const testData = {
    startTimeSec: 1, 
    endTimeSec: 20, 
    intervalSec: 1, 
    width: THUMBNAIL_WIDTH * 2, 
    height: TRACK_HEIGHT[TrackType.VIDEO] * 2
}

const VideoAudioDraw = () => {
    const [curMaterial, setCurMaterial] = useState<IVideo | null>(null);
    const { setDuration, setVideoFile, videoFile, scale } = useRootStore();

    // useEffect(() => {
    //     const canvasEle = document.getElementById("custom_canvas_demo") as HTMLCanvasElement;
    //     if (videoFile &&canvasEle) {
    //         const startTime = Date.now();

    //         // const canvas = canvasEle.transferControlToOffscreen();
    //         const worker = new Worker("/workers/video/worker.js");
    //         worker.addEventListener("message", (evt) => {
    //             const msg = evt.data;
    //             if (!msg) return;
    //             if (msg.type === 'thumb') {
    //                 console.log('---111111----');
    //                 const { time, blob } = msg;
    //                 // const url = URL.createObjectURL(blob);
    //                 // const img = document.createElement('img');
    //                 // img.src = url;
    //                 // img.style.width = '80px';
    //                 // img.style.margin = '4px';
    //                 // document.body.appendChild(img);
    //             } else if (msg.type === 'thumbs_done') {
    //                 console.log('Thumbnails extraction done-------',Date.now() - startTime, msg.thumbsList);
    //             } else if (msg.type === 'thumbs_error') {
    //                 console.error('Thumbnails extraction error', msg.message);
    //             } else {
    //                 console.log('worker status:', msg);
    //             }
    //         });
    //         const objectUrl = URL.createObjectURL(videoFile);
    //         // Start normal rendering if needed
    //         // worker.postMessage({ type: 'START_RENDER', dataUri: objectUrl, rendererName: '2d', canvas }, [canvas]);
    //         // Request thumbnails in a range (example: 0s to 10s every 1s)
    //         worker.postMessage({ 
    //             type: 'EXTRACT_THUMBS_RANGE', 
    //             dataUri: objectUrl, 
    //             startTimeSec: testData.startTimeSec, 
    //             endTimeSec: testData.endTimeSec, 
    //             intervalSec: testData.intervalSec, 
    //             width: testData.width, 
    //             height: testData.height
    //         });
    //     }
    // }, [videoFile]);

    // useEffect(() => {
    //     if (videoFile) {
    //         const extractor = new FastThumbnailExtractor(3, testData.width, testData.height);
    //         const tasks = [];
    //         const timestamps = [];
    //         const startTime = Date.now();
    //         const intervalSec = RULER_SCALE_DATA[`${scale}` as IRulerScaleKey].thumbTimeStep;
    //         for (let time = testData.startTimeSec, index = 0; time <= testData.endTimeSec; time += intervalSec, index++) {
    //             tasks.push({ time, index });
    //             timestamps.push(time);
    //         }
    //         extractor.extractThumbnails({ videoFile, tasks }).then(res => {
    //             console.log('----res-FastThumbnailExtractor---', Date.now() - startTime, res);
    //         });
    //     }
    // }, [videoFile, scale]);

    // useEffect(() => {
    //     if (videoFile) {
    //         const startTime = Date.now();
    //         // const worker = new Worker('/workers/worker.ffmpeg.thumbnail.js');
    //         // worker.onmessage = (event) => {
    //         //     const { type, id, result, error, progress } = event.data;
    //         //     switch (type) {
    //         //       case 'SUCCESS':
    //         //           // 处理成功结果
    //         //           console.log('成功提取缩略图:', result);
    //         //           console.log('-endtime--worker--ffmpeg--', Date.now() - startTime);
    //         //           break;
    //         //       case 'ERROR':
    //         //           // 处理错误结果
    //         //           console.error('提取缩略图出错:', error);
    //         //           break;
    //         //       case 'PROGRESS':
    //         //           // 处理进度更新
    //         //           console.log('提取进度:', progress);
    //         //           break;
    //         //     }
    //         //   };
    //         //   worker.onerror = (error) => {
    //         //     console.error('Worker error:', error);
    //         //     // 清理所有挂起消息
    //         //     worker.terminate();
    //         //   };
          
         
    //         // const tasks = [];
    //         // for (let time = testData.startTimeSec; time <= testData.endTimeSec; time += testData.intervalSec) {
    //         //     tasks.push(time);
    //         // }
          
    //         // worker.postMessage({
    //         //     type: 'EXTRACT_THUMBNAILS',
    //         //     payload: {
    //         //       videoFile,
    //         //       timestamps: tasks,
    //         //       options: {
    //         //         width: testData.width,
    //         //         height: testData.height,
    //         //         format: 'jpeg',
    //         //       },
    //         //     },
    //         //     id: 'extract-thumbnails',
    //         // });

    //         const handleData = async () => {
    //             const tasks = [];
    //             for (let time = testData.startTimeSec; time <= testData.endTimeSec; time += testData.intervalSec) {
    //                 tasks.push(time);
    //             }

    //             const results = await extractThumbnails({
    //                 videoFile,
    //                 timestamps: tasks,
    //                 startTime: testData.startTimeSec,
    //                 endTime: testData.endTimeSec,
    //                 numThumbs: tasks.length,
    //                 options: {
    //                     width: testData.width,
    //                     height: testData.height,
    //                     format: 'jpeg',
    //                 },
    //             })
    //             console.log('---ffmpeg---end-----', Date.now() - startTime, results);
    //         }

    //         handleData();
    //     }
    // }, [videoFile]);

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
                        setVideoFile(file);
                        const videoEle = document.getElementById('custom_video') as HTMLVideoElement;
                        videoEle.src = URL.createObjectURL(file);
                        const bgVideoEle = document.getElementById('custom_video_bg') as HTMLVideoElement;
                        bgVideoEle.src = URL.createObjectURL(file);
                        bgVideoEle.muted = true;

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
                                videoFile: file,
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
                <canvas id="custom_canvas_demo" style={{ display: 'none' }} width={256} height={300} />
            </div>
        </div>
    )
}

export default VideoAudioDraw;

