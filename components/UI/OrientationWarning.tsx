'use client';

import { useEffect, useState } from 'react';

export function OrientationWarning() {
    const [isPortrait, setIsPortrait] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            // Check if height > width
            setIsPortrait(window.innerHeight > window.innerWidth);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    if (!isPortrait) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(5, 5, 5, 0.95)',
            backdropFilter: 'blur(10px)',
            color: '#4af626',
            fontFamily: '"Courier New", Courier, monospace',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            pointerEvents: 'all',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <style jsx>{`
                @keyframes rotate-phone {
                    0% { transform: rotate(0deg); }
                    10% { transform: rotate(0deg); }
                    40% { transform: rotate(-90deg); }
                    60% { transform: rotate(-90deg); }
                    90% { transform: rotate(0deg); }
                    100% { transform: rotate(0deg); }
                }
            `}</style>
            
            <div style={{
                width: '60px',
                height: '100px',
                border: '4px solid #4af626',
                borderRadius: '8px',
                marginBottom: '2rem',
                position: 'relative',
                animation: 'rotate-phone 3s ease-in-out infinite',
                boxShadow: '0 0 15px rgba(74, 246, 38, 0.4)'
            }}>
                {/* Screen inner box */}
                <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '4px',
                    right: '4px',
                    bottom: '12px',
                    border: '1px solid rgba(74, 246, 38, 0.5)',
                    borderRadius: '2px'
                }} />
                {/* Home button dot */}
                <div style={{
                    position: 'absolute',
                    bottom: '3px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#4af626'
                }} />
            </div>

            <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                textShadow: '0 0 10px rgba(74, 246, 38, 0.5)'
            }}>
                PLEASE ROTATE DEVICE
            </h2>
            <p style={{
                fontSize: '1rem',
                opacity: 0.8,
                maxWidth: '300px',
                lineHeight: '1.5'
            }}>
                This interactive 3D experience is designed specifically for landscape orientation.
            </p>
        </div>
    );
}
