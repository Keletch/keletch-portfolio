export interface PolaroidData {
    id: string;
    imagePath: string;
    caption: string;
    targetX: number;     // Normalized position -1 to 1 based on screen center
    targetY: number;     // Normalized position -1 to 1 based on screen center
    targetRot: number;   // Rotation in radians
    scale: number;       // Base scale relative to screen height
}

// 20 actual photos with formatted titles
const rawPhotos = [
    { file: 'Batman&Blacky.avif', title: 'Batman & Blacky' },
    { file: 'MeAtBar.avif', title: 'Me At Bar' },
    { file: 'TheSea.avif', title: 'The Sea' },
    { file: 'Blacky.avif', title: 'Blacky' },
    { file: 'Cats&Eclipse.avif', title: 'Cats & Eclipse' },
    { file: 'FirstSolarEclipse.avif', title: 'First Solar Eclipse' },
    { file: 'FirstTimeAtSea.avif', title: 'First Time At Sea' },
    { file: 'Kindred&Me.avif', title: 'Kindred & Me' },
    { file: 'KirbyRug.avif', title: 'Kirby Rug' },
    { file: 'SomeBeers.avif', title: 'Some Beers' },
    { file: 'LoveNature.avif', title: 'Love Nature' },
    { file: 'MeAtMty.avif', title: 'Me At Monterrey' },
    { file: 'Museum.avif', title: 'Museum' },
    { file: 'Oreo&Me.avif', title: 'Oreo & Me' },
    { file: 'OreoMe&Rug.avif', title: 'Oreo, Me & Rug' },
    { file: 'Panama.avif', title: 'Panama' },
    { file: 'Pinball.avif', title: 'Pinball' },
    { file: 'RugHobby.avif', title: 'Rug Hobby' },
    { file: 'SolarEclipse.avif', title: 'Solar Eclipse' },
    { file: 'Squanchy.avif', title: 'Squanchy' }
];

// Define 5 distinct "zones" on the screen so consecutive photos never overlap fully
export const ZONES = [
    { x: -0.25, y: -0.20 }, // Top Left
    { x: 0.25, y: 0.20 }, // Bottom Right
    { x: -0.30, y: 0.15 }, // Bottom Left
    { x: 0.30, y: -0.15 }, // Top Right
    { x: 0.00, y: 0.00 }  // Center
];

// Shuffle array deterministically or just use as is (random order over time is fine)
// We'll map them sequentially in the array, using a zone based on index.
export const POLAROIDS: PolaroidData[] = rawPhotos.map((photo, i) => {
    const zone = ZONES[i % ZONES.length];

    return {
        id: `p${i + 1}`,
        imagePath: `/photos/${photo.file}`,
        caption: photo.title,
        // Place in the zone, plus a small amount of random jitter so it's not perfectly rigid
        targetX: zone.x + (Math.random() - 0.5) * 0.15,
        targetY: zone.y + (Math.random() - 0.5) * 0.15,
        targetRot: (Math.random() - 0.5) * 0.6, // -0.3 to 0.3 rad (-17 to 17 deg)
        scale: 0.4 + Math.random() * 0.1 // 0.4 to 0.5
    };
});

// Helper to load HTMLImageElements once
const preloadedImages: Record<string, HTMLImageElement> = {};

export function getPolaroidImage(path: string): HTMLImageElement | null {
    if (preloadedImages[path]) return preloadedImages[path];

    // Create and trigger load if not exists
    if (typeof window !== 'undefined') {
        const img = new Image();
        img.src = path;
        preloadedImages[path] = img;
    }
    return null;
}
