export {
    drawButtonShockwave,
    drawPlayStopButton,
    drawBackButton,
    drawMenuButton,
    drawStaticNoise
} from '../Helpers';

import { OSDLayout } from './MyWorksTypes';

// Optimization: Calculate layout once per project
export function calculateOSDLayout(project: { title: string; stack: string; desc: string }): OSDLayout {
    const maxLineLength = 38;
    const lineHeight = 25;
    const boxX = 30;
    const w = 512;
    const h = 512;
    const boxW = w - 60;

    // Config
    const typeSpeed = 0.1;
    const sectionPause = 0.2;

    const wrapText = (prefix: string, text: string): string[] => {
        const fullText = prefix + text;
        if (fullText.length <= maxLineLength) return [fullText];
        const lines: string[] = [];
        let remaining = fullText;
        while (remaining.length > 0) {
            if (remaining.length <= maxLineLength) {
                lines.push(remaining);
                break;
            }
            let split = remaining.lastIndexOf(' ', maxLineLength);
            if (split === -1 || split < 15) split = maxLineLength;
            lines.push(remaining.substring(0, split));
            remaining = "           " + remaining.substring(split + 1);
        }
        return lines;
    };

    const lines1 = wrapText("> PROJECT: ", project.title);
    const lines2 = wrapText("> STACK:   ", project.stack);
    const lines3 = wrapText("> INFO:    ", project.desc);

    const allLines = [...lines1, ...lines2, ...lines3];
    const totalTextHeight = allLines.length * lineHeight;
    const boxH = totalTextHeight + 35;
    const boxY = h - boxH - 100;

    const len1 = lines1.join("").length;
    const len2 = lines2.join("").length;
    const len3 = lines3.join("").length;
    const totalChars = len1 + len2 + len3;

    // Time milestones
    const t1 = len1 * typeSpeed;
    const t2 = t1 + sectionPause + (len2 * typeSpeed);

    // Hit Area (Centered relative)
    const boxDrawY = boxY;
    const minY = boxDrawY - 256;
    const maxY = (boxDrawY + boxH) - 256;
    const minX = -226; // 30 - 256
    const maxX = 226;  // (30 + 452) - 256

    return {
        allLines,
        t1,
        t2,
        totalChars,
        boxX,
        boxY,
        boxW,
        boxH,
        hitArea: { minX, maxX, minY, maxY },
        lineHeight,
        groups: { len1, len2, len3 }
    };
}

export function drawOSD(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    layout: OSDLayout,
    entryTime: number,
    opacity: number = 1.0,
    skipTyping: boolean = false
): { charsDrawn: number; isTyping: boolean } {
    const elapsed = time - entryTime;

    if (opacity < 0.01) return { charsDrawn: 0, isTyping: false };

    ctx.save();
    ctx.globalAlpha = opacity;

    const { boxX, boxY, boxW, boxH, allLines, lineHeight } = layout;

    // Draw Box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Border
    ctx.strokeStyle = `rgba(0, 255, 0, ${0.3 * opacity})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Text Settings
    ctx.font = 'bold 16px "Courier New", monospace';

    // Typewriter Logic
    const typeSpeed = 0.1;
    const sectionPause = 0.2;
    const { len1, len2, len3 } = layout.groups;
    const { t1, t2 } = layout;

    // Using layout t1/t2 for consistency
    const startDelay = 0.2;
    const activeTime = Math.max(0, elapsed - startDelay);

    let totalCharsToDraw = 0;
    let isTyping = false;

    if (skipTyping) {
        totalCharsToDraw = layout.totalChars;
        isTyping = false;
    } else {
        if (activeTime < t1) {
            totalCharsToDraw = Math.floor(activeTime / typeSpeed);
            isTyping = true;
        } else if (activeTime < t1 + sectionPause) {
            totalCharsToDraw = len1;
            isTyping = false;
        } else if (activeTime < t2) {
            const localTime = activeTime - (t1 + sectionPause);
            totalCharsToDraw = len1 + Math.floor(localTime / typeSpeed);
            isTyping = true;
        } else if (activeTime < t2 + sectionPause) {
            totalCharsToDraw = len1 + len2;
            isTyping = false;
        } else {
            const localTime = activeTime - (t2 + sectionPause);
            const chars3 = Math.floor(localTime / typeSpeed);
            totalCharsToDraw = len1 + len2 + chars3;
            isTyping = chars3 < len3;
            if (totalCharsToDraw > layout.totalChars) totalCharsToDraw = layout.totalChars;
        }
    }

    let charsDrawn = 0;

    // Rendering loop
    const textStartX = boxX + 15;
    const textStartY = boxY + 30;

    let currentColor = '#cccccc';

    allLines.forEach((line, idx) => {
        const yPos = textStartY + (idx * lineHeight);
        const lineLen = line.length;

        if (charsDrawn < totalCharsToDraw) {
            let count = lineLen;
            if (charsDrawn + lineLen > totalCharsToDraw) {
                count = totalCharsToDraw - charsDrawn;
            }

            if (count > 0) {
                const str = line.substring(0, count);

                if (line.startsWith("> PROJECT")) currentColor = '#aaffaa';
                else if (line.startsWith("> STACK")) currentColor = '#00cccc';
                else if (line.startsWith("> INFO")) currentColor = '#cccccc';

                ctx.fillStyle = currentColor;
                ctx.fillText(str, textStartX, yPos);
            }
            charsDrawn += lineLen;
        }
    });

    ctx.restore();

    return { charsDrawn: totalCharsToDraw, isTyping };
}

export function drawEyeButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hoverProgress: number,
    time: number,
    baseColor: string = '#ffffff',
    radius: number = 40 // Default radius if not provided
) {
    ctx.save();
    ctx.translate(x, y);

    // Dynamic Scale based on radius (Base design is approx 40px radius)
    // If radius is 10, scale should be 10/40 = 0.25
    const baseDesignRadius = 40;
    const baseScale = radius / baseDesignRadius;
    ctx.scale(baseScale, baseScale);

    // Hover scale & jitter
    const jx = (Math.random() - 0.5) * 2 * hoverProgress;
    const jy = (Math.random() - 0.5) * 2 * hoverProgress;
    const scale = 1 + hoverProgress * 0.1;
    ctx.translate(jx, jy);
    ctx.scale(scale, scale);

    // Circle container (Outline)
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = `rgba(0,0,0,${0.5 + hoverProgress * 0.3})`;
    ctx.fill();

    // Eye Icon
    const iconScale = 0.7;
    ctx.scale(iconScale, iconScale);

    ctx.strokeStyle = baseColor;
    ctx.fillStyle = baseColor;
    ctx.lineWidth = 4;

    // Sclera (Eye shape)
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.quadraticCurveTo(0, -25, 35, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.quadraticCurveTo(0, 25, 35, 0);
    ctx.stroke();

    // Pupil
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Lashes
    const lashLength = 10;
    const lashStart = 28;

    // Central Lash
    ctx.beginPath();
    ctx.moveTo(0, -lashStart);
    ctx.lineTo(0, -lashStart - lashLength);
    ctx.stroke();

    const lashAngle = 0.5;
    // Side Lashes (Left/Right 1 & 2)
    const drawLash = (angle: number, heightOffset: number) => {
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, -lashStart + heightOffset);
        ctx.lineTo(0, -lashStart - lashLength + heightOffset);
        ctx.stroke();
        ctx.restore();
    };

    drawLash(-lashAngle, 2);
    drawLash(-lashAngle * 2, 8);
    drawLash(lashAngle, 2);
    drawLash(lashAngle * 2, 8);


    // Hover Glow
    if (hoverProgress > 0) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = baseColor;
        ctx.fillStyle = `rgba(255, 255, 255, ${hoverProgress * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.quadraticCurveTo(0, -25, 35, 0);
        ctx.quadraticCurveTo(0, 25, -35, 0);
        ctx.fill();
    }

    ctx.restore();
}
