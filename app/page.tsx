'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Loader } from '@/components/UI/Loader';
import { OrientationWarning } from '@/components/UI/OrientationWarning';

const TVScene = dynamic(() => import('@/components/Scene/TVScene'), {
    ssr: false,
    loading: () => null,
});

export default function Home() {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <>
            <OrientationWarning />
            {!isLoaded && <Loader onFinished={() => setIsLoaded(true)} />}
            <TVScene isLoaded={isLoaded} />
        </>
    );
}
