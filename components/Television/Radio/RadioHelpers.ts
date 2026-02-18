export {
    drawPixelCircle,
    drawPixelEllipse,
    drawPixelRoundedRect,
    drawPixelEye,
    drawButtonShockwave,
    drawBackButton,
    drawMenuButton
} from '../Helpers';

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

    // Phase 1: Triangle morphs to single bar

    const triV0 = { x: r, y: 0 };
    const triV1 = { x: -0.5 * r, y: -0.866 * r };
    const triV2 = { x: -0.5 * r, y: 0.866 * r };

    // Left bar target vertices (centered bar phase)
    const rectV0 = { x: barWidth / 2, y: -barHeight / 2 };
    const rectV1 = { x: -barWidth / 2, y: -barHeight / 2 };
    const rectV2 = { x: -barWidth / 2, y: barHeight / 2 };
    const rectV3 = { x: barWidth / 2, y: barHeight / 2 };

    // Morph Logic
    if (m <= 0.5) {
        // Phase 1: Triangle -> Single Center Bar
        const t = m * 2;

        // Interpolate triangle -> rect vertices

        const cV0 = { x: triV0.x * (1 - t) + rectV0.x * t, y: triV0.y * (1 - t) + rectV0.y * t };
        const cV1 = { x: triV1.x * (1 - t) + rectV1.x * t, y: triV1.y * (1 - t) + rectV1.y * t };
        const cV2 = { x: triV2.x * (1 - t) + rectV2.x * t, y: triV2.y * (1 - t) + rectV2.y * t };
        const cV3 = { x: triV0.x * (1 - t) + rectV3.x * t, y: triV0.y * (1 - t) + rectV3.y * t };

        // Bezier control points flatten as t -> 1
        const t0 = { x: 0, y: -r * k * (1 - t) };
        const t1 = { x: -0.866 * r * k * (1 - t), y: 0.5 * r * k * (1 - t) };
        const t2 = { x: 0.866 * r * k * (1 - t), y: 0.5 * r * k * (1 - t) };

        ctx.beginPath();
        ctx.moveTo(cx + cV0.x, cy + cV0.y);
        ctx.bezierCurveTo(
            cx + cV0.x + t0.x, cy + cV0.y + t0.y,
            cx + cV1.x - t1.x, cy + cV1.y - t1.y,
            cx + cV1.x, cy + cV1.y
        );

        ctx.bezierCurveTo(
            cx + cV1.x + t1.x, cy + cV1.y + t1.y,
            cx + cV2.x - t2.x, cy + cV2.y - t2.y,
            cx + cV2.x, cy + cV2.y
        );

        ctx.bezierCurveTo(
            cx + cV2.x + t2.x, cy + cV2.y + t2.y,
            cx + cV3.x - t0.x, cy + cV3.y - t0.y,
            cx + cV3.x, cy + cV3.y
        );

        ctx.lineTo(cx + cV0.x, cy + cV0.y);

        ctx.closePath();
        ctx.fill();

    } else {
        // Phase 2: Single Bar -> Double Bar
        const t = (m - 0.5) * 2;
        const ease = t * (2 - t);

        const offset = barSpacing * ease;

        // Left bar
        const leftX = cx - offset / 2;

        ctx.beginPath();
        ctx.roundRect(leftX - barWidth / 2, cy - barHeight / 2, barWidth, barHeight, 2);
        ctx.fill();

        // Right bar (slides out)
        if (t > 0) {
            const rightX = cx + offset / 2;

            ctx.beginPath();
            ctx.roundRect(rightX - barWidth / 2, cy - barHeight / 2, barWidth, barHeight, 2);
            ctx.fill();
        }
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
    tracks: { displayName: string; path: string }[],
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
        const cleanName = track.displayName;
        const y = listY + (i * itemHeight) - scrollTop + (itemHeight / 2);

        // Highlight if playing or hovered
        // currentSongName passed from Radio is already cleaned
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
    const pulse = 1 + Math.pow(bassAvg, 2.2) * 1.4;

    // 3D Ring
    const segments = 120;
    const ringPoints: { x: number, y: number, z: number }[] = [];

    // Complex Rotation (Tumbling)
    const rotX = time * 0.5;
    const rotY = time * 0.3;
    const rotZ = time * 0.2;

    // Frequency band separation
    const activeStart = 10;
    const bufferRange = Math.floor(bufferLength * 0.8) - activeStart;
    const midRangeEnd = Math.floor(bufferRange * 0.4); // First 40% is mids
    const highRangeStart = midRangeEnd;
    const highRangeEnd = bufferRange;

    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;

        // Spatial separation: mids on sides, highs on top/bottom
        const midWeight = Math.pow(Math.cos(theta), 2);
        const highWeight = 1 - midWeight;

        const midProgress = Math.abs(Math.sin(theta));
        const midBin = activeStart + Math.floor(midProgress * midRangeEnd);

        const highProgress = Math.abs(Math.cos(theta));
        const highBin = activeStart + highRangeStart + Math.floor(highProgress * (highRangeEnd - highRangeStart));

        const midVal = (dataArray[midBin] || 0) / 255;
        const highVal = (dataArray[highBin] || 0) / 255;

        const midSpike = Math.pow(midVal, 2.5) * 5.0;
        const highSpike = Math.pow(highVal, 3.5) * 8.0;

        const distortion = 1 + (midSpike * midWeight) + (highSpike * highWeight);

        const r = radius * pulse * distortion;

        let px = Math.cos(theta) * r;
        let py = Math.sin(theta) * r;
        let pz = 0;

        // 3D rotation
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

    ctx.beginPath();
    for (let i = 0; i < ringPoints.length; i++) {
        const p = ringPoints[i];
        const focalLength = 2000;
        const denominator = focalLength - p.z;
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
