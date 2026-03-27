import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

export function useFigureTransition(targetFigure: string | null, timeOffset: number = 0, speed: number = 1.5) {
    const [renderedFigure, setRenderedFigure] = useState(targetFigure);
    const opacityRef = useRef(targetFigure !== null ? 1.0 : 0.0);
    const timeRef = useRef(timeOffset); // Use provided offset for async flicker

    const effectiveOpacityRef = useRef(0.0);

    useFrame((state, delta) => {
        timeRef.current += delta;

        // Manage fading between figures
        if (renderedFigure !== targetFigure) {
            opacityRef.current -= delta * speed;
            if (opacityRef.current <= 0) {
                setRenderedFigure(targetFigure);
                opacityRef.current = 0;
            }
        } else if (opacityRef.current < 1.0 && targetFigure !== null) {
            opacityRef.current += delta * speed;
            if (opacityRef.current > 1.0) opacityRef.current = 1.0;
        }

        let effective = opacityRef.current;

        // Apply visual flicker/glitch during transitions
        if (effective < 1.0 && effective > 0.0) {
            const freqMultiplier = 1 + (timeOffset / 100);
            const flickerA = Math.sin(timeRef.current * 45 * freqMultiplier) * 0.5 + 0.5;
            const flickerB = Math.sin(timeRef.current * 85 * freqMultiplier) * 0.5 + 0.5;
            const flickerMixed = (flickerA * 0.6 + flickerB * 0.4);

            // Deeper flicker range (0.3 to 1.7)
            const flickerIntensity = 0.3 + (flickerMixed * 1.4);
            effective = effective * flickerIntensity;

            // More frequent and deeper "Deep Glitch" (momentary blackout)
            const glitchFreq = Math.sin(timeRef.current * 18 * freqMultiplier);
            if (glitchFreq > 0.75 || (glitchFreq < -0.9 && Math.random() > 0.5)) {
                effective *= 0.05;
            }

            // Cap it to just under 1.0 for the flicker phase
            effective = Math.max(0, Math.min(0.99, effective));
        }

        effectiveOpacityRef.current = effective;
    });

    return {
        renderedFigure,
        linearOpacity: opacityRef,
        transitionOpacity: effectiveOpacityRef,
        isTransitioning: opacityRef.current < 1.0
    };
}
