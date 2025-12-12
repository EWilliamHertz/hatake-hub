import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useFollowing = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const checkFollowStatus = useCallback(async () => {
    if (!user?.uid || !targetUserId) return;

    const { data } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.uid)
      .eq('following_id', targetUserId)
      .single();

    setIsFollowing(!!data);
  }, [user?.uid, targetUserId]);

  const fetchFollowCounts = useCallback(async (userId: string) => {
    const [followersResult, followingResult] = await Promise.all([
      supabase.from('user_follows').select('id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('user_follows').select('id', { count: 'exact' }).eq('follower_id', userId)
    ]);

    setFollowersCount(followersResult.count || 0);
    setFollowingCount(followingResult.count || 0);
  }, []);

  useEffect(() => {
    if (targetUserId) {
      checkFollowStatus();
      fetchFollowCounts(targetUserId);
    }
  }, [targetUserId, checkFollowStatus, fetchFollowCounts]);

  const toggleFollow = async () => {
    if (!user?.uid || !targetUserId || loading) return;
    
    setLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.uid)
          .eq('following_id', targetUserId);

        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        toast.success('Unfollowed');
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.uid, following_id: targetUserId });

        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success('Following!');
        
        // Create notification for the followed user
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          sender_id: user.uid,
          type: 'follow',
          title: 'New Follower',
          message: `Someone started following you`,
          link: `/profile/${user.uid}`
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  const getFollowedUserIds = async (): Promise<string[]> => {
    if (!user?.uid) return [];

    const { data } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.uid);

    return data?.map(f => f.following_id) || [];
  };

  return {
    isFollowing,
    followersCount,
    followingCount,
    loading,
    toggleFollow,
    getFollowedUserIds
  };
};
