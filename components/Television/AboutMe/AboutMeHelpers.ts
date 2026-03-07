export {
    drawPixelCircle,
    drawPixelEllipse,
    drawPixelRoundedRect,
    drawPixelEye,
    drawButtonShockwave,
    drawPlayStopButton,
    drawBackButton,
    drawMenuButton
} from '../Helpers';

export function paginateStory(
    textArr: string[],
    maxWidth: number,
    maxLines: number,
    font: string
): { pages: string[], paragraphMap: number[] } {
    const pages: string[] = [];
    const paragraphMap: number[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { pages: [], paragraphMap: [] };
    ctx.font = font;

    textArr.forEach((paragraph, pIndex) => {
        const words = paragraph.split(' ');
        let line = '';
        const lines: string[] = [];

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                lines.push(line);
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        for (let i = 0; i < lines.length; i += maxLines) {
            const pageLines = lines.slice(i, i + maxLines);
            pages.push(pageLines.join('\n'));
            paragraphMap.push(pIndex);
        }
    });

    return { pages, paragraphMap };
}

// ---------- NEW 3D CANVAS ANIMATIONS WITH CHROMATIC ABERRATION ----------

let _offCanvas: HTMLCanvasElement | null = null;
let _offCtx: CanvasRenderingContext2D | null = null;

function getOffCtx(width: number, height: number): CanvasRenderingContext2D {
    // Return a mocked dummy fallback for SSR since document does not exist server-side
    if (typeof document === 'undefined') return null as any;

    if (!_offCanvas) {
        _offCanvas = document.createElement('canvas');
        _offCtx = _offCanvas.getContext('2d');
    }
    if (_offCanvas.width !== width || _offCanvas.height !== height) {
        _offCanvas.width = width;
        _offCanvas.height = height;
    }
    return _offCtx!;
}

// Helper to draw XOR layers on an offscreen canvas for complex composite effects
function drawXORLayer(
    mainCtx: CanvasRenderingContext2D,
    masterAlpha: number,
    color: string,
    ox: number, oy: number,
    drawBase: (oCtx: CanvasRenderingContext2D) => void,
    drawOver: (oCtx: CanvasRenderingContext2D) => void
) {
    const oCtx = getOffCtx(mainCtx.canvas.width, mainCtx.canvas.height);
    if (!oCtx) return;

    oCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);
    oCtx.save();

    const t = mainCtx.getTransform();
    oCtx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
    oCtx.translate(ox, oy);

    oCtx.globalCompositeOperation = 'source-over';
    oCtx.fillStyle = color;
    oCtx.strokeStyle = color;
    oCtx.globalAlpha = 1.0;
    oCtx.beginPath();
    drawBase(oCtx);
    oCtx.fill();

    oCtx.globalCompositeOperation = 'xor';
    oCtx.beginPath();
    drawOver(oCtx);

    oCtx.restore();

    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.globalAlpha = masterAlpha;
    mainCtx.drawImage(oCtx.canvas, 0, 0);
    mainCtx.restore();
}

const perspective = 400;

function project3D(x: number, y: number, z: number, rotX: number, rotY: number, rotZ: number) {
    // Rotate Z
    let x1 = x * Math.cos(rotZ) - y * Math.sin(rotZ);
    let y1 = x * Math.sin(rotZ) + y * Math.cos(rotZ);
    let z1 = z;

    // Rotate X
    let y2 = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
    let z2 = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);

    // Rotate Y
    let x3 = x1 * Math.cos(rotY) + z2 * Math.sin(rotY);
    let z3 = -x1 * Math.sin(rotY) + z2 * Math.cos(rotY);

    const scale = perspective / (perspective + z3);
    return {
        px: x3 * scale,
        py: y2 * scale,
        scale,
        z: z3
    };
}

// Applies RGB channel separation to any path geometry to create chromatic aberration
function withAberration(
    ctx: CanvasRenderingContext2D,
    alpha: number,
    offset: number,
    lineWidth: number,
    drawGeometry: () => void,
    isFill: boolean = false
) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const drawChannel = (color: string, ox: number, oy: number) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        drawGeometry();
        if (isFill) {
            ctx.fillStyle = color;
            ctx.fill();
        } else {
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = color;
            ctx.stroke();
        }
        ctx.restore();
    };

    drawChannel('#ff0000', -offset, 0);
    drawChannel('#00ff00', 0, 0);
    drawChannel('#0000ff', offset, 0);

    ctx.restore();
}

// 1. The Journey: Hyperdimensional Tesseract (4D projection with XOR)
export function drawNeuralMesh(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.translate(0, 80);
    const masterAlpha = ctx.globalAlpha;

    const rotX = time * 0.15;
    const rotY = time * 0.25;

    // Hypercube vertex generation
    const v4: number[][] = [];
    for (let i = 0; i < 16; i++) {
        v4.push([
            (i & 1) ? 1 : -1,
            (i & 2) ? 1 : -1,
            (i & 4) ? 1 : -1,
            (i & 8) ? 1 : -1
        ]);
    }

    // Hypercube face generation
    const faces: number[][] = [];
    for (let d1 = 0; d1 < 3; d1++) {
        for (let d2 = d1 + 1; d2 < 4; d2++) {
            for (let sign1 = 0; sign1 < 2; sign1++) {
                for (let sign2 = 0; sign2 < 2; sign2++) {
                    const mask = (1 << d1) | (1 << d2);
                    const base = (sign1 << d1) | (sign2 << d2);
                    const faceNodes = [];
                    for (let i = 0; i < 16; i++) {
                        if ((i & mask) === base) {
                            faceNodes.push(i);
                        }
                    }
                    if (faceNodes.length === 4) {
                        const f0 = faceNodes[0];
                        const temp = faceNodes[2];
                        faceNodes[2] = faceNodes[3];
                        faceNodes[3] = temp;
                        faces.push(faceNodes);
                    }
                }
            }
        }
    }


    ctx.globalCompositeOperation = 'screen';

    const drawChannel = (color: string, ox: number, oy: number) => {
        drawXORLayer(ctx, masterAlpha * 0.8, color, ox, oy,
            () => { },
            (oCtx) => {
                const projectedNodes: { px: number, py: number, scale: number }[] = [];

                // 4D to 3D rotation and projection
                for (let i = 0; i < 16; i++) {
                    const v = v4[i];
                    const th = time * 0.8;

                    // Rotate XW
                    let x = v[0] * Math.cos(th) - v[3] * Math.sin(th);
                    let w = v[0] * Math.sin(th) + v[3] * Math.cos(th);
                    // Rotate YZ
                    let y = v[1] * Math.cos(th * 0.7) - v[2] * Math.sin(th * 0.7);
                    let z = v[1] * Math.sin(th * 0.7) + v[2] * Math.cos(th * 0.7);

                    const w_proj = 1.0 / (2.5 - w);
                    const p3x = x * w_proj * 75;
                    const p3y = y * w_proj * 75;
                    const p3z = z * w_proj * 75;

                    const p = project3D(p3x, p3y, p3z, rotX, rotY, 0);
                    projectedNodes.push(p);
                }

                oCtx.beginPath();
                for (let f = 0; f < faces.length; f++) {
                    const face = faces[f];
                    oCtx.moveTo(projectedNodes[face[0]].px, projectedNodes[face[0]].py);
                    for (let n = 1; n < 4; n++) {
                        oCtx.lineTo(projectedNodes[face[n]].px, projectedNodes[face[n]].py);
                    }
                    oCtx.closePath();
                }
                oCtx.fill('evenodd');
            }
        );
    };

    drawChannel('#ff0000', -1.5, 0);
    drawChannel('#00ff00', 0, 0);
    drawChannel('#0000ff', 1.5, 0);

    ctx.restore();
}

// 2. The Versatility: Morphing 3D Lissajous Knot with XOR
export function drawLiquidMetal(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.translate(0, 80);
    const masterAlpha = ctx.globalAlpha;

    ctx.globalCompositeOperation = 'screen';

    const drawChannel = (color: string, ox: number, oy: number) => {
        drawXORLayer(ctx, masterAlpha * 0.9, color, ox, oy,
            () => { },
            (oCtx) => {
                oCtx.beginPath();
                const numPoints = 180;

                for (let i = 0; i <= numPoints; i++) {
                    const t = (i / numPoints) * Math.PI * 2;

                    const a = 3;
                    const b = 4;
                    const c = 5;
                    const delta = time * 0.6;

                    const x = Math.sin(a * t + delta) * 85;
                    const y = Math.sin(b * t) * 85;
                    const z = Math.sin(c * t + time * 0.2) * 85;

                    const p = project3D(x, y, z, time * 0.1, time * 0.15, time * 0.05);

                    if (i === 0) oCtx.moveTo(p.px, p.py);
                    else oCtx.lineTo(p.px, p.py);
                }
                oCtx.closePath();
                oCtx.fill('evenodd');

                // Secondary halo ring
                oCtx.beginPath();
                for (let i = 0; i <= 64; i++) {
                    const t = (i / 64) * Math.PI * 2;
                    const r = 100;
                    const p = project3D(Math.cos(t) * r, Math.sin(t) * r, 0, time * 0.1, time * 0.2, time * 0.05);
                    if (i === 0) oCtx.moveTo(p.px, p.py);
                    else oCtx.lineTo(p.px, p.py);
                }
                oCtx.closePath();
                oCtx.lineWidth = 1.5;
                oCtx.stroke();
            }
        );
    };

    drawChannel('#ff0000', -1.5, 0);
    drawChannel('#00ff00', 0, 0);
    drawChannel('#0000ff', 1.5, 0);

    ctx.restore();
}

// 3. Hyper Pulse: Bouncing spheres with XOR intersections
export function drawHyperPulse(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.translate(0, 80);
    const masterAlpha = ctx.globalAlpha;
    const numSpheres = 18;
    const bounds = 90;
    const rotX = Math.sin(time * 0.2) * 0.5;
    const rotY = time * 0.3;

    const drawXORSpheres = (renderCtx: CanvasRenderingContext2D) => {
        for (let i = 0; i < numSpheres; i++) {
            const x = Math.sin(time * 0.8 + i * 1.2) * bounds;
            const y = Math.cos(time * 0.7 + i * 2.3) * bounds;
            const z = Math.sin(time * 0.9 + i * 3.4) * bounds;

            const r = 25 + Math.sin(time * 3 + i) * 10;
            const p = project3D(x, y, z, rotX, rotY, 0);

            renderCtx.moveTo(p.px + r * p.scale, p.py);
            renderCtx.arc(p.px, p.py, r * p.scale, 0, Math.PI * 2);
        }
    };

    ctx.globalCompositeOperation = 'screen';

    const drawChannel = (color: string, ox: number, oy: number) => {
        drawXORLayer(ctx, masterAlpha * 0.8, color, ox, oy,
            () => { },
            (oCtx) => {
                drawXORSpheres(oCtx);
                oCtx.fill('evenodd');
            }
        );
    };

    drawChannel('#ff0000', -1.5, 0);
    drawChannel('#00ff00', 0, 0);
    drawChannel('#0000ff', 1.5, 0);

    ctx.restore();
}

// 4. Audio Waveform: Multi-sine crossing bands with XOR
export function drawAudioWaveform(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.translate(0, 80);
    const masterAlpha = ctx.globalAlpha;

    const rotX = 0;
    const rotY = 0;

    ctx.globalCompositeOperation = 'screen';

    const drawChannel = (color: string, ox: number, oy: number) => {
        drawXORLayer(ctx, masterAlpha * 0.9, color, ox, oy,
            () => { },
            (oCtx) => {
                const numWaves = 4;
                const pointsPerLine = 120;

                for (let w = 0; w < numWaves; w++) {
                    oCtx.beginPath();

                    const phaseOffset = w * Math.PI * 0.8;
                    const freqSpeed = 1.5 + (w * 0.2);
                    const amplitude = 40 + Math.sin(time + w) * 20;

                    const bandThickness = 4;

                    for (let j = 0; j <= pointsPerLine; j++) {
                        const xBase = (j / pointsPerLine) * 1000 - 500;

                        const envelope = Math.sin((j / pointsPerLine) * Math.PI);

                        let y = Math.sin(xBase * 0.015 + time * freqSpeed + phaseOffset) * amplitude * envelope;

                        const p = project3D(xBase, y - bandThickness / 2, 0, rotX, rotY, 0);
                        if (j === 0) oCtx.moveTo(p.px, p.py);
                        else oCtx.lineTo(p.px, p.py);
                    }

                    for (let j = pointsPerLine; j >= 0; j--) {
                        const xBase = (j / pointsPerLine) * 1000 - 500;
                        const envelope = Math.sin((j / pointsPerLine) * Math.PI);

                        let y = Math.sin(xBase * 0.015 + time * freqSpeed + phaseOffset) * amplitude * envelope;

                        const p = project3D(xBase, y + bandThickness / 2, 0, rotX, rotY, 0);
                        oCtx.lineTo(p.px, p.py);
                    }

                    oCtx.closePath();
                    oCtx.fill('evenodd');
                }
            }
        );
    };

    drawChannel('#ff0000', -1.5, 0);
    drawChannel('#00ff00', 0, 0);
    drawChannel('#0000ff', 1.5, 0);

    ctx.restore();
}

// 5. The Ecosystem: Isometric Hexagonal Data Grid (Honeycomb drip logic)
export function drawOrbitalRings(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.translate(0, 85);
    const masterAlpha = ctx.globalAlpha;

    const rotX = 0.85;
    const rotY = 0.0;

    ctx.globalCompositeOperation = 'screen';

    const drawChannel = (color: string, ox: number, oy: number) => {
        drawXORLayer(ctx, masterAlpha * 0.9, color, ox, oy,
            () => { },
            (oCtx) => {
                const hexRadius = 14;
                const xSpacing = hexRadius * Math.sqrt(3);
                const ySpacing = hexRadius * 1.5;

                const drawHexagonAt = (px: number, py: number, pz: number, scale: number) => {
                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
                        const hx = px + Math.cos(angle) * (hexRadius - 1) * scale;
                        const hz = pz + Math.sin(angle) * (hexRadius - 1) * scale;

                        const p = project3D(hx, py, hz, rotX, rotY, 0);
                        if (i === 0) oCtx.moveTo(p.px, p.py);
                        else oCtx.lineTo(p.px, p.py);
                    }
                    oCtx.closePath();
                };

                for (let q = -4; q <= 4; q++) {
                    for (let r = -4; r <= 4; r++) {
                        if (Math.abs(q + r) <= 4) {
                            const px = xSpacing * (q + r / 2);
                            const pz = ySpacing * r;

                            const dist = Math.sqrt(q * q + r * r + (q + r) * (q + r));

                            const normalizedSine = (Math.sin(time * 3 - dist * 0.5) + 1) / 2;

                            const dropIntensity = Math.pow(normalizedSine, 8);

                            const py = -dropIntensity * 75;

                            oCtx.beginPath();
                            drawHexagonAt(px, py, pz, 1.0);

                            const innerScale = 0.5 + 0.5 * Math.sin(time * 3 + q * 1.5 + r * 1.5);
                            if (innerScale > 0) {
                                drawHexagonAt(px, py, pz, innerScale);
                            }

                            oCtx.fill('evenodd');
                        }
                    }
                }
            }
        );
    };

    drawChannel('#ff0000', -1.5, 0);
    drawChannel('#00ff00', 0, 0);
    drawChannel('#0000ff', 1.5, 0);

    ctx.restore();
}
