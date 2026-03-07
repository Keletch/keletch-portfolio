import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '@/components/store/useSettingsStore';

interface UseTypewriterProps {
    storyContent?: string[];
    enableStoryMode?: boolean;
    onStoryEnd?: () => void;
}

export function useTypewriter({ storyContent, enableStoryMode, onStoryEnd }: UseTypewriterProps) {
    const bubblesVolume = useSettingsStore(state => state.bubblesVolume);
    const [storyMode, setStoryMode] = useState(false);
    const [currentParagraph, setCurrentParagraph] = useState(0);
    const [waitingForInput, setWaitingForInput] = useState(false);

    // Typing start time for canvas
    const [typingStartTime, setTypingStartTime] = useState(0);
    const isTypingRef = useRef(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);

    // Story sound loading
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

    // Typewriter bubble sound
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
                source.playbackRate.value = 0.5 + Math.random() * 1.5;

                const baseVolume = 0.15 * bubblesVolume;
                const volumeVariation = Math.random() * 0.02 * bubblesVolume;
                const volume = baseVolume + volumeVariation;

                const now = ctx.currentTime;
                const duration = buffer.duration;
                const fadeDuration = Math.min(duration * 0.5, 0.2);

                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
                gainNode.gain.setValueAtTime(volume, now + duration - fadeDuration);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

                source.connect(gainNode);
                gainNode.connect(ctx.destination);
                source.start(0);
            } catch (e) { }
        }
    }, [bubblesVolume]);

    const startStory = useCallback(() => {
        if (enableStoryMode && storyContent && storyContent.length > 0) {
            setStoryMode(true);
            setCurrentParagraph(0);
            setWaitingForInput(false);
            setTypingStartTime(Date.now());
            isTypingRef.current = true;
        }
    }, [enableStoryMode, storyContent]);

    const stopStory = useCallback(() => {
        setStoryMode(false);
        setWaitingForInput(false);
        isTypingRef.current = false;
    }, []);

    const signalTypingFinished = useCallback(() => {
        if (isTypingRef.current) {
            isTypingRef.current = false;
            setWaitingForInput(true);
        }
    }, []);

    const handleInteraction = useCallback(() => {
        if (!storyMode || !storyContent) return;

        if (isTypingRef.current) {
            signalTypingFinished();
            return;
        }

        if (waitingForInput) {
            if (currentParagraph < storyContent.length - 1) {
                setCurrentParagraph(prev => prev + 1);
                setWaitingForInput(false);
                setTypingStartTime(Date.now());
                isTypingRef.current = true;
            } else {
                stopStory();
                if (onStoryEnd) onStoryEnd();
            }
        }
    }, [storyMode, storyContent, currentParagraph, waitingForInput, onStoryEnd, stopStory, signalTypingFinished]);

    useEffect(() => {
        if (!storyMode) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                handleInteraction();
            }
        };

        const onMouseDown = () => handleInteraction();

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('mousedown', onMouseDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('mousedown', onMouseDown);
        }
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
