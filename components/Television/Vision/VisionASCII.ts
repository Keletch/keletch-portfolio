const ASCII_DECORATIVE = '{}[]()<>=/+-*&|!?;:.,_@#$%^~abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface SphereChar {
    theta: number;
    phi: number;
    char: string;
    paragraphIdx: number;
    targetX: number;
    targetY: number;
    state: 'sphere' | 'leaving' | 'text' | 'returning';
    progress: number;
    delay: number;
    speed: number;
}

export interface SphereWave {
    startTime: number;
    char: string;
}

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function computeCharPositions(
    text: string,
    centerX: number,
    centerY: number,
    maxWidth: number,
    lineHeight: number,
    font: string,
    ctx: CanvasRenderingContext2D
): { x: number; y: number; char: string }[] {
    ctx.save();
    ctx.font = font;

    const targets: { x: number; y: number; char: string }[] = [];

    // Basic word wrap logic
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);

    const totalHeight = lines.length * lineHeight;
    const startY = centerY - totalHeight / 2;

    for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const lineWidth = ctx.measureText(line).width;
        const lineStartX = centerX - lineWidth / 2;
        const y = startY + li * lineHeight + lineHeight / 2;

        let xOff = 0;
        for (let ci = 0; ci < line.length; ci++) {
            const ch = line[ci];
            const chWidth = ctx.measureText(ch).width;
            if (ch !== ' ') {
                targets.push({
                    x: lineStartX + xOff + chWidth / 2,
                    y,
                    char: ch
                });
            }
            xOff += chWidth;
        }
    }

    ctx.restore();
    return targets;
}

export function buildSphereSystem(
    stories: string[],
    textCenterX: number,
    textCenterY: number,
    textMaxWidth: number,
    textLineHeight: number,
    textFont: string
): SphereChar[] {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const rng = seededRandom(42);

    const allChars: { char: string; x: number; y: number; paragraphIdx: number }[] = [];

    stories.forEach((text, pIdx) => {
        const targets = computeCharPositions(
            text, textCenterX, textCenterY,
            textMaxWidth, textLineHeight, textFont, ctx
        );
        targets.forEach(t => {
            allChars.push({ ...t, paragraphIdx: pIdx });
        });
    });

    const numParaChars = allChars.length;
    const totalSlots = Math.max(Math.ceil(numParaChars * 1.2), 400);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    const slots: { theta: number; phi: number }[] = [];
    for (let i = 0; i < totalSlots; i++) {
        const theta = Math.acos(1 - 2 * (i + 0.5) / totalSlots);
        const phi = goldenAngle * i;
        slots.push({ theta, phi });
    }

    for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    const sphereChars: SphereChar[] = [];

    for (let i = 0; i < numParaChars; i++) {
        const slot = slots[i % slots.length];
        const pc = allChars[i];
        sphereChars.push({
            theta: slot.theta,
            phi: slot.phi,
            char: pc.char,
            paragraphIdx: pc.paragraphIdx,
            targetX: pc.x,
            targetY: pc.y,
            state: 'sphere',
            progress: 0,
            delay: 0,
            speed: 1
        });
    }

    for (let i = numParaChars; i < slots.length; i++) {
        const slot = slots[i];
        sphereChars.push({
            theta: slot.theta,
            phi: slot.phi,
            char: ASCII_DECORATIVE[Math.floor(rng() * ASCII_DECORATIVE.length)],
            paragraphIdx: -1,
            targetX: 0,
            targetY: 0,
            state: 'sphere',
            progress: 0,
            delay: 0,
            speed: 1
        });
    }

    return sphereChars;
}

export function activateParagraph(chars: SphereChar[], paragraphIdx: number): void {
    const rng = seededRandom(paragraphIdx * 100 + 7);
    let count = 0;
    const total = chars.filter(c => c.paragraphIdx === paragraphIdx).length;

    for (const c of chars) {
        if (c.paragraphIdx === paragraphIdx) {
            c.state = 'leaving';
            c.progress = 0;
            c.delay = (count / total) * 0.8 + rng() * 0.15;
            c.speed = 0.8 + rng() * 0.4;
            count++;
        }
    }
}

export function returnParagraph(chars: SphereChar[], paragraphIdx: number): void {
    const rng = seededRandom(paragraphIdx * 200 + 13);
    let count = 0;
    const total = chars.filter(c => c.paragraphIdx === paragraphIdx && (c.state === 'text' || c.state === 'leaving')).length;

    for (const c of chars) {
        if (c.paragraphIdx === paragraphIdx && (c.state === 'text' || c.state === 'leaving')) {
            c.state = 'returning';
            c.progress = 0;
            c.delay = (count / Math.max(total, 1)) * 0.5 + rng() * 0.1;
            c.speed = 1.0 + rng() * 0.3;
            count++;
        }
    }
}

export function resetAllChars(chars: SphereChar[]): void {
    for (const c of chars) {
        c.state = 'sphere';
        c.progress = 0;
    }
}

export function updateSphereChars(
    chars: SphereChar[],
    delta: number,
    elapsed: number
): { allLeavingDone: boolean; allReturningDone: boolean } {
    let allLeavingDone = true;
    let allReturningDone = true;
    const baseSpeed = 1.5;

    for (const c of chars) {
        if (c.state === 'leaving') {
            if (elapsed < c.delay) {
                allLeavingDone = false;
                continue;
            }
            c.progress += delta * baseSpeed * c.speed;
            if (c.progress >= 1) {
                c.progress = 1;
                c.state = 'text';
            } else {
                allLeavingDone = false;
            }
        } else if (c.state === 'returning') {
            if (elapsed < c.delay) {
                allReturningDone = false;
                continue;
            }
            c.progress += delta * baseSpeed * c.speed;
            if (c.progress >= 1) {
                c.progress = 1;
                c.state = 'sphere';
            } else {
                allReturningDone = false;
            }
        }
    }

    return { allLeavingDone, allReturningDone };
}

export function drawSphereSystem(
    ctx: CanvasRenderingContext2D,
    chars: SphereChar[],
    time: number,
    opacity: number,
    centerX: number,
    centerY: number,
    radius: number,
    color: string,
    fontSize: number = 12,
    waves: SphereWave[] = [],
    textFontSize: number = 14
) {
    if (opacity <= 0.01 || chars.length === 0) return;

    ctx.save();

    const angleY = time * 0.25;
    const angleX = time * 0.1 + 0.3;
    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    const cosX = Math.cos(angleX), sinX = Math.sin(angleX);

    const items: { x: number; y: number; a: number; z: number; ch: string; fs: number }[] = [];

    for (const c of chars) {
        let x = Math.sin(c.theta) * Math.cos(c.phi);
        let y = Math.sin(c.theta) * Math.sin(c.phi);
        let z = Math.cos(c.theta);

        let tmp = x * cosY + z * sinY;
        z = -x * sinY + z * cosY;
        x = tmp;

        tmp = y * cosX - z * sinX;
        z = y * sinX + z * cosX;
        y = tmp;

        const fov = 3.0;
        const s = fov / (fov + z);
        const sx = centerX + x * radius * s;
        const sy = centerY + y * radius * s;

        const nz = (z + 1) / 2;
        const bright = nz * nz * 0.9 + 0.03;

        let dx: number, dy: number, da: number;
        const sphereFontSize = fontSize * 1.15;
        let fs = fontSize;
        const depthScale = 0.8 + nz * 0.4;

        switch (c.state) {
            case 'sphere':
                dx = sx; dy = sy;
                da = opacity * bright;
                break;
            case 'leaving': {
                const p = easeOutCubic(c.progress);
                dx = sx + (c.targetX - sx) * p;
                dy = sy + (c.targetY - sy) * p;
                da = opacity * (bright * (1 - p) + p);
                break;
            }
            case 'text':
                dx = c.targetX; dy = c.targetY;
                da = opacity;
                fs = textFontSize;
                break;
            case 'returning': {
                const p = easeOutCubic(c.progress);
                dx = c.targetX + (sx - c.targetX) * p;
                dy = c.targetY + (sy - c.targetY) * p;
                da = opacity * ((1 - p) + bright * p);
                break;
            }
        }

        if (da < 0.04) continue;

        let displayChar = c.char;
        const charSeed = c.theta * 100 + c.phi * 50;

        if (c.state === 'sphere') {
            const idx = Math.floor(Math.abs(Math.sin(charSeed + time * 0.12)) * ASCII_DECORATIVE.length) % ASCII_DECORATIVE.length;
            displayChar = ASCII_DECORATIVE[idx];
            fs = sphereFontSize * depthScale;

            for (const wave of waves) {
                const elapsed = time - wave.startTime;
                const waveDuration = 2.5;
                if (elapsed < 0 || elapsed > waveDuration + 0.3) continue;
                const waveFront = (elapsed / waveDuration) * Math.PI;
                const bandWidth = 0.3;
                const dist = Math.abs(c.theta - waveFront);
                if (dist < bandWidth) {
                    displayChar = wave.char;
                    const intensity = 1.0 - (dist / bandWidth);
                    da = Math.max(da, opacity * (0.7 + intensity * 0.3));
                }
            }
        } else if (c.state === 'leaving') {
            const p = easeOutCubic(c.progress);
            fs = sphereFontSize * depthScale + (textFontSize - sphereFontSize * depthScale) * p;
            if (c.progress < 0.75) {
                const idx = Math.floor(Math.abs(Math.sin(charSeed + time * 2)) * ASCII_DECORATIVE.length) % ASCII_DECORATIVE.length;
                displayChar = ASCII_DECORATIVE[idx];
            } else {
                const lockChance = (c.progress - 0.75) * 4;
                const flicker = Math.sin(time * 12 + charSeed) > lockChance * 2 - 1;
                if (flicker) {
                    const idx = Math.floor(Math.abs(Math.sin(charSeed + time * 2)) * ASCII_DECORATIVE.length) % ASCII_DECORATIVE.length;
                    displayChar = ASCII_DECORATIVE[idx];
                }
            }
        } else if (c.state === 'returning') {
            const p = easeOutCubic(c.progress);
            fs = textFontSize + (sphereFontSize - textFontSize) * p;
            if (c.progress > 0.3) {
                const idx = Math.floor(Math.abs(Math.sin(charSeed + time * 0.15)) * ASCII_DECORATIVE.length) % ASCII_DECORATIVE.length;
                displayChar = ASCII_DECORATIVE[idx];
            }
        }

        items.push({ x: dx, y: dy, a: da, z, ch: displayChar, fs });
    }

    items.sort((a, b) => a.z - b.z);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    let lastFs = -1;
    for (const it of items) {
        if (it.fs !== lastFs) {
            ctx.font = `bold ${Math.round(it.fs)}px "Courier New", monospace`;
            lastFs = it.fs;
        }
        ctx.globalAlpha = it.a;
        ctx.fillText(it.ch, it.x, it.y);
    }

    ctx.restore();
}
