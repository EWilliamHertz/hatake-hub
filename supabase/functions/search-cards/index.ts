import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchParams {
  query: string;
  game: 'mtg' | 'pokemon' | 'lorcana' | 'optcg';
  page?: number;
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, game, page = 1, limit = 20 }: SearchParams = await req.json();
    
    console.log(`Searching ${game} for: ${query}`);
    
    let results;
    
    if (game === 'mtg') {
      // Use Scryfall API for Magic cards
      const searchUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&page=${page}`;
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.object === 'error') {
        return new Response(JSON.stringify({ success: true, data: [], has_more: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      results = {
        success: true,
        data: data.data?.map((card: any) => ({
          id: card.id,
          api_id: card.id,
          name: card.name,
          set_name: card.set_name,
          collector_number: card.collector_number,
          rarity: card.rarity,
          game: 'mtg',
          image_uris: card.image_uris || (card.card_faces?.[0]?.image_uris),
          images: card.image_uris ? [{
            small: card.image_uris.small,
            medium: card.image_uris.normal,
            large: card.image_uris.large,
          }] : [],
          prices: {
            usd: card.prices?.usd ? parseFloat(card.prices.usd) : null,
            usd_foil: card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
            eur: card.prices?.eur ? parseFloat(card.prices.eur) : null,
            eur_foil: card.prices?.eur_foil ? parseFloat(card.prices.eur_foil) : null,
          },
        })) || [],
        has_more: data.has_more || false,
        count: data.total_cards,
      };
    } else if (game === 'pokemon') {
      // Use Pokemon TCG API
      const searchUrl = `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(query)}*&page=${page}&pageSize=${limit}`;
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      results = {
        success: true,
        data: data.data?.map((card: any) => ({
          id: card.id,
          api_id: card.id,
          name: card.name,
          set_name: card.set?.name,
          collector_number: card.number,
          rarity: card.rarity,
          game: 'pokemon',
          image_uris: {
            small: card.images?.small,
            normal: card.images?.large,
            large: card.images?.large,
          },
          images: [{
            small: card.images?.small,
            medium: card.images?.large,
            large: card.images?.large,
          }],
          prices: {
            usd: card.tcgplayer?.prices?.holofoil?.market || card.tcgplayer?.prices?.normal?.market || null,
            usd_foil: card.tcgplayer?.prices?.holofoil?.market || null,
            eur: null,
            eur_foil: null,
          },
        })) || [],
        has_more: data.page < data.totalCount / limit,
        count: data.totalCount,
      };
    } else {
      // Generic fallback
      results = {
        success: true,
        data: [],
        has_more: false,
        count: 0,
      };
    }
    
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Search error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      data: [], 
      has_more: false, 
      error: message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
