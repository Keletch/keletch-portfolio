import { useRef } from 'react';

interface BlinkState {
    isBlinking: boolean;
    openness: number;
    nextBlinkTime: number;
    blinkDuration: number;
    blinkTimer: number;
}

export function useBlink(initialOpenness = 1.0) {
    const blinkState = useRef<BlinkState>({
        isBlinking: false,
        openness: initialOpenness,
        nextBlinkTime: 0,
        blinkDuration: 0.15,
        blinkTimer: 0
    });

    const updateBlink = (dt: number, elapsedTime: number) => {
        const blink = blinkState.current;
        blink.blinkTimer += dt;

        if (!blink.isBlinking) {
            if (elapsedTime > blink.nextBlinkTime) {
                blink.isBlinking = true;
                blink.blinkTimer = 0;
                blink.nextBlinkTime = elapsedTime + Math.random() * 4 + 2;
            }
            blink.openness = 1.0;
        } else {
            const progress = blink.blinkTimer / blink.blinkDuration;
            if (progress >= 1) {
                blink.isBlinking = false;
                blink.openness = 1.0;
            } else {
                blink.openness = Math.abs(Math.cos(progress * Math.PI));
            }
        }
    };

    return {
        blinkState,
        updateBlink
    };
}
