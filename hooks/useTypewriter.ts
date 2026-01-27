import { useState, useEffect, useRef } from 'react';

interface UseTypewriterProps {
    storyContent?: string[];
    enableStoryMode?: boolean;
    onStoryEnd?: () => void;
}

export function useTypewriter({ storyContent, enableStoryMode, onStoryEnd }: UseTypewriterProps) {
    const [storyMode, setStoryMode] = useState(false);
    const [currentParagraph, setCurrentParagraph] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [waitingForInput, setWaitingForInput] = useState(false);
    const typingAudioRef = useRef<HTMLAudioElement | null>(null);

    const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Load typing sound
    useEffect(() => {
        if (enableStoryMode && typeof window !== 'undefined') {
            const audio = new Audio('/sounds/space.wav');
            audio.volume = 0.05;
            typingAudioRef.current = audio;
        }
    }, [enableStoryMode]);

    // 2. Start Story Mode trigger
    const startStory = () => {
        if (enableStoryMode && storyContent && storyContent.length > 0) {
            setStoryMode(true);
            setCurrentParagraph(0);
            setDisplayedText('');
            setIsTyping(true);
            setWaitingForInput(false);
        }
    };

    // 3. Typewriter Effect Logic
    useEffect(() => {
        if (!storyMode || !isTyping || !storyContent) return;

        const currentText = storyContent[currentParagraph] || '';
        if (displayedText.length >= currentText.length) {
            setIsTyping(false);
            setWaitingForInput(true);
            return;
        }

        typingTimerRef.current = setTimeout(() => {
            setDisplayedText(currentText.slice(0, displayedText.length + 1));

            if (typingAudioRef.current) {
                typingAudioRef.current.playbackRate = 0.9 + Math.random() * 0.3;
                typingAudioRef.current.currentTime = 0;
                typingAudioRef.current.play().catch(e => console.warn('Audio play failed', e));
            }
        }, 50);

        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        };
    }, [storyMode, isTyping, displayedText, currentParagraph, storyContent]);

    // Unified Interaction Handler
    const handleInteraction = () => {
        if (!storyMode || !storyContent) return;

        if (isTyping) {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

            const currentText = storyContent[currentParagraph] || '';
            setDisplayedText(currentText);
            setIsTyping(false);
            setWaitingForInput(true);
            return;
        }

        if (waitingForInput) {
            if (currentParagraph < storyContent.length - 1) {
                setCurrentParagraph(prev => prev + 1);
                setDisplayedText('');
                setIsTyping(true);
                setWaitingForInput(false);
            } else {
                setStoryMode(false);
                setCurrentParagraph(0);
                setDisplayedText('');
                setIsTyping(false);
                setWaitingForInput(false);
                if (onStoryEnd) onStoryEnd();
            }
        }
    };

    useEffect(() => {
        if (!storyMode) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                handleInteraction();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [storyMode, isTyping, waitingForInput, storyContent, currentParagraph]);

    const stopStory = () => {
        setStoryMode(false);
        setCurrentParagraph(0);
        setDisplayedText('');
        setIsTyping(false);
        setWaitingForInput(false);
    };

    return {
        storyMode,
        displayedText,
        waitingForInput,
        isTyping, // Export this so we know if we can skip
        currentParagraph,
        startStory,
        stopStory,
        handleInteraction // NEW export
    };
}
