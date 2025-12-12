import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SellerRating {
  id: string;
  rating: number;
  review: string | null;
  buyer_id: string;
  created_at: string;
  buyer_profile?: {
    display_name: string | null;
    photo_url: string | null;
  };
}

interface SellerStats {
  averageRating: number;
  totalRatings: number;
  isVerified: boolean;
  totalSales: number;
}

export const useSellerRating = (sellerId?: string) => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<SellerRating[]>([]);
  const [stats, setStats] = useState<SellerStats>({
    averageRating: 0,
    totalRatings: 0,
    isVerified: false,
    totalSales: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchRatings = useCallback(async () => {
    if (!sellerId) return;

    setLoading(true);
    try {
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('seller_ratings')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ratingsError) throw ratingsError;

      // Fetch buyer profiles separately
      if (ratingsData && ratingsData.length > 0) {
        const buyerIds = [...new Set(ratingsData.map(r => r.buyer_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, photo_url')
          .in('id', buyerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));
        
        const ratingsWithProfiles = ratingsData.map(r => ({
          ...r,
          buyer_profile: profileMap.get(r.buyer_id)
        }));
        
        setRatings(ratingsWithProfiles);
      } else {
        setRatings([]);
      }

      // Fetch seller stats
      const { data: profileData } = await supabase
        .from('profiles')
        .select('seller_rating, is_verified_seller, total_sales')
        .eq('id', sellerId)
        .single();

      const { count } = await supabase
        .from('seller_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId);

      setStats({
        averageRating: profileData?.seller_rating || 0,
        totalRatings: count || 0,
        isVerified: profileData?.is_verified_seller || false,
        totalSales: profileData?.total_sales || 0
      });
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const submitRating = async (rating: number, review: string, transactionId?: string) => {
    if (!user?.uid || !sellerId) {
      toast.error('You must be logged in to rate');
      return false;
    }

    if (user.uid === sellerId) {
      toast.error('You cannot rate yourself');
      return false;
    }

    try {
      const { error } = await supabase.from('seller_ratings').insert({
        seller_id: sellerId,
        buyer_id: user.uid,
        rating,
        review: review || null,
        transaction_id: transactionId || null
      });

      if (error) throw error;

      toast.success('Rating submitted!');
      fetchRatings();
      
      // Notify seller
      await supabase.from('notifications').insert({
        user_id: sellerId,
        sender_id: user.uid,
        type: 'rating',
        title: 'New Rating',
        message: `You received a ${rating}-star rating`,
        link: `/profile/${sellerId}`
      });

      return true;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('You already rated this transaction');
      } else {
        toast.error('Failed to submit rating');
      }
      return false;
    }
  };

  return {
    ratings,
    stats,
    loading,
    submitRating,
    refetch: fetchRatings
  };
};
