
export interface AboutMeProps {
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
    storyContent?: string[];
    storyFigures?: string[];
    enableStoryMode?: boolean;
}

export const ABOUTME_BUTTON_CONFIG = {
    PLAY: { x: -200, y: 190, radius: 40 },
    BACK: { x: 200, y: 190, radius: 40 },
    MENU: { x: 0, y: 190, radius: 40 }
};

export const ABOUTME_THEME = {
    bgColor: '#150020',
    baseColor: 'rgba(30, 0, 40, 0.3)',
    glowCenter: 'rgba(100, 0, 255, 0.1)',
    irisColor: '#9900ff',
    lightColor: '#a000ff',
    lightIntensity: 7.0,
    vignetteColor: 'rgba(10, 0, 20, 0.95)',
    lookRange: 26,
    scleraColor: '#ffffff'
};
