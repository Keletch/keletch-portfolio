import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';

interface LoaderProps {
    onFinished: () => void;
}

export function Loader({ onFinished }: LoaderProps) {
    const { active, progress, item } = useProgress();
    const [displayedProgress, setDisplayedProgress] = useState(0);
    const [dots, setDots] = useState('');
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [needsManualStart, setNeedsManualStart] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
            const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
            setIsMobile(mobileRegex.test(userAgent) || window.innerWidth <= 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Minimum boot duration for aesthetics
    useEffect(() => {
        const timer = setTimeout(() => setMinTimeElapsed(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    // Progress calculation with smooth interpolation
    useEffect(() => {
        const interval = setInterval(() => {
            setDisplayedProgress((old) => {
                let realTarget = progress;

                if (!active) {
                    if (realTarget === 0) realTarget = 0;
                    else if (realTarget === 100) realTarget = 100;
                }

                let effectiveTarget = realTarget;
                if (!minTimeElapsed) {
                    effectiveTarget = Math.min(realTarget, 99);
                    if (effectiveTarget < 40) effectiveTarget = 40;
                }

                if (old >= 100 && effectiveTarget >= 100) return 100;

                const diff = effectiveTarget - old;
                if (diff <= 0) return old;

                const speed = minTimeElapsed ? 2.0 : 0.5;
                return Math.min(effectiveTarget, old + speed);
            });
        }, 20);
        return () => clearInterval(interval);
    }, [progress, active, minTimeElapsed]);

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(d => d.length >= 3 ? '' : d + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (displayedProgress >= 100 && minTimeElapsed) {
            if (isMobile) {
                setNeedsManualStart(true);
            } else {
                const timeout = setTimeout(() => onFinished(), 500);
                return () => clearTimeout(timeout);
            }
        }
    }, [displayedProgress, minTimeElapsed, onFinished, isMobile]);

    const handleManualStart = async () => {
        if (typeof document !== 'undefined') {
            const elem = document.documentElement as HTMLElement & {
                webkitRequestFullscreen?: () => Promise<void>;
                msRequestFullscreen?: () => Promise<void>;
            };
            try {
                if (elem.requestFullscreen) {
                    await elem.requestFullscreen();
                } else if (elem.webkitRequestFullscreen) { /* Safari */
                    await elem.webkitRequestFullscreen();
                } else if (elem.msRequestFullscreen) { /* IE11 */
                    await elem.msRequestFullscreen();
                }
            } catch (err) {
                console.warn("Fullscreen request failed or was denied.", err);
            }
        }
        onFinished();
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#050505',
            color: '#4af626',
            fontFamily: '"Courier New", Courier, monospace',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'all',
            transition: 'opacity 0.8s ease-out',
            opacity: displayedProgress >= 100 && !needsManualStart ? 0 : 1,
            overflow: 'hidden'
        }}>
            {/* Screen Container */}
            <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                background: '#111',
                boxShadow: 'inset 0 0 180px rgba(0,0,0,1)',
            }}>

                {/* Vignette */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.6) 100%)',
                    zIndex: 2,
                    pointerEvents: 'none'
                }} />

                {/* Scanlines */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(
                        to bottom,
                        rgba(255,255,255,0),
                        rgba(255,255,255,0) 50%,
                        rgba(0,0,0,0.15) 50%,
                        rgba(0,0,0,0.15)
                    )`,
                    backgroundSize: '100% 4px',
                    zIndex: 3,
                    pointerEvents: 'none'
                }} />

                {/* Flicker layer */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(18, 16, 16, 0.05)',
                    zIndex: 4,
                    pointerEvents: 'none',
                    animation: 'loader-flicker 0.15s infinite',
                }} />

                <style jsx>{`
                    @keyframes loader-flicker {
                        0% { opacity: 0.92; }
                        50% { opacity: 1.0; }
                        100% { opacity: 0.94; }
                    }
                `}</style>

                {/* Content */}
                <div style={{
                    width: '100%',
                    maxWidth: '600px',
                    textAlign: 'left',
                    zIndex: 5, // Content below effects
                    transform: 'perspective(500px) translate3d(0,0,0)',
                }}>
                    {/* Header */}
                    <div style={{
                        marginBottom: '2rem',
                        fontSize: '14px',
                        opacity: 0.7,
                        letterSpacing: '2px',
                        borderBottom: '1px solid #4af626',
                        paddingBottom: '10px'
                    }}>
                        KELETCH_OS v2.0 // SYSTEM_BOOT
                    </div>

                    {/* Main Status */}
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '1.5rem',
                        textShadow: '0 0 10px rgba(74, 246, 38, 0.5)'
                    }}>
                        INITIALIZING REALITY{dots}
                    </h1>

                    {/* Progress Bar Container */}
                    <div style={{
                        width: '100%',
                        height: '24px',
                        border: '2px solid #4af626',
                        padding: '2px',
                        marginBottom: '1rem',
                        boxShadow: '0 0 15px rgba(74, 246, 38, 0.2)'
                    }}>
                        {/* Progress Fill */}
                        <div style={{
                            width: `${displayedProgress}%`,
                            height: '100%',
                            background: '#4af626',
                            transition: 'width 0.1s linear',
                            boxShadow: '0 0 10px rgba(74, 246, 38, 0.5)'
                        }} />
                    </div>

                    {/* Stats Row */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '2rem',
                        fontSize: '14px'
                    }}>
                        <span>STATUS: {displayedProgress >= 100 ? 'READY' : 'LOADING'}</span>
                        <span>{Math.round(displayedProgress)}%</span>
                    </div>

                    {needsManualStart ? (
                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <button
                                onClick={handleManualStart}
                                style={{
                                    background: 'transparent',
                                    border: '2px solid #4af626',
                                    color: '#4af626',
                                    padding: '10px 20px',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    fontFamily: '"Courier New", Courier, monospace',
                                    fontWeight: 'bold',
                                    boxShadow: '0 0 10px rgba(74, 246, 38, 0.4)',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#4af626';
                                    e.currentTarget.style.color = '#000';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#4af626';
                                }}
                            >
                                [ START EXPERIENCE ]
                            </button>
                            <div style={{ fontSize: '11px', marginTop: '10px', opacity: 0.7 }}>
                                * Best viewed in landscape mode *
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            height: '20px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            fontSize: '12px',
                            opacity: 0.8,
                            color: '#33ff33'
                        }}>
                            {item ? `> LOADING: ${item}` : '> WAITING_FOR_STREAM...'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
