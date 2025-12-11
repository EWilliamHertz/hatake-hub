import { supabase } from "@/integrations/supabase/client";

// Card Search
export interface SearchParams {
  query: string;
  game: 'mtg' | 'pokemon' | 'lorcana' | 'optcg';
  page?: number;
  limit?: number;
}

export interface CardResult {
  id: string;
  api_id: string;
  name: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  game: string;
  image_uris: {
    small: string;
    normal: string;
    large: string;
  };
  images: Array<{
    small: string;
    medium: string;
    large: string;
  }>;
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

export const searchCards = async (params: SearchParams): Promise<SearchResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('search-cards', {
      body: params
    });
    
    if (error) throw error;
    return data as SearchResult;
  } catch (error: unknown) {
    console.error('Search error:', error);
    return {
      success: false,
      data: [],
      has_more: false,
      error: error instanceof Error ? error.message : 'Search failed'
    };
  }
};

// Checkout
export interface CheckoutParams {
  lineItems: Array<{
    price: string;
    quantity: number;
  }>;
  successUrl: string;
  cancelUrl: string;
}

export const createCheckoutSession = async (params: CheckoutParams) => {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: params
  });
  
  if (error) throw error;
  return data as { id: string; url?: string };
};

// Exchange Rates
export interface ExchangeRatesResult {
  rates: Record<string, number>;
  base: string;
  date: string;
}

export const getExchangeRates = async (baseCurrency: string = 'USD'): Promise<ExchangeRatesResult> => {
  const { data, error } = await supabase.functions.invoke('get-exchange-rates', {
    body: { base: baseCurrency }
  });
  
  if (error) throw error;
  return data as ExchangeRatesResult;
};
