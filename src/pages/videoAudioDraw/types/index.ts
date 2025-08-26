import { ReactNode } from 'react';
import { IFont, IShadow } from './text';
import { TrackType } from '../models/constant';

export interface IOption {
    label: string;
    value: string | number;
    [key: string]: any;
}

export interface IModel {
    [key: string]: any;
}


export interface IAudio extends IModel {
    id: string;
    type: TrackType.AUDIO;
    src: string;
    duration: number;
}

export interface IVideo extends IModel  {
    id: string;
    type: TrackType.VIDEO;
    src: string;
    audioFile: File;
    height: number;
    width: number;
    duration: number;
}

export interface IText extends IModel {
    id: string;
    type: TrackType.TEXT;
    text: string;
    start: number;
    end: number;
    font: IFont;
}

export interface IImage extends IModel {
    id: string;
    type: TrackType.IMAGE;
    src: string;
    start: number;
    end: number;
}

export interface IVideoThumbnail extends IModel {
    id: string;
    startTime: number;
    endTime: number;
    thumbnail: string; // 添加缩略图属性
}

export interface ISelectedClip {
    clipId: string,
    trackId: string,
    originTime: {
        startTime: number,
        endTime: number
    }
}

export interface IClipItem extends IModel {
    parentId: string;
    id: string;
    type: ITrackType;
    startTime: number;
    endTime: number;
    trackIndex: number;
    isDragging?: boolean;
    isActive?: boolean;
    content?: string;
    resizeHandle?: 'left' | 'right' | '';
}

export interface ITrack {
    id: string;
    color?: string;
    height: number;
    name: string;
    icon?: ReactNode | string;   
    trackIndex: number; // 添加轨道索引
    isDragging?: boolean;
    type: ITrackType;
    audioData?: Uint8Array;
    audioBuffer?: AudioBuffer;
    startTime: number;
    endTime: number;
    clips: IClipItem[];
}

type ITrackType = TrackType;

export {
    IFont,
    IShadow
}