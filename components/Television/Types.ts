
export interface TelevisionProps {
    modelPath: string;
    screenNames?: string[];
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    rotationX?: number;
    theme?: 'classic' | 'toxic' | 'blood' | 'void' | 'sulfur' | 'toon' | 'sonar' | 'mobile'; // 'mobile' is Nokia Blue
    invertY?: boolean; // Invertir eje Y si el modelo tiene UVs invertidas
    gazeOffset?: { x: number; y: number }; // Offset manual para calibración
    uvRotation?: number; // Rotación de la textura en radianes (ej: Math.PI/4 para 45°)
    modelYOffset?: number; // Offset vertical del modelo dentro del grupo
    focusedText?: string;
    isFocused?: boolean;
    textYOffset?: number;
    showStartButton?: boolean;
    onStartClick?: () => void;
    showBackButton?: boolean;
    onBackClick?: () => void;
    showMenuButton?: boolean;
    onMenuClick?: () => void;
    // Story Mode
    storyContent?: string[]; // Array of dialogue paragraphs
    storyFigures?: string[]; // Array of figure types (e.g., 'waving-hand', 'computer')
    enableStoryMode?: boolean; // Enable story mode on Play button click
}

export const THEMES = {
    classic: {
        bgColor: '#000515',
        baseColor: 'rgba(0, 20, 100, 0.2)',
        glowCenter: 'rgba(40, 60, 255, 0.1)',
        irisColor: '#5090ff',
        lightColor: '#2040ff',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(0, 5, 20, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff'
    },
    toxic: {
        bgColor: '#001a05',
        baseColor: 'rgba(0, 40, 10, 0.3)',
        glowCenter: 'rgba(0, 255, 50, 0.1)',
        irisColor: '#00bb33',
        lightColor: '#00ff44',
        lightIntensity: 8.0,
        vignetteColor: 'rgba(0, 10, 0, 0.95)',
        lookRange: 32,
        scleraColor: '#ffffff'
    },
    blood: {
        bgColor: '#200000',
        baseColor: 'rgba(60, 0, 0, 0.3)',
        glowCenter: 'rgba(255, 0, 0, 0.1)',
        irisColor: '#cc0000',
        lightColor: '#ff0000',
        lightIntensity: 8.0,
        vignetteColor: 'rgba(20, 0, 0, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff'
    },
    void: {
        bgColor: '#150020',
        baseColor: 'rgba(30, 0, 40, 0.3)', // Added missing baseColor for void
        glowCenter: 'rgba(100, 0, 255, 0.1)',
        irisColor: '#9900ff',
        lightColor: '#a000ff',
        lightIntensity: 7.0,
        vignetteColor: 'rgba(10, 0, 20, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff'
    },
    sulfur: {
        bgColor: '#1a1a00',
        baseColor: 'rgba(60, 60, 0, 0.3)',
        glowCenter: 'rgba(255, 255, 0, 0.08)',
        irisColor: '#d4c264',
        lightColor: '#ffee00',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(20, 20, 0, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff'
    },
    toon: {
        bgColor: '#151515',
        baseColor: 'rgba(20, 20, 20, 0.3)',
        glowCenter: 'rgba(255, 255, 255, 0.05)',
        irisColor: '#dcdcdc',
        lightColor: '#ffffff',
        lightIntensity: 4.0,
        vignetteColor: 'rgba(5, 5, 5, 0.98)',
        lookRange: 26,
        scleraColor: '#ffffff'
    },
    sonar: {
        bgColor: '#001a05',
        baseColor: 'rgba(0, 60, 10, 0.3)',
        glowCenter: 'rgba(0, 255, 50, 0.15)',
        irisColor: '#00ff44',
        lightColor: '#00ff33',
        lightIntensity: 7.0,
        vignetteColor: 'rgba(0, 20, 0, 0.95)',
        lookRange: 15,
        scleraColor: 'rgba(0, 255, 50, 0.4)'
    },
    mobile: {
        bgColor: '#00051a', // Dark Blue
        baseColor: 'rgba(0, 20, 60, 0.3)', // Deep Blue Base
        glowCenter: 'rgba(0, 100, 255, 0.2)', // Nokia Blue Glow
        irisColor: '#0088ff', // Electric Blue Iris
        lightColor: '#00aaff',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(0, 0, 20, 0.95)',
        lookRange: 15, // Small screen range
        scleraColor: 'rgba(0, 100, 255, 0.4)' // Digital Blue Sclera
    }
};

export const BUTTON_CONFIG = {
    PLAY: { x: -200, y: 190, radius: 40, width: 140, height: 45 },
    BACK: { x: 200, y: 190, radius: 40 },
    MENU: { x: 0, y: 190, radius: 40 }
};

