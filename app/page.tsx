'use client';

import dynamic from 'next/dynamic';

const TVScene = dynamic(() => import('@/components/TVScene'), {
    ssr: false,
    loading: () => (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            color: '#fff'
        }}>
            Cargando escena...
        </div>
    ),
});

export default function Home() {
    return <TVScene />;
}
