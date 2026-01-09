import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Keletch Portfolio | Welcome',
    description: 'Keletch Portfolio | Welcome to my portfolio',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body>{children}</body>
        </html>
    );
}
