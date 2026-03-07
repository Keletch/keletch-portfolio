import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

export function useFigureTransition(targetFigure: string | null, timeOffset: number = 0) {
    const [renderedFigure, setRenderedFigure] = useState(targetFigure);
    const opacityRef = useRef(0.0);
    const timeRef = useRef(timeOffset); // Use provided offset for async flicker

    const effectiveOpacityRef = useRef(0.0);

    useFrame((state, delta) => {
        const speed = 1.5;
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
            const flickerA = Math.sin(timeRef.current * 30 * freqMultiplier) * 0.5 + 0.5;
            const flickerB = Math.sin(timeRef.current * 55 * freqMultiplier) * 0.5 + 0.5;
            const flickerMixed = (flickerA * 0.7 + flickerB * 0.3);

            const flickerIntensity = 0.5 + (flickerMixed * 1.0);
            effective = effective * flickerIntensity;

            if (Math.sin(timeRef.current * 12 * freqMultiplier) > 0.8) {
                effective *= 0.1;
            }

            effective = Math.max(0, Math.min(0.98, effective));
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
