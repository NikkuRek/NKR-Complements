import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import Toast from '@/components/ui/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'NKR Complements',
    description: 'Suite de herramientas de gestión personal',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <head>
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
                    crossOrigin="anonymous"
                />
            </head>
            <body className={inter.className}>
                {children}
                <Toast />
            </body>
        </html>
    );
}
