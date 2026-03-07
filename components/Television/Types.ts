export interface TelevisionProps {
    modelPath: string;
    screenNames?: string[];
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    rotationX?: number;
    theme?: 'classic' | 'toxic' | 'blood' | 'amber' | 'glitch' | 'holo' | 'hacker' | 'noir' | 'velvet' | 'gold' | 'sulfur' | 'toon' | 'cyan' | 'magenta' | 'terminal' | 'void' | 'mobile';
    invertY?: boolean;
    gazeOffset?: { x: number; y: number };
    uvRotation?: number;
    modelYOffset?: number;
    focusedText?: string;
    isFocused?: boolean;
    textYOffset?: number;
    isHologram?: boolean;
    textColor?: string;
    highlightColor?: string;
    textShadow1?: string;
    textShadow2?: string;
}

export interface ThemeColors {
    bgColor: string;
    baseColor: string;
    glowCenter: string;
    vignetteColor: string;
    irisColor: string;
    scleraColor: string;
    lightColor?: string;
    lightIntensity?: number;
    lookRange?: number;
    isHologram?: boolean;
    textColor?: string;
    highlightColor?: string;
    textShadow1?: string;
    textShadow2?: string;
}

export const THEMES: Record<NonNullable<TelevisionProps['theme']>, ThemeColors> = {
    classic: {
        bgColor: '#000515',
        baseColor: 'rgba(0, 20, 100, 0.2)',
        glowCenter: 'rgba(40, 60, 255, 0.1)',
        irisColor: '#5090ff',
        lightColor: '#2040ff',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(0, 5, 20, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff',
        textColor: '#88ccff',
        highlightColor: '#aabbff'
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
        scleraColor: '#ffffff',
        textColor: '#ffffff',
        highlightColor: '#00ff44'
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
        scleraColor: '#ffffff',
        textColor: '#ff4444',
        highlightColor: '#ff8888'
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
        scleraColor: '#ffffff',
        textColor: '#ffff44',
        highlightColor: '#ffff44'
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
        scleraColor: '#ffffff',
        textColor: '#ffffff',
        highlightColor: '#dcdcdc'
    },
    amber: {
        bgColor: '#0a0500',
        baseColor: 'rgba(40, 25, 0, 0.3)',
        glowCenter: 'rgba(255, 170, 68, 0.1)',
        irisColor: '#ffbb33',
        lightColor: '#ffaa44',
        lightIntensity: 7.0,
        vignetteColor: 'rgba(15, 8, 0, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff',
        textColor: '#ffcc00',
        highlightColor: '#ffaa44'
    },
    glitch: {
        bgColor: '#050000',
        baseColor: 'rgba(30, 0, 0, 0.3)',
        glowCenter: 'rgba(255, 0, 0, 0.15)',
        irisColor: '#ff0000',
        lightColor: '#ff0000',
        lightIntensity: 9.0,
        vignetteColor: 'rgba(25, 0, 0, 0.95)',
        lookRange: 28,
        scleraColor: '#ffffff',
        textColor: '#ff3333',
        highlightColor: '#ff0000'
    },
    cyan: {
        bgColor: '#000a0f',
        baseColor: 'rgba(0, 30, 50, 0.3)',
        glowCenter: 'rgba(0, 238, 255, 0.1)',
        irisColor: '#00eeff',
        lightColor: '#00ccff',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(0, 8, 15, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff',
        textColor: '#00aaff',
        highlightColor: '#00ffff'
    },
    magenta: {
        bgColor: '#0f0005',
        baseColor: 'rgba(50, 0, 20, 0.3)',
        glowCenter: 'rgba(255, 0, 119, 0.1)',
        irisColor: '#ff0077',
        lightColor: '#ff00cc',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(15, 0, 8, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff',
        textColor: '#ff3399',
        highlightColor: '#ff00cc'
    },
    terminal: {
        bgColor: '#000a02',
        baseColor: 'rgba(0, 30, 5, 0.3)',
        glowCenter: 'rgba(0, 255, 68, 0.12)',
        irisColor: '#00ff44',
        lightColor: '#00cc44',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(0, 8, 0, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff',
        textColor: '#33ff33',
        highlightColor: '#00ff00'
    },
    void: {
        bgColor: '#150020',
        baseColor: 'rgba(30, 0, 40, 0.3)',
        glowCenter: 'rgba(100, 0, 255, 0.1)',
        irisColor: '#9900ff',
        lightColor: '#a000ff',
        lightIntensity: 7.0,
        vignetteColor: 'rgba(10, 0, 20, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff',
        textColor: '#ffffff',
        highlightColor: '#9900ff'
    },

    holo: {
        bgColor: '#100020',
        baseColor: 'rgba(40, 0, 60, 0.3)',
        glowCenter: 'rgba(200, 0, 255, 0.15)',
        irisColor: '#ff00ff',
        lightColor: '#00ffff',
        lightIntensity: 7.0,
        vignetteColor: 'rgba(20, 0, 40, 0.90)',
        lookRange: 26,
        scleraColor: '#ffffff',
        isHologram: true,
        textColor: '#ff88ff',
        highlightColor: '#ff00ff'
    },
    hacker: {
        bgColor: '#000000',
        baseColor: '#000000',
        glowCenter: 'rgba(0, 255, 50, 0.1)',
        irisColor: '#4af626',
        lightColor: '#4af626',
        lightIntensity: 8.0,
        vignetteColor: '#000000',
        lookRange: 30,
        scleraColor: 'rgba(74, 246, 38, 0.15)',
        isHologram: true,
        textColor: '#4af626',
        highlightColor: '#4af626'
    },
    noir: {
        bgColor: '#050505',
        baseColor: 'rgba(10, 10, 10, 0.3)',
        glowCenter: 'rgba(255, 255, 255, 0.05)',
        irisColor: '#ffffff',
        lightColor: '#ffffff',
        lightIntensity: 4.0,
        vignetteColor: 'rgba(0, 0, 0, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff',
        textColor: '#aaaaaa',
        highlightColor: '#ffffff'
    },
    velvet: {
        bgColor: '#1a001a',
        baseColor: 'rgba(40, 0, 40, 0.3)',
        glowCenter: 'rgba(255, 200, 50, 0.1)',
        irisColor: '#ffcc00',
        lightColor: '#ffcc00',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(20, 0, 20, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff',
        textColor: '#ffd700',
        highlightColor: '#ffcc00'
    },
    gold: {
        bgColor: '#101010',
        baseColor: 'rgba(20, 20, 20, 0.3)',
        glowCenter: 'rgba(255, 215, 0, 0.1)',
        irisColor: '#ffd700',
        lightColor: '#ffcc00',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(5, 5, 5, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff',
        textColor: '#ffd700',
        highlightColor: '#ffaa00'
    },
    mobile: {
        bgColor: '#000000',
        baseColor: 'rgba(0, 50, 20, 0.3)',
        glowCenter: 'rgba(0, 255, 100, 0.1)',
        irisColor: '#00ff66',
        lightColor: '#00ff66',
        lightIntensity: 5.0,
        vignetteColor: 'rgba(0, 0, 0, 0.9)',
        lookRange: 15,
        scleraColor: '#ffffff',
        isHologram: true,
        textColor: '#00ff66',
        highlightColor: '#00ff66'
    }
};
