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
// 手柄宽度
export const HANDLE_WIDTH = 12;

export const THUMBNAIL_WIDTH = 60;

export const MIN_CLIP_WIDTH = 30;

export const DEFAULT_SCALE = 100;

export const DEFAULT_LEFT_DIS = 200;

export const RULER_BG_COLOR = 'rgba(197, 206, 243, 0.2)';

export const RULER_TEXT_COLOR = 'rgba(130, 151, 245, 1)';

export const TRACK_BG_COLOR = 'rgba(197, 206, 243, 0.2)';

export const TRACK_DURATION_BG_COLOR = 'rgba(130, 151, 245, 0.2)';

export const CANVAS_BG_COLOR = "rgba(207, 216, 255, 0.20)";

export const TRACK_DURATION_BG_RADIUS = 6;
