'use client';

interface PaletteSelectorProps {
    current: string;
    onChange: (palette: string) => void;
}

const options = [
    { id: 'current', label: 'Original', color: '#ff4466' },
    { id: 'A', label: 'Midnight', color: '#ffaa44' },
    { id: 'B', label: 'Neon', color: '#00eeff' },
    { id: 'C', label: 'Toxic', color: '#00ff44' },
    { id: 'D', label: 'Glitch', color: '#ff0000' },
    { id: 'E', label: 'Gold', color: '#ffcc00' },

    { id: 'F', label: 'Holo', color: '#ff00ff' },
    { id: 'G', label: 'Hacker', color: '#00ff00' },
    { id: 'H', label: 'Noir', color: '#ffffff' },
    { id: 'I', label: 'Velvet', color: '#ffcc00' },

];

export function PaletteSelector({ current, onChange }: PaletteSelectorProps) {
    return (
        <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 100,
            display: 'flex',
            gap: 8,
            pointerEvents: 'auto',
        }}>
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => onChange(opt.id)}
                    style={{
                        padding: '8px 14px',
                        border: current === opt.id ? `2px solid ${opt.color}` : '2px solid rgba(255,255,255,0.15)',
                        borderRadius: 6,
                        background: current === opt.id ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.4)',
                        color: current === opt.id ? opt.color : '#666',
                        cursor: 'pointer',
                        fontFamily: '"Courier New", monospace',
                        fontSize: 12,
                        fontWeight: 'bold',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.2s',
                        letterSpacing: '0.5px',
                    }}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
