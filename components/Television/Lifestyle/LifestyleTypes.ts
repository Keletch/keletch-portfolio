

export interface LifestyleProps {
    modelPath: string;
    screenNames?: string[];
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    rotationX?: number;
    theme?: 'classic' | 'toxic' | 'blood' | 'sulfur' | 'toon' | 'mobile' | 'amber' | 'cyan' | 'magenta' | 'terminal' | 'glitch' | 'holo' | 'hacker' | 'noir' | 'velvet' | 'gold';
    invertY?: boolean;
    gazeOffset?: { x: number; y: number };
    uvRotation?: number;
    modelYOffset?: number;
    focusedText?: string;
    isFocused?: boolean;

    showBackButton?: boolean;
    backButtonPosition?: { x: number; y: number };
    onBackClick?: () => void;

    showMenuButton?: boolean;
    menuButtonPosition?: { x: number; y: number };
    onMenuClick?: () => void;
}

export const LIFESTYLE_BUTTON_CONFIG = {
    PLAY: { x: 0, y: 150, radius: 45 },
    BACK: { x: 200, y: -180, radius: 45 },
    MENU: { x: -200, y: -180, radius: 45 }
};
