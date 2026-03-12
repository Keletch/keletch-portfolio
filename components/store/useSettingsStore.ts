import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Application themes
export const THEMES = [
    'classic', 'toxic', 'blood',
    'amber', 'glitch', 'holo', 'hacker', 'noir', 'velvet', 'gold'
] as const;

export type ThemeName = typeof THEMES[number];

interface SettingsState {
    theme: ThemeName;
    curveIntensity: number;
    scanlineOpacity: number;
    noiseOpacity: number;
    aberrationOffset: number;
    barrelScanline: boolean;
    vignetteStrength: number;
    scanlineCount: number;
    blurSize: number;
    ambientIntensity: number;
    gravityY: number;
    cameraFOV: number;
    musicVolume: number;
    bubblesVolume: number;
    hasDoneZoomThisSession: boolean;

    globalResetTrigger: number;
    globalUnfreezeTrigger: number;
    resettingItemsCount: number;
    itemsReadyCount: number;

    isTopDownView: boolean;
    isDragging: boolean;

    // Actions
    setGlobalResetTrigger: (time: number) => void;
    registerResettingItem: () => void;
    unregisterResettingItem: () => void;
    reportItemReady: () => void;
    setTopDownView: (val: boolean) => void;
    toggleTopDownView: () => void;
    setDragging: (val: boolean) => void;
    setTheme: (theme: ThemeName) => void;
    nextTheme: () => void;
    prevTheme: () => void;
    incCurve: () => void;
    decCurve: () => void;
    incScanline: () => void;
    decScanline: () => void;
    incNoise: () => void;
    decNoise: () => void;
    incAberration: () => void;
    decAberration: () => void;
    toggleBarrel: () => void;
    incVignette: () => void;
    decVignette: () => void;
    incScanlineCount: () => void;
    decScanlineCount: () => void;
    incBlur: () => void;
    decBlur: () => void;
    incAmbient: () => void;
    decAmbient: () => void;
    incGravity: () => void;
    decGravity: () => void;
    incFOV: () => void;
    decFOV: () => void;
    incMusicVolume: () => void;
    decMusicVolume: () => void;
    incBubblesVolume: () => void;
    decBubblesVolume: () => void;
    setNumericSetting: (id: string, value: number) => void;
    setHasDoneZoomThisSession: (val: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'classic',
            curveIntensity: 4.0,
            scanlineOpacity: 0.05,
            noiseOpacity: 0.2,
            aberrationOffset: 0.009,
            barrelScanline: true,
            vignetteStrength: 0.55,
            scanlineCount: 800,
            blurSize: 0.0005,
            ambientIntensity: 0.7,
            gravityY: -9.81,
            cameraFOV: 35,
            musicVolume: 0.8,
            bubblesVolume: 0.8,
            hasDoneZoomThisSession: false,

            globalResetTrigger: 0,
            globalUnfreezeTrigger: 0,
            resettingItemsCount: 0,
            itemsReadyCount: 0,
            isTopDownView: false,
            isDragging: false,

            setGlobalResetTrigger: (time: number) => set({ globalResetTrigger: time, itemsReadyCount: 0, globalUnfreezeTrigger: 0 }),

            // Logic for batching item readiness before unfreezing
            registerResettingItem: () => set(state => ({ resettingItemsCount: state.resettingItemsCount + 1 })),
            unregisterResettingItem: () => set(state => ({ resettingItemsCount: Math.max(0, state.resettingItemsCount - 1) })),
            reportItemReady: () => set(state => {
                const nextReadyCount = state.itemsReadyCount + 1;
                if (nextReadyCount >= state.resettingItemsCount && state.resettingItemsCount > 0) {
                    return {
                        itemsReadyCount: 0,
                        resettingItemsCount: 0,
                        globalUnfreezeTrigger: Date.now()
                    };
                }
                return { itemsReadyCount: nextReadyCount };
            }),
            setTopDownView: (val: boolean) => set({ isTopDownView: val }),
            toggleTopDownView: () => set(state => ({ isTopDownView: !state.isTopDownView })),
            setDragging: (val: boolean) => set({ isDragging: val }),
            setTheme: (theme: ThemeName) => set({ theme }),

            nextTheme: () => set((state) => {
                const idx = THEMES.indexOf(state.theme);
                return { theme: THEMES[(idx + 1) % THEMES.length] };
            }),
            prevTheme: () => set((state) => {
                const idx = THEMES.indexOf(state.theme);
                return { theme: THEMES[(idx - 1 + THEMES.length) % THEMES.length] };
            }),

            incCurve: () => set((state) => ({ curveIntensity: Math.min(10.0, state.curveIntensity + 0.5) })),
            decCurve: () => set((state) => ({ curveIntensity: Math.max(2.0, state.curveIntensity - 0.5) })),

            incScanline: () => set((state) => ({ scanlineOpacity: Math.min(1.0, state.scanlineOpacity + 0.05) })),
            decScanline: () => set((state) => ({ scanlineOpacity: Math.max(0.0, state.scanlineOpacity - 0.05) })),

            incNoise: () => set((state) => ({ noiseOpacity: Math.min(1.0, state.noiseOpacity + 0.05) })),
            decNoise: () => set((state) => ({ noiseOpacity: Math.max(0.0, state.noiseOpacity - 0.05) })),

            incAberration: () => set((state) => ({ aberrationOffset: Math.min(0.05, state.aberrationOffset + 0.005) })),
            decAberration: () => set((state) => ({ aberrationOffset: Math.max(0.0, state.aberrationOffset - 0.005) })),

            toggleBarrel: () => set((state) => ({ barrelScanline: !state.barrelScanline })),

            incVignette: () => set((state) => ({ vignetteStrength: Math.min(1.0, +(state.vignetteStrength + 0.05).toFixed(2)) })),
            decVignette: () => set((state) => ({ vignetteStrength: Math.max(0.1, +(state.vignetteStrength - 0.05).toFixed(2)) })),

            incScanlineCount: () => set((state) => ({ scanlineCount: Math.min(2000, state.scanlineCount + 100) })),
            decScanlineCount: () => set((state) => ({ scanlineCount: Math.max(100, state.scanlineCount - 100) })),

            incBlur: () => set((state) => ({ blurSize: Math.min(0.003, +(state.blurSize + 0.0002).toFixed(4)) })),
            decBlur: () => set((state) => ({ blurSize: Math.max(0.0, +(state.blurSize - 0.0002).toFixed(4)) })),

            incAmbient: () => set((state) => ({ ambientIntensity: Math.min(2.0, +(state.ambientIntensity + 0.1).toFixed(2)) })),
            decAmbient: () => set((state) => ({ ambientIntensity: Math.max(0.0, +(state.ambientIntensity - 0.1).toFixed(2)) })),

            incGravity: () => set((state) => ({ gravityY: Math.min(0.0, +(state.gravityY + 1).toFixed(2)) })),
            decGravity: () => set((state) => ({ gravityY: Math.max(-20.0, +(state.gravityY - 1).toFixed(2)) })),

            incFOV: () => set((state) => ({ cameraFOV: Math.min(75, state.cameraFOV + 5) })),
            decFOV: () => set((state) => ({ cameraFOV: Math.max(15, state.cameraFOV - 5) })),

            incMusicVolume: () => set((state) => ({ musicVolume: Math.min(2.5, +(state.musicVolume + 0.1).toFixed(1)) })),
            decMusicVolume: () => set((state) => ({ musicVolume: Math.max(0.0, +(state.musicVolume - 0.1).toFixed(1)) })),

            incBubblesVolume: () => set((state) => ({ bubblesVolume: Math.min(2.5, +(state.bubblesVolume + 0.1).toFixed(1)) })),
            decBubblesVolume: () => set((state) => ({ bubblesVolume: Math.max(0.0, +(state.bubblesVolume - 0.1).toFixed(1)) })),

            setNumericSetting: (id: string, value: number) => set(() => {
                const map: Record<string, string> = {
                    curve: 'curveIntensity',
                    scanline: 'scanlineOpacity',
                    noise: 'noiseOpacity',
                    aberration: 'aberrationOffset',
                    vignette: 'vignetteStrength',
                    scanlineCount: 'scanlineCount',
                    blur: 'blurSize',
                    ambient: 'ambientIntensity',
                    gravity: 'gravityY',
                    fov: 'cameraFOV',
                    musicVolume: 'musicVolume',
                    bubblesVolume: 'bubblesVolume'
                };
                const prop = map[id] || id;
                const bounds: Record<string, [number, number]> = {
                    curveIntensity: [2.0, 10.0],
                    scanlineOpacity: [0.0, 1.0],
                    noiseOpacity: [0.0, 1.0],
                    aberrationOffset: [0.0, 0.05],
                    vignetteStrength: [0.1, 1.0],
                    scanlineCount: [100, 2000],
                    blurSize: [0.0, 0.003],
                    ambientIntensity: [0.0, 2.0],
                    gravityY: [-20.0, 0.0],
                    cameraFOV: [15, 75],
                    musicVolume: [0.0, 2.5],
                    bubblesVolume: [0.0, 2.5]
                };
                const [min, max] = bounds[prop] || [0, 1];
                return { [prop]: Math.max(min, Math.min(max, value)) };
            }),
            setHasDoneZoomThisSession: (val: boolean) => set({ hasDoneZoomThisSession: val }),
        }),
        {
            name: 'portfolio-settings',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                theme: state.theme,
                curveIntensity: state.curveIntensity,
                scanlineOpacity: state.scanlineOpacity,
                noiseOpacity: state.noiseOpacity,
                aberrationOffset: state.aberrationOffset,
                barrelScanline: state.barrelScanline,
                vignetteStrength: state.vignetteStrength,
                scanlineCount: state.scanlineCount,
                blurSize: state.blurSize,
                ambientIntensity: state.ambientIntensity,
                gravityY: state.gravityY,
                cameraFOV: state.cameraFOV,
                musicVolume: state.musicVolume,
                bubblesVolume: state.bubblesVolume
            })
        }
    )
);
