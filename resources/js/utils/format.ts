export function formatPrice(price: number | null, currency: string): string {
    if (price === null) return 'Zapytaj o cenę';
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(price));
}

/**
 * Polish pluralization for common nouns.
 * Polish has 3 forms: singular (1), plural-few (2-4, 22-24, ...), plural-many (5-21, 25-31, ...)
 */
export function pluralizePl(count: number, one: string, few: string, many: string): string {
    const abs = Math.abs(count);
    const lastTwo = abs % 100;
    const lastOne = abs % 10;

    if (count === 1) return one;
    if (lastTwo >= 10 && lastTwo <= 20) return many;
    if (lastOne >= 2 && lastOne <= 4) return few;
    return many;
}
