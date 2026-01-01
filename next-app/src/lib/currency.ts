import { Currency } from '@/types/denarius';

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
    rateUSD: number,
    rateUSDT: number
): number {
    if (fromCurrency === toCurrency) return amount;

    // Convert from source to target
    if (toCurrency === 'VES') {
        if (fromCurrency === 'USD') return amount * rateUSD;
        if (fromCurrency === 'USDT') return amount * rateUSDT;
    }

    if (toCurrency === 'USD') {
        if (fromCurrency === 'VES') return amount / rateUSD;
        if (fromCurrency === 'USDT') return (amount * rateUSDT) / rateUSD;
    }

    if (toCurrency === 'USDT') {
        if (fromCurrency === 'VES') return amount / rateUSDT;
        if (fromCurrency === 'USD') return (amount * rateUSD) / rateUSDT;
    }

    return amount;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(
    amount: number,
    currency: Currency,
    decimals: number = 2
): string {
    const formatted = formatNumberWithLocale(amount, decimals);

    const symbols: Record<Currency, string> = {
        USD: '$',
        VES: 'Bs.',
        USDT: '₮',
    };

    return `${symbols[currency]} ${formatted}`;
}

/**
 * Parse string to float safely
 */
export function parseAmount(value: string): number {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
    const symbols: Record<Currency, string> = {
        USD: '$',
        VES: 'Bs.',
        USDT: '₮',
    };
    return symbols[currency] || '$';
}

/**
 * Format number with European/Latin American locale format
 * Uses dots for thousands separator and commas for decimals
 * Examples: 1000 -> "1.000,00", 1000000 -> "1.000.000,00"
 */
export function formatNumberWithLocale(value: number, decimals: number = 2): string {
    const [integerPart, decimalPart] = value.toFixed(decimals).split('.');

    // Add dots for thousands separator
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Return with comma as decimal separator
    return `${formattedInteger},${decimalPart}`;
}
