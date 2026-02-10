import * as THREE from 'three';

export function updateButtonHoverAnimation(
    screenTexture: THREE.Texture,
    userDataKey: string,
    isHover: boolean,
    speed: number = 0.1
): number {
    if (!screenTexture.userData) screenTexture.userData = {};

    // Initialize if undefined
    if (typeof screenTexture.userData[userDataKey] === 'undefined') {
        screenTexture.userData[userDataKey] = 0;
    }

    const target = isHover ? 1 : 0;

    // Smooth transition
    screenTexture.userData[userDataKey] += (target - screenTexture.userData[userDataKey]) * speed;

    // Snap to 0 if very close to avoid micro-values
    if (Math.abs(screenTexture.userData[userDataKey]) < 0.001) {
        screenTexture.userData[userDataKey] = 0;
    }

    return screenTexture.userData[userDataKey];
}
