export enum TrackType {
    VIDEO = 'video',
    AUDIO = 'audio',
    TEXT = 'text',
    IMAGE = 'image',
}

// 常量
export const TRACK_HEIGHT = {
    [TrackType.VIDEO]: 60,
    [TrackType.AUDIO]: 60,
    [TrackType.TEXT]: 60,
    [TrackType.IMAGE]: 60
}
export const TRACK_SPACING = 10;
export const RULER_HEIGHT = 50;
export const SCALE_STEP = 5;
export const SCALE_MAX = 200;
export const SCALE_MIN = 10;
