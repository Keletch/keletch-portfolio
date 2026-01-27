import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

export function useFigureTransition(targetFigure: string | null) {
    const [renderedFigure, setRenderedFigure] = useState(targetFigure);
    const opacityRef = useRef(1.0);
    const timeRef = useRef(0);

    // We use a ref for the output so the consumer can read it in their useFrame
    // without requiring a React render cycle.
    const effectiveOpacityRef = useRef(1.0);

    useFrame((state, delta) => {
        const speed = 2.0;
        timeRef.current += delta;

        // 1. Manage Linear Opacity State
        if (renderedFigure !== targetFigure) {
            opacityRef.current -= delta * speed;
            if (opacityRef.current < 0) opacityRef.current = 0;

            if (opacityRef.current <= 0) {
                setRenderedFigure(targetFigure);
                opacityRef.current = 0;
            }

        } else {
            if (opacityRef.current < 1.0) {
                opacityRef.current += delta * speed;
                if (opacityRef.current > 1.0) opacityRef.current = 1.0;
            }
        }

        // 2. Calculate Effective Flicker Opacity
        let effective = opacityRef.current;

        if (effective < 1.0 && effective > 0.0) {
            const flickerA = Math.sin(timeRef.current * 30) * 0.5 + 0.5;
            const flickerB = Math.sin(timeRef.current * 55) * 0.5 + 0.5;

            const flickerMixed = (flickerA * 0.7 + flickerB * 0.3);

            effective = effective * (0.3 + flickerMixed * 1.5);

            if (Math.sin(timeRef.current * 12) > 0.8) {
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
