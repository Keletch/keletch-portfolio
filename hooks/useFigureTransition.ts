import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

export function useFigureTransition(targetFigure: string | null, timeOffset: number = 0) {
    const [renderedFigure, setRenderedFigure] = useState(targetFigure);
    const opacityRef = useRef(1.0);
    const timeRef = useRef(timeOffset); // Use provided offset for async flicker

    // We use a ref for the output so the consumer can read it in their useFrame
    // without requiring a React render cycle.
    const effectiveOpacityRef = useRef(1.0);

    useFrame((state, delta) => {
        const speed = 1.5; // Slower transition for smoother fade
        timeRef.current += delta;

        // 1. Manage Linear Opacity State
        if (renderedFigure !== targetFigure) {
            // Fading OUT old figure
            opacityRef.current -= delta * speed;
            if (opacityRef.current < 0) opacityRef.current = 0;

            if (opacityRef.current <= 0) {
                setRenderedFigure(targetFigure);
                // When switching to new figure, we start at 0 opacity to fade IN
                opacityRef.current = 0;
            }

        } else {
            // Fading IN current figure
            if (opacityRef.current < 1.0 && targetFigure !== null) {
                opacityRef.current += delta * speed;
                if (opacityRef.current > 1.0) opacityRef.current = 1.0;
            }
        }

        // 2. Calculate Effective Flicker Opacity
        let effective = opacityRef.current;

        if (effective < 1.0 && effective > 0.0) {
            // Use timeOffset to create unique frequency variations
            const freqMultiplier = 1 + (timeOffset / 100);

            const flickerA = Math.sin(timeRef.current * 30 * freqMultiplier) * 0.5 + 0.5;
            const flickerB = Math.sin(timeRef.current * 55 * freqMultiplier) * 0.5 + 0.5;

            const flickerMixed = (flickerA * 0.7 + flickerB * 0.3);

            // Smoother flicker curve: less extreme reduction at low opacity
            // Original: effective = effective * (0.3 + flickerMixed * 1.5);
            // New: Mix original opacity more gradually
            const flickerIntensity = 0.5 + (flickerMixed * 1.0);
            effective = effective * flickerIntensity;

            if (Math.sin(timeRef.current * 12 * freqMultiplier) > 0.8) {
                effective *= 0.1;
            }

            effective = Math.max(0, Math.min(1, effective));

            if (effective > 0.98) effective = 0.98;
        }

        // Update the Ref output
        effectiveOpacityRef.current = effective;
    });

    return {
        renderedFigure,
        linearOpacity: opacityRef,
        transitionOpacity: effectiveOpacityRef,
        isTransitioning: opacityRef.current < 1.0
    };
}
