export {
    drawBackButton,
    drawMenuButton,
    drawButtonShockwave,
    drawPlayStopButton,
    drawTelevisionHeader
} from '../Helpers';




export function checkButtonHover(
    uvX: number,
    uvY: number,
    invertY: boolean,
    btn: { x: number, y: number, radius: number },
    w: number,
    h: number
): boolean {
    const px = uvX * w;
    const py = (1 - uvY) * h;
    const dx = px - (w / 2);
    let dy = py - (h / 2);

    if (invertY) dy = -dy;

    const dist = Math.sqrt((dx - btn.x) ** 2 + (dy - btn.y) ** 2);
    return dist < btn.radius;
}


