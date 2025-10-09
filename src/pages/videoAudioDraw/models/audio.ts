import { create } from 'zustand';


interface IAudioStore {
    duration: number;
    startTime: number;
    endTime: number;
    audioBuffer: AudioBuffer | null;
    waveformData: Uint8Array | null;
    staticWaveformData: Uint8Array | null;
    audioContext: AudioContext | null;

    clearAudioContext: () => void;
    setAudioContext: (audioContext: AudioContext | null) => void;
    setStartTime: (startTime: number) => void;
    setEndTime: (endTime: number) => void;
    setAudioBuffer: (audioBuffer: AudioBuffer | null) => void;
    setWaveformData: (waveformData: Uint8Array | null) => void;
    setStaticWaveformData: (staticWaveformData: Uint8Array | null) => void;
}


export const useAudioStore = create<IAudioStore>((set) => ({
    duration: 0,
    startTime: 0,
    endTime: 0,
    audioBuffer: null,
    waveformData: null,
    staticWaveformData: null,
    audioContext: null,

    clearAudioContext: () => set(() => ({ 
        audioContext: null,
        audioBuffer: null,
        waveformData: null,
        staticWaveformData: null,
        duration: 0,
        startTime: 0,
        endTime: 0,
    })),
    setAudioContext: (audioContext: AudioContext | null) => set(() => ({ audioContext })),
    setStartTime: (startTime: number) => set(() => ({ startTime })),
    setEndTime: (endTime: number) => set(() => ({ endTime })),
    setAudioBuffer: (audioBuffer: AudioBuffer | null) => set(() => ({ audioBuffer })),
    setWaveformData: (waveformData: Uint8Array | null) => set(() => ({ waveformData })),
    setStaticWaveformData: (staticWaveformData: Uint8Array | null) => set(() => ({ staticWaveformData })),
}));