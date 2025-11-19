import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// ScryDex Card Search Function
export interface SearchScryDexParams {
  query: string;
  game: 'magic' | 'pokemon' | 'lorcana' | 'optcg';
  page?: number;
  limit?: number;
}

export interface CardResult {
  id: string;
  api_id: string;
  name: string;
  expansion: {
    id: string;
    name: string;
  };
  set_name: string;
  rarity: string;
  images: Array<{
    small: string;
    medium: string;
    large: string;
  }>;
  image_uris: {
    small: string;
    normal: string;
    large: string;
  };
  number: string;
  collector_number: string;
  game: string;
  prices: {
    usd: number | null;
    usd_foil: number | null;
    eur: number | null;
    eur_foil: number | null;
  };
}

export interface SearchResult {
  success: boolean;
  data: CardResult[];
  has_more: boolean;
  count?: number;
  error?: string;
}

export const searchScryDex = async (params: SearchScryDexParams): Promise<SearchResult> => {
  const searchFunction = params.game === 'optcg' 
    ? httpsCallable<SearchScryDexParams, SearchResult>(functions, 'searchOPTCG')
    : httpsCallable<SearchScryDexParams, SearchResult>(functions, 'searchScryDex');
  
  const result = await searchFunction(params);
  return result.data;
};

// Exchange Rates Function
export interface ExchangeRatesResult {
  rates: Record<string, number>;
}

export const getExchangeRates = async (baseCurrency: string = 'USD'): Promise<ExchangeRatesResult> => {
  const ratesFunction = httpsCallable<{ base: string }, ExchangeRatesResult>(
    functions,
    'getExchangeRates'
  );
  const result = await ratesFunction({ base: baseCurrency });
  return result.data;
};

// Wishlist Management Function
export interface WishlistParams {
  action: 'add' | 'remove';
  cardData: CardResult;
}

export const manageWishlist = async (params: WishlistParams) => {
  const wishlistFunction = httpsCallable(functions, 'manageWishlist');
  const result = await wishlistFunction(params);
  return result.data;
};

// Price History Function
export interface PriceHistoryParams {
  cardId: string;
  game: string;
}

export const getCardPriceHistory = async (params: PriceHistoryParams) => {
  const priceFunction = httpsCallable(functions, 'getCardPriceHistory');
  const result = await priceFunction(params);
  return result.data;
};
