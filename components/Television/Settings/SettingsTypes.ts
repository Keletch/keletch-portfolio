import { ThemeColors } from '../Types';

export interface SettingsProps {
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
    showBackButton?: boolean;
    backButtonPosition?: { x: number, y: number };
    onBackClick?: () => void;
    showMenuButton?: boolean;
    menuButtonPosition?: { x: number, y: number };
    onMenuClick?: () => void;
    themeOverride?: Partial<ThemeColors>;
}

export const SETTINGS_BUTTON_CONFIG = {
    PLAY: { x: -200, y: 190, radius: 40 },
    BACK: { x: 200, y: 190, radius: 40 },
    MENU: { x: 0, y: 190, radius: 40 }
};

export const SETTINGS_THEME = {
    bgColor: '#101010',
    baseColor: 'rgba(50, 50, 50, 0.3)',
    glowCenter: 'rgba(255, 255, 255, 0.1)',
    irisColor: '#aaaaaa',
    lightColor: '#ffffff',
    lightIntensity: 7.0,
    vignetteColor: 'rgba(0, 0, 0, 0.95)',
    lookRange: 26,
    scleraColor: '#ffffff',
    isHologram: false,
    textColor: '#ffffff',
    highlightColor: '#ffffff',
    textShadow1: undefined as string | undefined,
    textShadow2: undefined as string | undefined
};
