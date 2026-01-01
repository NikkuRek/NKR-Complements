'use client';

import { useState, useEffect, useRef } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const API_ERROR_EVENT = 'api-error';

export const triggerApiError = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(API_ERROR_EVENT));
    }
};

export default function Toast() {
    const [isVisible, setIsVisible] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleApiError = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            setIsVisible(true);
            timerRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
        };

        window.addEventListener(API_ERROR_EVENT, handleApiError);
        return () => {
            window.removeEventListener(API_ERROR_EVENT, handleApiError);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 pt-6 flex justify-center z-[100] pointer-events-none">
            <div className="pointer-events-auto animate-slide-down glass-panel px-6 py-4 rounded-full border border-red-500/30 bg-red-500/10 backdrop-blur-md shadow-[0_0_30px_rgba(239,68,68,0.3)] flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-full">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-white font-medium text-sm tracking-wide">
                    Servidor sin Respuesta
                </span>
            </div>
        </div>
    );
}

// Add strict types for typescript if needed, but Event is standard.
