import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterProps {
    storyContent?: string[];
    enableStoryMode?: boolean;
    onStoryEnd?: () => void;
}

export function useTypewriter({ storyContent, enableStoryMode, onStoryEnd }: UseTypewriterProps) {
    const [storyMode, setStoryMode] = useState(false);
    const [currentParagraph, setCurrentParagraph] = useState(0);
    const [waitingForInput, setWaitingForInput] = useState(false);

    // Time-based approach for Canvas (no re-renders on every char)
    const [typingStartTime, setTypingStartTime] = useState(0);
    const isTypingRef = useRef(false);

    // Audio Context & Buffer
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);

    // 1. Load typing sound (Web Audio API)
    useEffect(() => {
        if (enableStoryMode && typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            fetch('/sounds/Bubbles.m4a')
                .then(res => res.arrayBuffer())
                .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
                .then(decodedAudio => {
                    audioBufferRef.current = decodedAudio;
                })
                .catch(err => console.error("Error loading typewriter sound:", err));

            return () => {
                ctx.close();
            };
        }
    }, [enableStoryMode]);

    // Helper to play sound with variation
    const playTypewriterSound = useCallback(() => {
        const ctx = audioContextRef.current;
        const buffer = audioBufferRef.current;

        if (!ctx || !buffer) return;

        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => { });
        }

        if (ctx.state === 'running' || ctx.state === 'suspended') {
            try {
                const source = ctx.createBufferSource();
                const gainNode = ctx.createGain();

                source.buffer = buffer;

                // Varied Pitch: 0.5 to 2.0 (Deep bubbles to light bubbles)
                source.playbackRate.value = 0.5 + Math.random() * 1.5;

                // Base volume 0.05 (very subtle)
                const baseVolume = 0.05;
                const volumeVariation = Math.random() * 0.02;
                const volume = baseVolume + volumeVariation;

                // Envelope: Attack -> Hold -> Fade Out
                const now = ctx.currentTime;
                const duration = buffer.duration;
                // Ensure fade out happens before end of file to prevent clicking
                const fadeDuration = Math.min(duration * 0.5, 0.2);

                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Quick attack
                gainNode.gain.setValueAtTime(volume, now + duration - fadeDuration);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Smooth Fade Out

                source.connect(gainNode);
                gainNode.connect(ctx.destination);
                source.start(0);
            } catch (e) {
                // Ignore audio errors
            }
        }
    }, []);

    // 2. Start Story Mode trigger
    const startStory = useCallback(() => {
        if (enableStoryMode && storyContent && storyContent.length > 0) {
            setStoryMode(true);
            setCurrentParagraph(0);
            setWaitingForInput(false);
            setTypingStartTime(Date.now());
            isTypingRef.current = true;
        }
    }, [enableStoryMode, storyContent]);

    // 3. Stop Story
    const stopStory = useCallback(() => {
        setStoryMode(false);
        setWaitingForInput(false);
        isTypingRef.current = false;
    }, []);

    // 4. Signal from Consumer (Canvas) that typing is finished
    const signalTypingFinished = useCallback(() => {
        if (isTypingRef.current) {
            isTypingRef.current = false;
            setWaitingForInput(true);
        }
    }, []);

    // 5. Interaction Handler (Next Paragraph)
    const handleInteraction = useCallback(() => {
        if (!storyMode || !storyContent) return;

        // If currently typing, skip to end
        if (isTypingRef.current) {
            // Consumer checks `waitingForInput`. If false but `storyMode` true, check `isTypingRef`.
            // We force finish.
            signalTypingFinished();
            return;
        }

        // If waiting for input (arrow visible), go next
        if (waitingForInput) {
            if (currentParagraph < storyContent.length - 1) {
                setCurrentParagraph(prev => prev + 1);
                setWaitingForInput(false);
                setTypingStartTime(Date.now());
                isTypingRef.current = true;
            } else {
                // End of story
                stopStory();
                if (onStoryEnd) onStoryEnd();
            }
        }
    }, [storyMode, storyContent, currentParagraph, waitingForInput, onStoryEnd, stopStory, signalTypingFinished]);

    // Keyboard Listener
    useEffect(() => {
        if (!storyMode) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                handleInteraction();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [storyMode, handleInteraction]);

    return {
        storyMode,
        currentParagraph,
        waitingForInput,
        typingStartTime,
        startStory,
        stopStory,
        handleInteraction,
        signalTypingFinished,
        playTypewriterSound
    };
}
