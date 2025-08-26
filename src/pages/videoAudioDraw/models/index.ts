import { create } from 'zustand';
import { ITrack, ISelectedClip } from '../types/index';
import { DEFAULT_SCALE, DEFAULT_LEFT_DIS} from '../models/constant';


interface IRootStore {
    selectedClipItem: ISelectedClip | null;
    scale: number;
    scrollLeft: number;
    isTimelineDragging: boolean;
    isPlayheadDragging: boolean;
    duration: number;
    tracks: ITrack[];
    isClippingOrDragging: boolean;
    videoIsPlaying: boolean;

    setSelectedClipItem: (selectedClip: ISelectedClip | null) => void;
    setVideoIsPlaying: (videoIsPlaying: boolean) => void;
    setIsClippingOrDragging: (isClippingOrDragging: boolean) => void;
    setTracks: (tracks: ITrack[]) => void;
    setIsPlayheadDragging: (isPlayheadDragging: boolean) => void;
    setDuration: (duration: number) => void;
    setIsTimelineDragging: (isTimelineDragging: boolean) => void;
    setScrollLeft: (scrollLeft: number) => void;
    setScale: (scale: number) => void;
}


export const useRootStore = create<IRootStore>((set) => ({
    selectedClipItem: null,
    scale: DEFAULT_SCALE, // 默认 1s 占用100px
    scrollLeft: 0,
    isTimelineDragging: false,
    isPlayheadDragging: false,
    duration: 0,
    tracks: [],
    isClippingOrDragging: false,
    videoIsPlaying: false,

    setSelectedClipItem: (selectedClipItem: ISelectedClip | null) => set(() => ({ selectedClipItem })),
    setVideoIsPlaying: (videoIsPlaying: boolean) => set(() => ({ videoIsPlaying })),
    setIsClippingOrDragging: (isClippingOrDragging: boolean) => set(() => ({ isClippingOrDragging })),
    setTracks: (tracks: ITrack[]) => set(() => ({ tracks })),
    setIsPlayheadDragging: (isPlayheadDragging: boolean) => set(() => ({ isPlayheadDragging })),
    setDuration: (duration: number) => set(() => ({ duration })),
    setIsTimelineDragging: (isTimelineDragging: boolean) => set(() => ({ isTimelineDragging })),
    setScrollLeft: (scrollLeft: number) => set(() => ({ scrollLeft })),
    setScale: (scale: number) => set(() => ({ scale })),
}));