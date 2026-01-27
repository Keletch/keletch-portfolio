export function drawPixelCircle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pixelSize: number
) {
    const steps = Math.ceil(radius / pixelSize) * pixelSize;

    ctx.beginPath();
    for (let y = -steps; y <= steps; y += pixelSize) {
        for (let x = -steps; x <= steps; x += pixelSize) {
            if (x * x + y * y <= radius * radius) {
                ctx.rect(Math.floor(cx + x), Math.floor(cy + y), pixelSize, pixelSize);
            }
        }
    }
    ctx.fill();
}

export function drawPixelEllipse(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    pixelSize: number
) {
    const stepX = Math.ceil(rx / pixelSize) * pixelSize;
    const stepY = Math.ceil(ry / pixelSize) * pixelSize;

    ctx.beginPath();
    for (let y = -stepY; y <= stepY; y += pixelSize) {
        for (let x = -stepX; x <= stepX; x += pixelSize) {
            if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
                ctx.rect(Math.floor(cx + x), Math.floor(cy + y), pixelSize, pixelSize);
            }
        }
    }
    ctx.fill();
}

export function drawPixelRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
}

export function drawPixelEye(
    ctx: CanvasRenderingContext2D,
    mousePos: { x: number; y: number },
    irisColor: string = '#5090ff',
    lookRange: number = 26,
    scleraColor: string = '#ffffff',
    isHologram: boolean = false
) {
    const pixelSize = 8;
    const pupilX = mousePos.x * lookRange;
    const pupilY = -mousePos.y * lookRange;

    ctx.fillStyle = scleraColor;
    if (isHologram) {
        ctx.strokeStyle = irisColor;
        ctx.lineWidth = 2;
    }

    ctx.shadowBlur = 8;
    ctx.shadowColor = isHologram ? irisColor : "rgba(255,255,255,0.5)";
    drawPixelEllipse(ctx, 0, 0, 80, 60, pixelSize);
    ctx.shadowBlur = 0;

    ctx.fillStyle = irisColor;
    drawPixelCircle(ctx, pupilX, pupilY, 28, pixelSize);

    ctx.fillStyle = isHologram ? 'rgba(0, 50, 0, 0.8)' : '#000000';
    drawPixelCircle(ctx, pupilX, pupilY, 12, pixelSize);

    ctx.fillStyle = '#ffffff';
    drawPixelCircle(ctx, pupilX + 6, pupilY - 6, 6, pixelSize);
}

export function drawButtonShockwave(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hoverProgress: number,
    time: number,
    color: string = '#ffffff'
) {
    const fps = 8;
    const steppedTime = Math.floor(time * fps) / fps;
    const waveProgress = (steppedTime % 2.0) / 2.0;

    const maxRippleSize = 25;
    const rippleRadius = 10 + (waveProgress * maxRippleSize);

    const interactionAlpha = Math.max(0, 1 - (hoverProgress * 5));
    const rippleAlpha = Math.max(0, 1.0 - waveProgress) * interactionAlpha;

    if (rippleAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = rippleAlpha;
        ctx.beginPath();
        ctx.arc(x, y, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}

export function drawPlayPauseButton(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    morphProgress: number,
    color: string = '#ffffff'
) {
    const p = hoverProgress;
    const m = morphProgress; // 0 = play (triangle), 1 = pause (two bars)

    const r = 8 + (5 * p);

    ctx.globalAlpha = 0.8;

    const startK = 0.77;
    const endK = 0.25;
    const k = startK * (1 - p) + endK * p;

    let jx = 0;
    let jy = 0;
    if (p > 0.8) {
        jx = (Math.random() - 0.5) * 3 * p;
        jy = (Math.random() - 0.5) * 3 * p;
    }
    const cx = btnX + jx;
    const cy = btnY + jy;

    ctx.fillStyle = color;
    ctx.globalCompositeOperation = 'source-over';

    const barWidth = r * 0.6;
    const barHeight = r * 2.2;
    const barSpacing = r * 0.8;

    // Phase 1: Triangle morphs to single generic vertical bar
    // We'll morph the triangle into a rectangle (the left bar)

    // Triangle vertices
    const triV0 = { x: r, y: 0 };
    const triV1 = { x: -0.5 * r, y: -0.866 * r };
    const triV2 = { x: -0.5 * r, y: 0.866 * r };

    // Left Bar target vertices (centered for the single bar phase)
    // When m=0.5, it should be a single bar.
    // Ideally at m=1.0, the left bar is at -barSpacing/2
    // So let's define the single bar at center first.
    const rectV0 = { x: barWidth / 2, y: -barHeight / 2 }; // top-right
    const rectV1 = { x: -barWidth / 2, y: -barHeight / 2 }; // top-left
    const rectV2 = { x: -barWidth / 2, y: barHeight / 2 }; // bottom-left
    const rectV3 = { x: barWidth / 2, y: barHeight / 2 }; // bottom-right

    // Morph Logic
    if (m <= 0.5) {
        // Phase 1: Triangle -> Single Center Bar
        // Normalize m to 0-1 range for this phase
        const t = m * 2;

        // Interpolate vertices
        // Map Triangle V0 (Tip) -> Rect V0 & V3 (Right side)
        // Map Triangle V1 (Top Left) -> Rect V1 (Top Left)
        // Map Triangle V2 (Bottom Left) -> Rect V2 (Bottom Left)

        // We need 4 points for the rect. Triangle has 3.
        // We can double up V0 in the triangle to split into V0/V3 of rect.

        const cV0 = { x: triV0.x * (1 - t) + rectV0.x * t, y: triV0.y * (1 - t) + rectV0.y * t };
        const cV1 = { x: triV1.x * (1 - t) + rectV1.x * t, y: triV1.y * (1 - t) + rectV1.y * t };
        const cV2 = { x: triV2.x * (1 - t) + rectV2.x * t, y: triV2.y * (1 - t) + rectV2.y * t };
        const cV3 = { x: triV0.x * (1 - t) + rectV3.x * t, y: triV0.y * (1 - t) + rectV3.y * t };

        // Bezier control points smooth out as t -> 1
        const t0 = { x: 0, y: -r * k * (1 - t) };
        const t1 = { x: -0.866 * r * k * (1 - t), y: 0.5 * r * k * (1 - t) };
        const t2 = { x: 0.866 * r * k * (1 - t), y: 0.5 * r * k * (1 - t) };

        ctx.beginPath();
        // Top edge: V1 -> V0
        ctx.moveTo(cx + cV0.x, cy + cV0.y);
        ctx.bezierCurveTo(
            cx + cV0.x + t0.x, cy + cV0.y + t0.y,
            cx + cV1.x - t1.x, cy + cV1.y - t1.y,
            cx + cV1.x, cy + cV1.y
        );

        // Left edge: V1 -> V2
        // Restoring bezier curve for rounded back, interpolating to flat for rectangle
        ctx.bezierCurveTo(
            cx + cV1.x + t1.x, cy + cV1.y + t1.y,
            cx + cV2.x - t2.x, cy + cV2.y - t2.y,
            cx + cV2.x, cy + cV2.y
        );

        // Bottom edge: V2 -> V3
        // For triangle, V2 -> V0 (Tip)
        ctx.bezierCurveTo(
            cx + cV2.x + t2.x, cy + cV2.y + t2.y,
            cx + cV3.x - t0.x, cy + cV3.y - t0.y,
            cx + cV3.x, cy + cV3.y
        );

        // Right edge: V3 -> V0
        ctx.lineTo(cx + cV0.x, cy + cV0.y);

        ctx.closePath();
        ctx.fill();

    } else {
        // Phase 2: Single Bar (l) -> Double Bar (ll)
        // Normalize m to 0-1 range for this phase
        const t = (m - 0.5) * 2;

        // Easing
        const ease = t * (2 - t); // Ease out

        const offset = barSpacing * ease;

        // Draw Left Bar (moving left)
        const leftX = cx - offset / 2;

        ctx.beginPath();
        ctx.roundRect(leftX - barWidth / 2, cy - barHeight / 2, barWidth, barHeight, 2);
        ctx.fill();

        // Draw Right Bar (moving right - sliding out)
        if (t > 0) {
            const rightX = cx + offset / 2;
            // Scale height/opacity up as it emerges? Or just slide?
            // "slide out another l" implies splitting or emerging.
            // Sliding from center seems smoothest.

            ctx.beginPath();
            ctx.roundRect(rightX - barWidth / 2, cy - barHeight / 2, barWidth, barHeight, 2);
            ctx.fill();
        }
    }

    ctx.globalAlpha = 1.0;
}

export function drawBackButton(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const pBack = hoverProgress;
    ctx.globalAlpha = 0.8;
    const rBack = 8;

    let phase1ProgressBack = Math.min(pBack * 2, 1.0);
    let phase2ProgressBack = Math.max((pBack - 0.5) * 2, 0);

    const startWidthBack = rBack * 2;
    const endWidthBack = 4;
    const startHeightBack = rBack * 2;
    const endHeightBack = 18;
    const startRadiusBack = rBack;
    const endRadiusBack = 2;

    const widthBack = startWidthBack * (1 - phase1ProgressBack) + endWidthBack * phase1ProgressBack;
    const heightBack = startHeightBack * (1 - phase1ProgressBack) + endHeightBack * phase1ProgressBack;
    const cornerRadiusBack = startRadiusBack * (1 - phase1ProgressBack) + endRadiusBack * phase1ProgressBack;

    let jxBack = 0;
    let jyBack = 0;
    if (pBack > 0.8) {
        jxBack = (Math.random() - 0.5) * 3 * pBack;
        jyBack = (Math.random() - 0.5) * 3 * pBack;
    }
    const cxBack = btnX + jxBack;
    const cyBack = btnY + jyBack;

    ctx.fillStyle = color;

    const rotationAngleBack1 = -0.5;
    ctx.save();
    ctx.translate(cxBack, cyBack);
    ctx.rotate(rotationAngleBack1);
    ctx.beginPath();
    drawPixelRoundedRect(ctx, -widthBack / 2, -heightBack / 2, widthBack, heightBack, cornerRadiusBack);
    ctx.fill();
    ctx.restore();

    if (phase2ProgressBack > 0) {
        const rotationAngleBack2 = 0.5;
        const alphaBack2 = phase2ProgressBack;

        ctx.save();
        ctx.globalAlpha = 0.8 * alphaBack2;
        ctx.translate(cxBack, cyBack);
        ctx.rotate(rotationAngleBack2);
        ctx.beginPath();
        drawPixelRoundedRect(ctx, -widthBack / 2, -heightBack / 2, widthBack, heightBack, cornerRadiusBack);
        ctx.fill();
        ctx.restore();
    }
    ctx.globalAlpha = 1.0;
}

export function drawNextButton(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const p = hoverProgress;
    const r = 8 + (5 * p);

    ctx.globalAlpha = 0.8;

    let jx = 0;
    let jy = 0;
    if (p > 0.8) {
        jx = (Math.random() - 0.5) * 3 * p;
        jy = (Math.random() - 0.5) * 3 * p;
    }
    const cx = btnX + jx;
    const cy = btnY + jy;

    const baseR = r;
    const circleK = 0.552284749831;

    const chevTip = { x: baseR, y: 0 };
    const chevTop = { x: -baseR * 0.5, y: -baseR };
    const chevBot = { x: -baseR * 0.5, y: baseR };
    const chevInner = { x: 0, y: 0 };

    const circTip = { x: baseR, y: 0 };
    const circTop = { x: 0, y: -baseR };
    const circBot = { x: 0, y: baseR };
    const circBack = { x: -baseR, y: 0 };

    const v0 = { x: circTip.x * (1 - p) + chevTip.x * p, y: circTip.y * (1 - p) + chevTip.y * p };
    const v1 = { x: circTop.x * (1 - p) + chevTop.x * p, y: circTop.y * (1 - p) + chevTop.y * p };
    const v2 = { x: circBot.x * (1 - p) + chevBot.x * p, y: circBot.y * (1 - p) + chevBot.y * p };
    const v3 = { x: circBack.x * (1 - p) + chevInner.x * p, y: circBack.y * (1 - p) + chevInner.y * p };

    const tanLen = (baseR * circleK) * (1 - p);

    ctx.fillStyle = color;
    ctx.globalCompositeOperation = 'source-over';

    ctx.beginPath();
    ctx.moveTo(cx + v0.x, cy + v0.y); // Tip

    ctx.bezierCurveTo(cx + v0.x, cy + v0.y - tanLen, cx + v1.x + tanLen, cy + v1.y, cx + v1.x, cy + v1.y);
    ctx.bezierCurveTo(cx + v1.x - tanLen, cy + v1.y, cx + v3.x, cy + v3.y - tanLen, cx + v3.x, cy + v3.y);
    ctx.bezierCurveTo(cx + v3.x, cy + v3.y + tanLen, cx + v2.x - tanLen, cy + v2.y, cx + v2.x, cy + v2.y);
    ctx.bezierCurveTo(cx + v2.x + tanLen, cy + v2.y, cx + v0.x, cy + v0.y + tanLen, cx + v0.x, cy + v0.y);

    ctx.closePath();
    ctx.fill();

    const barWidth = 4;
    const finalBarHeight = r * 1.6;
    const finalBarX = r + 4;

    const currentBarX = finalBarX * p;
    const currentBarHeight = finalBarHeight * p;

    if (currentBarHeight > 0.5) {
        ctx.beginPath();
        ctx.roundRect(cx + currentBarX, cy - currentBarHeight / 2, barWidth, currentBarHeight, 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}

export function drawMenuButton(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const pMenu = hoverProgress;
    ctx.globalAlpha = 0.8;
    const rMenu = 8;

    let phase1Progress = Math.min(pMenu * 2, 1.0);
    let phase2Progress = Math.max((pMenu - 0.5) * 2, 0);

    const startWidth = rMenu * 2;
    const endWidth = 4;
    const startHeight = rMenu * 2;
    const endHeight = 18;
    const startRadius = rMenu;
    const endRadius = 2;

    const width = startWidth * (1 - phase1Progress) + endWidth * phase1Progress;
    const height = startHeight * (1 - phase1Progress) + endHeight * phase1Progress;
    const cornerRadius = startRadius * (1 - phase1Progress) + endRadius * phase1Progress;

    let jxMenu = 0;
    let jyMenu = 0;
    if (pMenu > 0.8) {
        jxMenu = (Math.random() - 0.5) * 2 * pMenu;
        jyMenu = (Math.random() - 0.5) * 2 * pMenu;
    }

    const cxMenu = btnX + jxMenu;
    const cyMenu = btnY + jyMenu;

    ctx.fillStyle = color;

    if (phase2Progress > 0) {
        const barSpacing = 6 * phase2Progress;
        const rotationAngle = -0.5 * phase2Progress;

        ctx.save();
        ctx.translate(cxMenu - barSpacing, cyMenu);
        ctx.rotate(rotationAngle);
        ctx.beginPath();
        drawPixelRoundedRect(ctx, -width / 2, -height / 2, width, height, cornerRadius);
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        drawPixelRoundedRect(ctx, cxMenu - width / 2, cyMenu - height / 2, width, height, cornerRadius);
        ctx.fill();

        ctx.beginPath();
        drawPixelRoundedRect(ctx, cxMenu + barSpacing - width / 2, cyMenu - height / 2, width, height, cornerRadius);
        ctx.fill();
    } else {
        ctx.beginPath();
        drawPixelRoundedRect(ctx, cxMenu - width / 2, cyMenu - height / 2, width, height, cornerRadius);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}

export function drawProgressBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    progress: number,
    songName: string,
    opacity: number,
    color: string = '#ffffff'
) {
    if (opacity <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    const startX = x + (Math.random() - 0.5) * 2;
    const startY = y + (Math.random() - 0.5) * 2;

    // Draw Song Name
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(songName, startX, startY + 10);

    // Draw Line (Track)
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + width, startY);
    ctx.stroke();

    // Draw Dot (Thumb)
    const cx = startX + (width * Math.max(0, Math.min(1, progress)));

    // Glitch effect on dot
    const dotJitterX = (Math.random() - 0.5) * 4;
    const dotJitterY = (Math.random() - 0.5) * 4;

    ctx.beginPath();
    ctx.arc(cx + dotJitterX, startY + dotJitterY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Sometimes draw a second "ghost" dot very faint
    if (Math.random() > 0.7) {
        ctx.globalAlpha = opacity * 0.3;
        ctx.beginPath();
        ctx.arc(cx - dotJitterX, startY - dotJitterY, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export function drawTrackList(
    ctx: CanvasRenderingContext2D,
    tracks: string[],
    scrollTop: number,
    hoveredIndex: number,
    currentSongName: string,
    opacity: number,
    color: string = '#00ff44'
) {
    if (opacity <= 0.01) return;

    const listX = -220;
    const listY = -140;
    const listWidth = 440;
    const listHeight = 280;
    const itemHeight = 40;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px "Courier New", monospace';

    // Clip area
    ctx.beginPath();
    ctx.rect(listX, listY, listWidth, listHeight);
    ctx.clip();

    const visibleItems = Math.ceil(listHeight / itemHeight) + 1;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(tracks.length, startIndex + visibleItems);

    for (let i = startIndex; i < endIndex; i++) {
        const track = tracks[i];
        const cleanName = track.split('/').pop()?.replace(/\.(mp3|m4a)$/, '') || 'Unknown';
        const y = listY + (i * itemHeight) - scrollTop + (itemHeight / 2);

        // Highlight if playing or hovered
        const isPlaying = cleanName === currentSongName;
        const isHovered = i === hoveredIndex;

        ctx.fillStyle = color; // Always green as requested

        let textX = listX + 10;
        let textY = y;

        if (isPlaying || isHovered) {
            // Jitter effect
            textX += (Math.random() - 0.5) * 4;
            textY += (Math.random() - 0.5) * 4;
        }

        if (isPlaying) {
            ctx.fillText('> ' + cleanName, textX, textY);
        } else {
            ctx.fillText(cleanName, textX, textY);
        }
    }

    ctx.restore();

    // Scrollbar
    const totalHeight = tracks.length * itemHeight;
    if (totalHeight > listHeight) {
        const scrollBarHeight = (listHeight / totalHeight) * listHeight;
        const scrollBarY = listY + (scrollTop / totalHeight) * listHeight;

        ctx.save();
        ctx.globalAlpha = opacity * 0.5;
        ctx.fillStyle = color;
        ctx.fillRect(listX + listWidth - 10, scrollBarY, 6, scrollBarHeight);
        ctx.restore();
    }
}

export function drawReactiveCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    analyser: AnalyserNode,
    time: number,
    color: string = '#00ff44',
    opacity: number
) {
    if (opacity <= 0.01) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Separate Bass and Mid-Highs
    // Bass (Low frequencies: index 0-10) for Pulse
    let bassSum = 0;
    const bassEnd = 10;
    for (let i = 0; i < bassEnd; i++) {
        bassSum += dataArray[i];
    }
    const bassAvg = (bassSum / bassEnd) / 255;
    // Enhanced Kick Pulse: 
    // Increased multiplier (1.4) and slightly adjusted power (2.2) 
    // to make the "jump" more powerful and noticeable.
    const pulse = 1 + Math.pow(bassAvg, 2.2) * 1.4;

    // 3D Ring Logic
    const segments = 120;
    const ringPoints: { x: number, y: number, z: number }[] = [];

    // Complex Rotation (Tumbling)
    const rotX = time * 0.5;
    const rotY = time * 0.3;
    const rotZ = time * 0.2;

    // Define Frequency Bands
    const activeStart = 10;
    const bufferRange = Math.floor(bufferLength * 0.8) - activeStart;
    const midRangeEnd = Math.floor(bufferRange * 0.4); // First 40% is mids
    const highRangeStart = midRangeEnd;
    const highRangeEnd = bufferRange;

    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;

        /**
         * QUADRANT SPATIAL SEPARATION:
         * We want Mids on the sides (Left/Right) and Highs on top/bottom.
         * Math.cos(theta)^2 gives 1 at 0, 180 (Sides) and 0 at 90, 270 (Top/Bottom).
         */
        const midWeight = Math.pow(Math.cos(theta), 2); // 1 = full mid, 0 = full high
        const highWeight = 1 - midWeight;

        // Calculate Mid Bin (from first half of spectrum)
        const midProgress = Math.abs(Math.sin(theta)); // Symmetric 0->1->0
        const midBin = activeStart + Math.floor(midProgress * midRangeEnd);

        // Calculate High Bin (from second half of spectrum)
        const highProgress = Math.abs(Math.cos(theta)); // Perpendicular symmetric
        const highBin = activeStart + highRangeStart + Math.floor(highProgress * (highRangeEnd - highRangeStart));

        // Get and weight the values
        const midVal = (dataArray[midBin] || 0) / 255;
        const highVal = (dataArray[highBin] || 0) / 255;

        // Apply different power curves for better separation
        const midSpike = Math.pow(midVal, 2.5) * 5.0;  // Mids are wider/thicker spikes
        const highSpike = Math.pow(highVal, 3.5) * 8.0; // Highs are thinner/sharper spikes

        const distortion = 1 + (midSpike * midWeight) + (highSpike * highWeight);

        const r = radius * pulse * distortion;

        // Base Point
        let px = Math.cos(theta) * r;
        let py = Math.sin(theta) * r;
        let pz = 0;

        // Apply same 3D rotations
        let y1 = py * Math.cos(rotX) - pz * Math.sin(rotX);
        let z1 = py * Math.sin(rotX) + pz * Math.cos(rotX);
        let x1 = px;

        let x2 = x1 * Math.cos(rotY) + z1 * Math.sin(rotY);
        let z2 = -x1 * Math.sin(rotY) + z1 * Math.cos(rotY);
        let y2 = y1;

        let x3 = x2 * Math.cos(rotZ) - y2 * Math.sin(rotZ);
        let y3 = x2 * Math.sin(rotZ) + y2 * Math.cos(rotZ);
        let z3 = z2;

        ringPoints.push({ x: x3, y: y3, z: z3 });
    }

    // Project and Draw
    ctx.beginPath();
    for (let i = 0; i < ringPoints.length; i++) {
        const p = ringPoints[i];
        // Perspective Projection
        // We use a larger focal length to accommodate massive spikes without flipping
        const focalLength = 2000;
        const denominator = focalLength - p.z;

        // Prevent flipping (negative scale) if z exceeds focalLength
        // This stops the "malformation" where spikes bounce back into the screen.
        const scale = focalLength / Math.max(10, denominator);

        const screenX = p.x * scale;
        const screenY = p.y * scale;

        if (i === 0) {
            ctx.moveTo(screenX, screenY);
        } else {
            ctx.lineTo(screenX, screenY);
        }
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
}
