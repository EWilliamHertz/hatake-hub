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
    try {
      const result = await searchScryDex(params);
      
      if (result.success) {
        setCards(result.data);
        setHasMore(result.has_more);
        toast.success(`Found ${result.count || result.data.length} cards`);
      } else {
        toast.error(result.error || 'Search failed');
        setCards([]);
      }
    } catch (error) {
      console.error('Card search error:', error);
      toast.error('Failed to search cards. Please try again.');
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  return { cards, loading, hasMore, search };
};
