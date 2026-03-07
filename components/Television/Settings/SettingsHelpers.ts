export {
    drawBackButton,
    drawMenuButton,
    drawButtonShockwave
} from '../Helpers';

export function checkButtonHover(
    nx: number,
    ny: number,
    btn: { x: number, y: number, radius: number },
    w: number,
    h: number
): boolean {
    const mx = nx * (w / 2);
    const my = ny * (h / 2);
    const dist = Math.sqrt((mx - btn.x) ** 2 + (my - btn.y) ** 2);
    return dist < btn.radius;
}
