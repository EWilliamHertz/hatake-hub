import { useState } from 'react';
import { searchScryDex, SearchScryDexParams, CardResult } from '@/lib/firebase-functions';
import { toast } from 'sonner';

export const useCardSearch = () => {
  const [cards, setCards] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const search = async (params: SearchScryDexParams) => {
    if (!params.query || params.query.length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    setCards([]); // Clear previous results
    
    try {
      const result = await searchScryDex(params);
      
      if (result.success && result.data.length > 0) {
        setCards(result.data);
        setHasMore(result.has_more);
        toast.success(`Found ${result.count || result.data.length} cards`);
      } else if (result.error) {
        toast.error(result.error);
        setCards([]);
        setHasMore(false);
      } else {
        toast.info('No cards found');
        setCards([]);
        setHasMore(false);
      }
    } catch (error: any) {
      console.error('Card search error:', error);
      const errorMsg = error?.message || 'Failed to search cards. Please try again.';
      toast.error(errorMsg);
      setCards([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  return { cards, loading, hasMore, search };
};
