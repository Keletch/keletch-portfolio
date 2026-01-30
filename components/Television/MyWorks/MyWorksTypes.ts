
export interface MyWorksProps {
    modelPath: string;
    screenNames?: string[];
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    rotationX?: number;
    theme?: 'classic' | 'toxic' | 'blood' | 'sulfur' | 'toon' | 'mobile';
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
    showPrevButton?: boolean;
    prevButtonPosition?: { x: number, y: number };
    onPrevClick?: () => void;
    showEyeButton?: boolean;
    eyeButtonPosition?: { x: number, y: number };
    onEyeClick?: () => void;
    disableStartPulse?: boolean;
}

export const MYWORKS_BUTTON_CONFIG = {
    PLAY: { x: -200, y: 190, radius: 40, width: 140, height: 45 },
    BACK: { x: 200, y: 190, radius: 40 },
    MENU: { x: 0, y: 190, radius: 40 },
    PREV: { x: -200, y: 190, radius: 40 },
    EYE: { x: 0, y: 190, radius: 20 }
};

// Shared Layout Interface
export interface OSDLayout {
    allLines: string[];
    t1: number;
    t2: number;
    totalChars: number;
    boxX: number;
    boxY: number;
    boxW: number;
    boxH: number;
    hitArea: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
    lineHeight: number;
    groups: {
        len1: number;
        len2: number;
        len3: number;
    };
}
