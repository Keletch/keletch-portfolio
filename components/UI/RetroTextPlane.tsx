import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RetroTextPlaneProps {
    text: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale?: number; // Base scale factor
    fontSize?: number; // Logical font size for resolution
    opacity?: number;
    color?: string; // Not used for now as user requested white, but good for API
    enableJitter?: boolean;
    isHorizontal?: boolean;
    inverted?: boolean; // New prop for button mode
    borderRadius?: number; // Corner radius for button background
    onClick?: (e: any) => void;
    onPointerEnter?: (e: any) => void;
    onPointerLeave?: (e: any) => void;
}

export const RetroTextPlane = React.forwardRef<THREE.Mesh, RetroTextPlaneProps>(({
    text,
    position,
    rotation,
    scale = 1.0,
    fontSize = 60, // Resolution of the canvas text
    opacity = 1.0,
    color = '#ffffff',
    enableJitter = true,
    isHorizontal = false,
    inverted = false,
    borderRadius = 20,
    onClick,
    onPointerEnter,
    onPointerLeave
}, ref) => {
    // Use inner ref if external ref is not provided (handling both cases)
    const localRef = useRef<THREE.Mesh>(null);
    React.useImperativeHandle(ref, () => localRef.current as THREE.Mesh);

    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    // Create canvas once (depend on orientation)
    const { canvas, ctx } = useMemo(() => {
        const c = document.createElement('canvas');
        // Vertical: 128x512 (Strip)
        // Horizontal: 1024x256 (High Res Banner)
        if (isHorizontal) {
            c.width = 512;
            c.height = 128;
        } else {
            c.width = 128;
            c.height = 512;
        }
        const cx = c.getContext('2d');
        return { canvas: c, ctx: cx };
    }, [isHorizontal]);

    // Init texture
    useMemo(() => {
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        textureRef.current = tex;
    }, [canvas]);

    useFrame((state) => {
        const mesh = localRef.current;
        if (!ctx || !textureRef.current || !mesh) return;

        const w = canvas.width;
        const h = canvas.height;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Jitter Effect (Subtle shaking)
        let jitterX = 0;
        let jitterY = 0;

        if (enableJitter) {
            jitterX = (Math.random() - 0.5) * 2;
            jitterY = (Math.random() - 0.5) * 2;
        }

        // --- DRAWING LOGIC ---

        ctx.save();

        if (inverted) {
            // Draw Button Background (White)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            if (ctx.roundRect) {
                // Draw smaller rect inside canvas to avoid edge clipping?
                // Let's draw full canvas size with radius
                ctx.roundRect(0, 0, w, h, borderRadius);
            } else {
                ctx.rect(0, 0, w, h);
            }
            ctx.fill();

            // Set blend mode to punch holes
            ctx.globalCompositeOperation = 'destination-out';

            // Text Color effectively erases
            ctx.fillStyle = '#000000'; // Color doesn't matter for destination-out
        } else {
            // Normal Text
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
        }

        // Text Font
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw Text Lines
        const lines = text.split('\n');
        const lineHeight = fontSize * 1.0;
        const totalHeight = lines.length * lineHeight;
        const startY = (h - totalHeight) / 2 + lineHeight / 2;

        lines.forEach((line, i) => {
            const lineY = startY + i * lineHeight;

            let shouldDraw = true;
            // Inverted mode: If jitter hides text, it means "don't punch hole" -> solid white button area remains.
            // Normal mode: If jitter hides text, "don't draw" -> transparent area remains.

            // Use same flicker logic
            if (enableJitter && Math.random() < 0.05) {
                shouldDraw = false;
            }

            if (shouldDraw) {
                ctx.fillText(line, w / 2 + jitterX, lineY + jitterY);
            }
        });

        ctx.restore(); // Restore composite operation

        // Update texture
        textureRef.current.needsUpdate = true;
    });

    return (
        <mesh
            ref={localRef}
            position={position}
            rotation={rotation}
            scale={scale}
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            {/* 
                Vertical: 1x4 Aspect Ratio
                Horizontal: 4x1 Aspect Ratio
            */}
            <planeGeometry args={isHorizontal ? [4, 1] : [1, 4]} />
            <meshBasicMaterial
                map={textureRef.current}
                transparent
                // Using props.opacity to initialize, but updates should happen via material ref if needed
                opacity={opacity}
                side={THREE.DoubleSide}
                blending={THREE.NormalBlending}
            />
        </mesh>
    );
});

RetroTextPlane.displayName = 'RetroTextPlane';
