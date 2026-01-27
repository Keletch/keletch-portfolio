
export interface RadioProps {
    modelPath: string;
    screenNames?: string[];
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    rotationX?: number;
    theme?: string;
    invertY?: boolean;
    gazeOffset?: { x: number; y: number };
    uvRotation?: number;
    modelYOffset?: number;
    focusedText?: string;
    isFocused?: boolean;
    textYOffset?: number;
    showStartButton?: boolean;
    startButtonPosition?: { x: number, y: number };
    onStartClick?: () => void;
    onStopClick?: () => void;
    status?: 'playing' | 'paused' | 'stopped';
    audioAnalyser?: AnalyserNode;
    currentSongName?: string;
    currentProgress?: number;
    onSeek?: (progress: number) => void;
    showBackButton?: boolean;
    backButtonPosition?: { x: number, y: number };
    onBackClick?: () => void;
    showMenuButton?: boolean;
    menuButtonPosition?: { x: number, y: number };
    onMenuClick?: () => void;
    showNextButton?: boolean;
    nextButtonPosition?: { x: number, y: number };
    onNextClick?: () => void;
    tracks?: string[];
    onSelectTrack?: (track: string) => void;
}

export const RADIO_BUTTON_CONFIG = {
    PLAY: { x: -200, y: -190, radius: 40 },
    BACK: { x: 200, y: -190, radius: 40 },
    MENU: { x: -200, y: 190, radius: 40 }
};

export const RADIO_THEME = {
    bgColor: '#001a05',
    baseColor: 'rgba(0, 60, 10, 0.3)',
    glowCenter: 'rgba(0, 255, 50, 0.15)',
    irisColor: '#00ff44',
    lightColor: '#00ff33',
    lightIntensity: 7.0,
    vignetteColor: 'rgba(0, 20, 0, 0.95)',
    lookRange: 15,
    scleraColor: 'rgba(0, 255, 50, 0.4)'
};
