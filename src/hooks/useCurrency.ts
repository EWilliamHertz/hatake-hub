import { useState, useEffect } from 'react';
import { getExchangeRates } from '@/lib/firebase-functions';

export type Currency = 'USD' | 'EUR' | 'DKK' | 'SEK';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  DKK: 'kr',
  SEK: 'kr'
};

export const useCurrency = () => {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USD: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getExchangeRates('USD')
      .then((result) => {
        setExchangeRates(result.rates);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch exchange rates:', error);
        // Fallback rates
        setExchangeRates({ USD: 1, EUR: 0.92, DKK: 6.87, SEK: 10.45 });
        setLoading(false);
      });
  }, []);

  const convertPrice = (usdPrice: number | null | undefined): number | null => {
    if (!usdPrice) return null;
    const rate = exchangeRates[currency] || 1;
    return usdPrice * rate;
  };

  const formatPrice = (price: number | null): string => {
    if (!price) return 'N/A';
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol}${price.toFixed(2)}`;
  };

  return { currency, setCurrency, convertPrice, formatPrice, loading };
};
