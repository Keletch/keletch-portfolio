export interface ContactProps {
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
    showBackButton?: boolean;
    backButtonPosition?: { x: number, y: number };
    onBackClick?: () => void;
    showMenuButton?: boolean;
    menuButtonPosition?: { x: number, y: number };
    onMenuClick?: () => void;
}

// Mobile screen has different aspect ratio, buttons need to be closer together
// Standard TV is 512x512 with a landscape aspect ratio viewing area.
// The Mobile screen is narrow and tall.
export const CONTACT_BUTTON_CONFIG = {
    BACK: { x: 190, y: -200, radius: 40 },
    MENU: { x: -190, y: -200, radius: 40 }
};
