let _offCanvas: HTMLCanvasElement | null = null;
let _offCtx: CanvasRenderingContext2D | null = null;

function getOffCtx(width: number, height: number): CanvasRenderingContext2D {
    if (typeof document === 'undefined') return {} as CanvasRenderingContext2D;
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

function drawXORLayer(
    mainCtx: CanvasRenderingContext2D,
    color: string,
    ox: number, oy: number,
    drawFunc: (oCtx: CanvasRenderingContext2D) => void
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
    drawFunc(oCtx);

    oCtx.restore();

    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.drawImage(oCtx.canvas, 0, 0);
    mainCtx.restore();
}

export function drawAbstractGamesAnimation(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    hover: number, 
    color: string, 
    time: number
) {
    const size = 60 + hover * 110; 
    ctx.save();
    
    ctx.globalCompositeOperation = 'screen';

    const drawGeometry = (oCtx: CanvasRenderingContext2D) => {
        oCtx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 4; i+=2) {
            oCtx.save();
            oCtx.rotate(time * (0.4 + i * 0.25));
            const s = size * (0.3 + i * 0.2);
            oCtx.fillRect(-s / 2, -s / 2, s, s);
            oCtx.restore();
        }
        
        oCtx.globalCompositeOperation = 'xor';
        for (let i = 1; i < 4; i+=2) {
            oCtx.save();
            oCtx.rotate(time * (0.4 + i * 0.25));
            const s = size * (0.3 + i * 0.2);
            oCtx.fillRect(-s / 2, -s / 2, s, s);
            oCtx.restore();
        }

        const bitCount = 10;
        for (let j = 0; j < bitCount; j++) {
            oCtx.globalCompositeOperation = j % 2 === 0 ? 'source-over' : 'xor';
            const angle = (j / bitCount) * Math.PI * 2 + time * 0.8;
            const radius = size * 0.8 + Math.sin(time * 3 + j) * 12;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            const bitSize = 8 + Math.sin(time * 5 + j) * 2;
            oCtx.fillRect(px - bitSize / 2, py - bitSize / 2, bitSize, bitSize);
        }
    };

    drawXORLayer(ctx, '#ff0000', x - 2, y, drawGeometry);
    drawXORLayer(ctx, '#00ff00', x, y, drawGeometry);
    drawXORLayer(ctx, '#0000ff', x + 2, y, drawGeometry);

    ctx.restore();
}

export function drawPortalAnimation(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hover: number,
    color: string,
    time: number
) {
    const P = 5; 
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const drawGeometry = (oCtx: CanvasRenderingContext2D) => {
        oCtx.globalCompositeOperation = 'source-over';
        
        const portalH = 26;
        const portalOffset = 24;

        const drawPixelPortal = (cx: number, cy: number, pColor: string, isBlue: boolean) => {
            const w = 4;
            const frame = Math.floor(time * 12); 
            
            for (let py = -portalH/2; py <= portalH/2; py++) {
                for (let px = -w; px <= w; px++) {
                    const dist = (px*px) / (w*w) + (py*py) / ((portalH/2)*(portalH/2));
                    if (dist <= 1.0) {
                        const noise = (Math.sin(px * 12.3 + py * 4.5 + frame * (isBlue ? 0.7 : -0.7)) + 1) / 2;
                        
                        let fill = pColor;
                        if (dist < 0.3 && noise > 0.3) fill = '#ffffff'; 
                        else if (dist < 0.6 && noise > 0.4) fill = isBlue ? '#88ccff' : '#ffcc88'; 
                        
                        if (dist > 0.8 && noise < 0.6) continue; 
                        
                        oCtx.fillStyle = fill;
                        oCtx.globalAlpha = (hover > 0 && noise > 0.8) ? 1.0 : (0.7 + hover * 0.3);
                        oCtx.fillRect((cx + px) * P, (cy + py) * P, P, P);
                    }
                }
            }
        };

        const drawSprite = (sx: number, sy: number) => {
            const sprite = [
                " WWWWWW ",
                "WLLLLLLW",
                "WLPLLPLW",
                "WLPPPPLW",
                "WLLPPLLW",
                "WLLLLLLW",
                "WLLLLLLW",
                " WWWWWW "
            ];
            const palette: Record<string, string> = {
                'W': '#ffffff',
                'L': '#aaaaaa',
                'P': '#ff0055',
                ' ': '#777777'
            };
            
            oCtx.globalAlpha = 1.0;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const char = sprite[r][c];
                    if (palette[char]) {
                        oCtx.fillStyle = palette[char];
                        oCtx.fillRect(Math.floor(sx + c - 4) * P, Math.floor(sy + r - 4) * P, P, P);
                    }
                }
            }
        };

        oCtx.save();
        oCtx.beginPath();
        oCtx.rect(-portalOffset * P, -30 * P, portalOffset * 2 * P, 60 * P);
        oCtx.clip();

        const cycleDist = portalOffset * 2; 
        const frameCycle = Math.floor(time * 12 * 1.5) % cycleDist; 
        
        const objX = -portalOffset + frameCycle;
        const objY = Math.floor(Math.sin((frameCycle / cycleDist) * Math.PI * 4) * 4);

        drawSprite(objX - cycleDist, objY);
        drawSprite(objX, objY);
        drawSprite(objX + cycleDist, objY);

        oCtx.restore();

        drawPixelPortal(-portalOffset, 0, '#0088ff', true);
        drawPixelPortal(portalOffset, 0, '#ff6600', false);

        const pFrame = Math.floor(time * (10 + hover * 8));
        for(let i=0; i<15; i++) {
            const isBlue = i % 2 === 0;
            const dist = (pFrame + i * 5) % 24;
            const pX = isBlue ? -portalOffset + dist : portalOffset - dist;
            const pY = Math.floor(Math.sin(i * 123) * 14 * (1 - dist/24));
            
            oCtx.fillStyle = isBlue ? '#0088ff' : '#ff6600';
            oCtx.globalAlpha = 0.5 + Math.random() * 0.5;
            oCtx.fillRect(pX * P, pY * P, P, P);
        }
    };

    const ab = 2 + hover * 5; 
    drawXORLayer(ctx, '#ff0000', x - ab, y - ab * 0.5, drawGeometry);
    drawXORLayer(ctx, '#00ff00', x, y, drawGeometry);
    drawXORLayer(ctx, '#0000ff', x + ab, y + ab * 0.5, drawGeometry);

    ctx.restore();
}
