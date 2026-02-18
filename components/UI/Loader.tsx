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

    // Enforce minimum 2-second "Boot Sequence"
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Progress Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setDisplayedProgress((old) => {
                // 1. Calculate the "Real" target based on loading status
                let realTarget = progress;

                // If inactive, we need to decide if we are "Done" or "Waiting"
                if (!active) {
                    // If we have 0 progress and inactive, but we just mounted, 
                    // it might be "waiting to start" or "cached/done".
                    // We'll let the "minTime" decide.
                    if (realTarget === 0) realTarget = 0;
                    else if (realTarget === 100) realTarget = 100;
                }

                // 2. Enforce "Fake" Progress during Boot (0 -> 40% over 2s)
                // If minTime hasn't passed, ensure we are AT LEAST moving towards 40%
                let effectiveTarget = realTarget;
                if (!minTimeElapsed) {
                    // If real loading is fast, we still show the boot sequence.
                    // We cap real progress at 99% until minTime passes to prevent premature finish.
                    effectiveTarget = Math.min(realTarget, 99);

                    // Ensure we are at least simulating some activity
                    if (effectiveTarget < 40) effectiveTarget = 40;
                }

                // 3. Smooth Interpolation
                if (old >= 100 && effectiveTarget >= 100) return 100;

                const diff = effectiveTarget - old;
                if (diff === 0) return old;

                // Move constant speed for boot, faster for real load
                const speed = minTimeElapsed ? 2.0 : 0.5;
                const step = diff > 0 ? speed : -speed; // Allow backward correction if needed? No, usually forward.

                // Only move forward
                if (diff <= 0) return old;

                return Math.min(effectiveTarget, old + step);
            });
        }, 20);
        return () => clearInterval(interval);
    }, [progress, active, minTimeElapsed]);

    // Blinking dots animation
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(d => d.length >= 3 ? '' : d + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Completion trigger
    useEffect(() => {
        // Only finish if:
        // 1. Visually at 100%
        // 2. Minimum time has passed
        // 3. (Optional) Actually finished loading (implied by 100%)
        if (displayedProgress >= 100 && minTimeElapsed) {
            const timeout = setTimeout(() => {
                onFinished();
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [displayedProgress, minTimeElapsed, onFinished]);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#050505', // Deep dark grey (Phosphor "Off" state), not pure black
            color: '#4af626',
            fontFamily: '"Courier New", Courier, monospace',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'all',
            transition: 'opacity 0.8s ease-out',
            opacity: displayedProgress >= 100 ? 0 : 1,
            overflow: 'hidden'
        }}>
            {/* Screen Container with Curvature */}
            <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                // Simulate the physical screen curvature
                background: '#111',
                boxShadow: 'inset 0 0 180px rgba(0,0,0,1)', // Deep tube shadow
            }}>

                {/* --- CSS CRT EMULATION LAYERS --- */}

                {/* 1. CURVATURE / VIGNETTE SHADOW */}
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

                {/* 2. SCANLINES */}
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

                {/* 3. FLICKER */}
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

                {/* --- CONTENT (Below CRT Layers) --- */}
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

                    {/* Current Asset Log */}
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
                </div>
            </div>
        </div>
    );
}
