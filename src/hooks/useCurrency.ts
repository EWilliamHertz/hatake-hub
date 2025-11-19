import { useState, useEffect } from 'react';
import { getExchangeRates } from '@/lib/firebase-functions';

export type Currency = 'usd' | 'eur';

export const useCurrency = () => {
  const [currency, setCurrency] = useState<Currency>('usd');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currency === 'eur') {
      setLoading(true);
      getExchangeRates('USD')
        .then((result) => {
          setExchangeRate(result.rates.EUR || 0.85);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch exchange rates:', error);
          setExchangeRate(0.85); // Fallback rate
          setLoading(false);
        });
    } else {
      setExchangeRate(1);
    }
  }, [currency]);

  const convertPrice = (usdPrice: number | null | undefined): number | null => {
    if (!usdPrice) return null;
    return currency === 'usd' ? usdPrice : usdPrice * exchangeRate;
  };

  return { currency, setCurrency, convertPrice, loading };
};
