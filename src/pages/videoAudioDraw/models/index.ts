import { create } from 'zustand';
import { ITrack } from '../types/index';


interface IRootStore {
    scale: number;
    scrollLeft: number;
    playheadPosition: number;
    isTimelineDragging: boolean;
    isPlayheadDragging: boolean;
    selectedClipId: string | null;
    duration: number;
    tracks: ITrack[];
    isClippingOrDragging: boolean;

    setIsClippingOrDragging: (isClippingOrDragging: boolean) => void;
    setTracks: (tracks: ITrack[]) => void;
    setIsPlayheadDragging: (isPlayheadDragging: boolean) => void;
    setDuration: (duration: number) => void;
    setSelectedClipId: (selectedClipId: string | null) => void;
    setIsTimelineDragging: (isTimelineDragging: boolean) => void;
    setPlayheadPosition: (playheadPosition: number) => void;
    setScrollLeft: (scrollLeft: number) => void;
    setScale: (scale: number) => void;
}


export const useRootStore = create<IRootStore>((set) => ({
    scale: 100, // 默认 1s 占用100px
    scrollLeft: 0,
    playheadPosition: 0,
    isTimelineDragging: false,
    isPlayheadDragging: false,
    selectedClipId: null,
    duration: 0,
    tracks: [],
    isClippingOrDragging: false,
    
    setIsClippingOrDragging: (isClippingOrDragging: boolean) => set(() => ({ isClippingOrDragging })),
    setTracks: (tracks: ITrack[]) => set(() => ({ tracks })),
    setIsPlayheadDragging: (isPlayheadDragging: boolean) => set(() => ({ isPlayheadDragging })),
    setDuration: (duration: number) => set(() => ({ duration })),
    setSelectedClipId: (selectedClipId: string | null) => set(() => ({ selectedClipId })),
    setIsTimelineDragging: (isTimelineDragging: boolean) => set(() => ({ isTimelineDragging })),
    setPlayheadPosition: (playheadPosition: number) => set(() => ({ playheadPosition })),
    setScrollLeft: (scrollLeft: number) => set(() => ({ scrollLeft })),
    setScale: (scale: number) => set(() => ({ scale })),
}));