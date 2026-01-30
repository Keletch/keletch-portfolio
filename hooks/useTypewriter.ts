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

    // Audio Ref
    const typingAudioRef = useRef<HTMLAudioElement | null>(null);

    // 1. Load typing sound
    useEffect(() => {
        if (enableStoryMode && typeof window !== 'undefined') {
            const audio = new Audio('/sounds/space.wav');
            audio.volume = 0.05;
            typingAudioRef.current = audio;
        }
    }, [enableStoryMode]);

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
        typingAudioRef
    };
}
