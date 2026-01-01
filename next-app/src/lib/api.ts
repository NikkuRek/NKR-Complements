/**
 * Centralized API client for backend communication
 */

import { triggerApiError } from '@/components/ui/Toast';

interface FetchOptions extends RequestInit {
    params?: Record<string, string>;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: FetchOptions = {}
    ): Promise<T> {
        const { params, ...fetchOptions } = options;

        let url = `${this.baseUrl}${endpoint}`;

        // Add query parameters if provided
        if (params) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                headers: {
                    'Content-Type': 'application/json',
                    ...fetchOptions.headers,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `API Error: ${response.status} - ${errorText || response.statusText}`
                );
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);

            // Definitively identify network/connection errors
            // If it's the error we threw above, it starts with "API Error"
            const isApiError = error instanceof Error && error.message.startsWith('API Error');

            if (!isApiError) {
                // It's likely a network failure (TypeError: Failed to fetch)
                triggerApiError();
            }

            throw error;
        }
    }

    async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', params });
    }

    async post<T>(endpoint: string, data: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put<T>(endpoint: string, data: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

// Create API clients for each backend
export const denariusApi = new ApiClient(
    process.env.NEXT_PUBLIC_DENARIUS_API || 'https://denarius-backend.onrender.com/api'
);

export const glasseApi = new ApiClient(
    process.env.NEXT_PUBLIC_GLASSE_API || 'http://localhost:3001/api'
);
