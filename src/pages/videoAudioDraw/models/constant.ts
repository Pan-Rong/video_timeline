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

// 卡尺相关数据
export const RULER_HEIGHT = 50;  // 单位px
export const DEFAULT_SCALE = 100;  // 单位px
export const RULER_BG_COLOR = 'rgba(197, 206, 243, 0.2)';
export const RULER_TEXT_COLOR = 'rgba(130, 151, 245, 1)';

// 手柄宽度
export const HANDLE_WIDTH = 12;  // 单位px

// 缩略图宽度
export const THUMBNAIL_WIDTH = 60;  // 单位px

// 最小剪辑宽度
export const MIN_CLIP_WIDTH = 30;  // 单位px

// 播放指针默认距离左边的距离
export const DEFAULT_LEFT_DIS = 200;  // 单位px

// 轨道相关常量
export const TRACK_SPACING = 10;  // 单位px

export const TRACK_BG_COLOR = 'rgba(197, 206, 243, 0.2)';

export const TRACK_DURATION_BG_COLOR = 'rgba(130, 151, 245, 0.2)';

export const CANVAS_BG_COLOR = "rgba(207, 216, 255, 0.20)";

export const TRACK_DURATION_BG_RADIUS = 6; // 单位px

export const TEXT_DEFAULT_DURATION = 1; // 单位 s

// 可分割的最小时间间隔
export const MIN_SPLIT_INTERVAL = 0.1;  // 单位s

// 缩略图的冗余数量
export const THUMBNAIL_REDUNDANCY_COUNT = 1;

export const enum RulerScaleKey {
    SCALE_10 = '10',
    SCALE_50 = '50',
    SCALE_80 = '80',
    SCALE_100 = '100',
    SCALE_150 = '150',
    SCALE_200 = '200',
    SCALE_400 = '400',
}

const defaultRuleTimeStep = 0.2;
// 卡尺的缩放数据
export const RULER_SCALE_DATA = {
    [RulerScaleKey.SCALE_10] : {
        scale: DEFAULT_SCALE * 0.1,
        ruleTimeStep: defaultRuleTimeStep * 5,  // 单位s
        thumbTimeStep: 5, // 单位s
    },
    [RulerScaleKey.SCALE_50] : {
        scale: DEFAULT_SCALE * 0.5,
        ruleTimeStep: defaultRuleTimeStep ,  // 单位s
        thumbTimeStep: 2, // 单位s
    },
    [RulerScaleKey.SCALE_80] : {
        scale: DEFAULT_SCALE * 0.8,
        ruleTimeStep: defaultRuleTimeStep,  // 单位s
        thumbTimeStep: 1.5, // 单位s
    },
    [RulerScaleKey.SCALE_100] : {
        scale: DEFAULT_SCALE,
        ruleTimeStep: defaultRuleTimeStep,  // 单位s
        thumbTimeStep: 1, // 单位s
        default: true,
    },
    [RulerScaleKey.SCALE_150] : {
        scale: DEFAULT_SCALE * 1.5,
        ruleTimeStep: defaultRuleTimeStep,  // 单位s
        thumbTimeStep: 0.8, // 单位s
    },
    [RulerScaleKey.SCALE_200] : {
        scale: DEFAULT_SCALE * 2,
        ruleTimeStep: defaultRuleTimeStep / 2,  // 单位s
        thumbTimeStep: 0.5, // 单位s
    },
    [RulerScaleKey.SCALE_400] : {
        scale: DEFAULT_SCALE * 4,
        ruleTimeStep: defaultRuleTimeStep / 4,  // 单位s
        thumbTimeStep: 0.2, // 单位s
    }
}
export const RULER_SCALE_DATA_LIST = Object.values(RULER_SCALE_DATA);