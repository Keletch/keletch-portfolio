import { PolaroidData, getPolaroidImage } from './LifestylePolaroids';

const SPAWN_INTERVAL = 3.0; // Seconds between each new polaroid
const MAX_VISIBLE = 5;

// Caches to hold active polaroids and continuous animation state 
const animStates: Record<string, {
    x: number,
    y: number,
    rot: number,
    scale: number,
    color: number,    // 0 = B&W, 1 = Color
    pixel: number,    // 0.02 = heavy pixelation, 1.0 = full res
    contrast: number, // High contrast
    brightness: number // Brightness boost for blown-out whites
}> = {};

// Active state tracking
interface ActivePolaroid {
    p: PolaroidData;
    age: number;
    indexInSequence: number;
}
export let activePolaroids: ActivePolaroid[] = [];
let spawnTimer = SPAWN_INTERVAL; // Force spawn immediately on next wake
let sequenceCounter = 0;

function easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// Offscreen canvas used for fast downscale pixelation
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

function getOffscreen(): CanvasRenderingContext2D | null {
    if (!offscreenCanvas && typeof document !== 'undefined') {
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = 1024; // Max sensible polaroid res
        offscreenCanvas.height = 1024;
        offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }
    return offscreenCtx;
}

export function updatePolaroids(dt: number, hoveredId: string | null, zoomedId: string | null, tvFocused: boolean, polaroids: PolaroidData[]) {
    if (!tvFocused) {
        activePolaroids = [];
        spawnTimer = SPAWN_INTERVAL;
        sequenceCounter = 0;
        return;
    }

    const LIFESPAN = MAX_VISIBLE * SPAWN_INTERVAL;

    // Handle global spawning - DO NOT pause if just hovering, only pause if zoomed
    if (!zoomedId) {
        spawnTimer += dt;
        while (spawnTimer >= SPAWN_INTERVAL) {
            spawnTimer -= SPAWN_INTERVAL;
            const p = polaroids[sequenceCounter % polaroids.length];
            activePolaroids.push({ p, age: 0, indexInSequence: sequenceCounter });
            sequenceCounter++;
        }
    }

    // Handle individual lifespans
    for (let i = activePolaroids.length - 1; i >= 0; i--) {
        const info = activePolaroids[i];

        // Freeze aging for hovered photos so they don't fade away while interacting.
        // But if it's ZOOMED, we MUST keep aging it, otherwise its animation freezes!
        if (info.p.id === hoveredId && info.p.id !== zoomedId) {
            if (info.age < 1.0) {
                // If popping in, allow it to finish popping in
                info.age = Math.min(1.0, info.age + dt);
            }
        } else {
            // Normal aging for everything else (including the zoomed one)
            info.age += dt;
        }

        // Garbage collect dead polaroids
        if (info.age > LIFESPAN) {
            delete animStates[info.p.id];
            activePolaroids.splice(i, 1);
        }
    }
}

export function drawPolaroids(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    hoveredId: string | null,
    zoomedId: string | null,
    globalProgress: number, // 0 to 1 overall tv focus progress
    globalTime: number,
    globalAlphaMult: number = 1.0
) {
    if (globalProgress <= 0.01) return;

    ctx.save();
    ctx.translate(w / 2, h / 2); // Center drawing

    const LIFESPAN = MAX_VISIBLE * SPAWN_INTERVAL;

    // Draw non-zoomed polaroids using activePolaroids state
    // Draw all background ones first
    activePolaroids.forEach(info => {
        if (info.p.id === zoomedId || info.p.id === hoveredId) return;
        drawSinglePolaroid(ctx, w, h, info.p, false, false, globalProgress, info.age, LIFESPAN, info.indexInSequence, globalTime, globalAlphaMult);
    });

    // Draw hovered one on top of the pile!
    if (hoveredId && hoveredId !== zoomedId) {
        const hoveredInfo = activePolaroids.find(info => info.p.id === hoveredId);
        if (hoveredInfo) {
            drawSinglePolaroid(ctx, w, h, hoveredInfo.p, true, false, globalProgress, hoveredInfo.age, LIFESPAN, hoveredInfo.indexInSequence, globalTime, globalAlphaMult);
        }
    }

    ctx.restore();
}

/** Draw only the zoomed one on top of EVERYTHING */
export function drawZoomedPolaroid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    polaroids: PolaroidData[],
    zoomedId: string | null,
    globalProgress: number,
    globalTime: number,
    globalAlphaMult: number = 1.0
) {
    if (globalProgress <= 0.01 || !zoomedId) return;

    ctx.save();
    ctx.translate(w / 2, h / 2);

    const zoomedInfo = activePolaroids.find(info => info.p.id === zoomedId);
    if (zoomedInfo) {
        // Use the real cached age so it plays its animation natively!
        drawSinglePolaroid(ctx, w, h, zoomedInfo.p, false, true, globalProgress, zoomedInfo.age, MAX_VISIBLE * SPAWN_INTERVAL, zoomedInfo.indexInSequence, globalTime, globalAlphaMult);
    }

    ctx.restore();
}

function drawSinglePolaroid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    p: PolaroidData,
    isHovered: boolean,
    isZoomed: boolean,
    globalProgress: number, // 0 to 1 TV focus fade
    age: number,            // seconds since this polaroid spawned
    lifespan: number,       // total seconds it lives before being pushed out
    indexInSequence: number,
    time: number,
    globalAlphaMult: number
) {
    // 1. Entrance Pop Animation (1.0s duration)
    let popProgress = age / 1.0;
    popProgress = Math.max(0, Math.min(1, popProgress));

    // Retro bouncy pop effect!
    let popScale = easeOutBack(popProgress);

    // 2. Exit Animation (Fades out in the last 1.0s of its lifespan)
    let exitProgress = 0;
    if (!isZoomed) {
        // Only trigger exit fade if we're not actively holding it zoomed
        exitProgress = (age - (lifespan - 1.0)) / 1.0;
        exitProgress = Math.max(0, Math.min(1, exitProgress));
    }
    const exitAlpha = 1.0 - exitProgress;

    // Exit slides down and shrinks
    const exitScale = easeOutBack(1.0 - exitProgress);
    const exitYOffset = exitProgress * (h * 0.2); // Slide down as it fades

    if (exitAlpha <= 0) {
        // Clean up from cache if dead
        delete animStates[p.id];
        return;
    }
    if (popProgress <= 0) return;

    // --- Calculate dynamic TARGET properties ---
    let targetX = p.targetX * w;
    let targetY = p.targetY * h;
    let targetRot = p.targetRot;
    let targetScale = p.scale;

    // Retro Default Visuals (Gritty Doom-style Posterize)
    let targetColor = 1.0;     // Full Color
    let targetPixel = 0.15;    // Chunky pixels
    let targetContrast = 6.0;  // EXTREME contrast to mimic 8-bit limits
    let targetBrightness = 1.3;// Boost whites to crush shadows completely

    // Apply global focus scale/alpha mapping (so they all zoom out neatly when TV unfocuses)
    const focusScale = easeOutBack(globalProgress);
    targetScale *= focusScale;

    // Add subtle floating if not zoomed
    if (!isZoomed && popProgress >= 1) {
        targetX += Math.sin(time * 1.5 + indexInSequence * 10) * 10;
        targetY += Math.cos(time * 1.2 + indexInSequence * 10) * 10;
        targetRot += Math.sin(time * 0.8 + indexInSequence * 10) * 0.02;
    }

    // Exit sliding down
    if (!isZoomed) {
        targetY += exitYOffset;
    }

    // Hover effect
    if (isHovered && !isZoomed) {
        targetScale *= 1.1;
        targetColor = 1.0;  // Becomes color
        targetPixel = 1.0;  // Becomes high res
        targetContrast = 1.0; // Normal graphic contrast
        targetBrightness = 1.0; // Normal brightness
        // User explicitly asked not to straighten on hover: 
        // "y al hacer hover que no se enderecen sin animación" / "que no se enderecen"
    }

    // Zoom state overrides
    if (isZoomed) {
        targetX = 0;
        targetY = 0;
        targetRot = 0;
        targetScale = 0.85; // almost full screen height
        popScale = 1.0; // lock entrance scales

        targetColor = 1.0;   // Color
        targetPixel = 1.0;   // High res
        targetContrast = 1.0; // Normal contrast (No posterize)
        targetBrightness = 1.0;
    }

    // Apply scaling modifiers
    targetScale *= popScale * exitScale;

    // --- Smooth Lerping Engine ---
    if (!animStates[p.id]) {
        // Initialize at target if just born
        animStates[p.id] = {
            x: targetX, y: targetY + 100, rot: targetRot, scale: 0.1,
            color: 1.0, pixel: 0.15, contrast: 6.0, brightness: 1.3
        };
    }
    const state = animStates[p.id];

    // Springlerp coefficient (runs per tick, approx 60fps) - Slower for retro feel
    const lerpPosSpeed = 0.08;
    const lerpRotSpeed = 0.05;
    const lerpScaleSpeed = 0.12;
    const filterLerpSpeed = 0.05; // Even smoother fade for visual filters (depixelation/color)

    state.x += (targetX - state.x) * lerpPosSpeed;
    state.y += (targetY - state.y) * lerpPosSpeed;
    state.rot += (targetRot - state.rot) * lerpRotSpeed;
    state.scale += (targetScale - state.scale) * lerpScaleSpeed;

    state.color += (targetColor - state.color) * filterLerpSpeed;
    state.pixel += (targetPixel - state.pixel) * filterLerpSpeed;
    state.contrast += (targetContrast - state.contrast) * filterLerpSpeed;
    state.brightness += (targetBrightness - state.brightness) * filterLerpSpeed;

    // --- Draw the actual Polaroid shape ---
    ctx.save();

    // Global TV Focus alpha + Local Exit alpha + Overall Flicker multiplier
    ctx.globalAlpha = Math.min(globalProgress, exitAlpha) * globalAlphaMult;

    // Use smoothed coordinates
    ctx.translate(state.x, state.y);
    ctx.rotate(state.rot);

    // Dimensions (1 : 1.15 approx)
    const polWidth = h * state.scale;
    const polHeight = polWidth * 1.15;
    const border = polWidth * 0.05;
    const bottomBorder = polWidth * 0.25;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = isHovered || isZoomed ? 30 : 15;
    ctx.shadowOffsetY = isHovered || isZoomed ? 15 : 8;

    // Base White Card
    ctx.fillStyle = '#fafafa';
    ctx.beginPath();
    ctx.roundRect(-polWidth / 2, -polHeight / 2, polWidth, polHeight, 10);
    ctx.fill();

    // Reset shadow for inner elements
    ctx.shadowColor = 'transparent';

    // Image Area
    const imgWidth = polWidth - border * 2;
    const imgHeight = polHeight - border - bottomBorder;
    const imgX = -polWidth / 2 + border;
    const imgY = -polHeight / 2 + border;

    ctx.fillStyle = '#222';
    ctx.fillRect(imgX, imgY, imgWidth, imgHeight);

    // Load actual image
    const img = getPolaroidImage(p.imagePath);
    if (img && img.complete) {
        ctx.save();

        // Build the CSS filter string
        const grayValue = Math.round((1.0 - state.color) * 100);
        const contValue = Math.round(state.contrast * 100);
        const brightValue = Math.round(state.brightness * 100);
        // By boosting contrast and brightness extremely while grayscale, we get a harsh 1-bit / gritty doom stencil look
        ctx.filter = `grayscale(${grayValue}%) contrast(${contValue}%) brightness(${brightValue}%)`;

        // If not fully high-res, apply pixelation pass
        if (state.pixel < 0.99) {
            const offCtx = getOffscreen();
            if (offCtx && offscreenCanvas) {
                // Determine downscaled block resolution
                const renderW = Math.min(offscreenCanvas.width, Math.max(1, Math.floor(imgWidth * state.pixel)));
                const renderH = Math.min(offscreenCanvas.height, Math.max(1, Math.floor(imgHeight * state.pixel)));

                // Step 1: Draw small on offscreen (smooth downscale)
                offCtx.imageSmoothingEnabled = true;
                offCtx.clearRect(0, 0, renderW, renderH);
                offCtx.drawImage(img, 0, 0, renderW, renderH);

                // Step 2: Draw big on main canvas (nearest neighbor upscale)
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(offscreenCanvas, 0, 0, renderW, renderH, imgX, imgY, imgWidth, imgHeight);
            } else {
                ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight); // Ultimate fallback
            }
        } else {
            // Full res normal draw
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
        }

        ctx.restore();
    }

    // Inner photo border
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(imgX, imgY, imgWidth, imgHeight);

    // Text Caption
    if (popProgress > 0.5) {
        ctx.fillStyle = '#111';
        ctx.font = `bold ${polWidth * 0.06}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textY = (polHeight / 2) - (bottomBorder / 2);

        // Alpha fade for text specifically 
        const textAlpha = (popProgress - 0.5) * 2;
        ctx.globalAlpha = Math.min(ctx.globalAlpha, textAlpha);

        ctx.fillText(p.caption, 0, textY);
    }

    ctx.restore();
}

/**
 * Super simple rectangular hit detection
 * Uses the active polaroids subset so we don't hit test against invisible/dead ones
 */
export function checkPolaroidHit(
    uv: { x: number, y: number },
    w: number,
    h: number,
    polaroids: PolaroidData[],
    zoomedId: string | null,
    hoveredId: string | null,
    invertY: boolean
): string | null {
    const ux = uv.x;
    let uy = uv.y;

    if (invertY) {
        uy = 1.0 - uy;
    }

    const mousePixelX = ux * w - w / 2;
    const mousePixelY = (1.0 - uy) * h - h / 2;

    // Zoomed takes absolute precedence (has hardcoded fullscreen target in visual logic)
    if (zoomedId) {
        const state = animStates[zoomedId];
        if (state) {
            const polWidth = h * state.scale;
            const polHeight = polWidth * 1.15;
            // Zoomed is exactly at 0,0 locally
            if (
                mousePixelX > -polWidth / 2 && mousePixelX < polWidth / 2 &&
                mousePixelY > -polHeight / 2 && mousePixelY < polHeight / 2
            ) {
                return zoomedId;
            }
        }
        return null; // Ignore everything else if there's a zoomed one
    }

    // Hovered takes Z-index precedence over background
    if (hoveredId) {
        const state = animStates[hoveredId];
        if (state) {
            const polWidth = h * state.scale;
            const polHeight = polWidth * 1.15;

            const dx = mousePixelX - state.x;
            const dy = mousePixelY - state.y;
            const cos = Math.cos(-state.rot);
            const sin = Math.sin(-state.rot);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            if (
                localX > -polWidth / 2 && localX < polWidth / 2 &&
                localY > -polHeight / 2 && localY < polHeight / 2
            ) {
                return hoveredId;
            }
        }
    }

    // Loop backwards to check topmost visually of the remaining ones
    for (let i = activePolaroids.length - 1; i >= 0; i--) {
        const info = activePolaroids[i];
        const p = info.p;

        if (p.id === zoomedId || p.id === hoveredId) continue;

        const state = animStates[p.id];
        if (!state) continue;

        const polWidth = h * state.scale;
        const polHeight = polWidth * 1.15;

        // Exactly match the continuous physics engine coordinates
        const dx = mousePixelX - state.x;
        const dy = mousePixelY - state.y;

        const cos = Math.cos(-state.rot);
        const sin = Math.sin(-state.rot);

        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        // Simple AABB on rotated local space
        if (
            localX > -polWidth / 2 && localX < polWidth / 2 &&
            localY > -polHeight / 2 && localY < polHeight / 2
        ) {
            return p.id;
        }
    }

    return null;
}
