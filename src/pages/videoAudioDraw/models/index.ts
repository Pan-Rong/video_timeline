import { create } from 'zustand';
import { ITrack } from '../types/index';
import { DEFAULT_SCALE, DEFAULT_LEFT_DIS} from '../models/constant';


interface IRootStore {
    scale: number;
    scrollLeft: number;
    isTimelineDragging: boolean;
    isPlayheadDragging: boolean;
    selectedClipId: string | null;
    duration: number;
    tracks: ITrack[];
    isClippingOrDragging: boolean;
    videoIsPlaying: boolean;

    setVideoIsPlaying: (videoIsPlaying: boolean) => void;
    setIsClippingOrDragging: (isClippingOrDragging: boolean) => void;
    setTracks: (tracks: ITrack[]) => void;
    setIsPlayheadDragging: (isPlayheadDragging: boolean) => void;
    setDuration: (duration: number) => void;
    setSelectedClipId: (selectedClipId: string | null) => void;
    setIsTimelineDragging: (isTimelineDragging: boolean) => void;
    setScrollLeft: (scrollLeft: number) => void;
    setScale: (scale: number) => void;
}


export const useRootStore = create<IRootStore>((set) => ({
    scale: DEFAULT_SCALE, // 默认 1s 占用100px
    scrollLeft: 0,
    isTimelineDragging: false,
    isPlayheadDragging: false,
    selectedClipId: null,
    duration: 0,
    tracks: [],
    isClippingOrDragging: false,
    videoIsPlaying: false,

    setVideoIsPlaying: (videoIsPlaying: boolean) => set(() => ({ videoIsPlaying })),
    setIsClippingOrDragging: (isClippingOrDragging: boolean) => set(() => ({ isClippingOrDragging })),
    setTracks: (tracks: ITrack[]) => set(() => ({ tracks })),
    setIsPlayheadDragging: (isPlayheadDragging: boolean) => set(() => ({ isPlayheadDragging })),
    setDuration: (duration: number) => set(() => ({ duration })),
    setSelectedClipId: (selectedClipId: string | null) => set(() => ({ selectedClipId })),
    setIsTimelineDragging: (isTimelineDragging: boolean) => set(() => ({ isTimelineDragging })),
    setScrollLeft: (scrollLeft: number) => set(() => ({ scrollLeft })),
    setScale: (scale: number) => set(() => ({ scale })),
}));