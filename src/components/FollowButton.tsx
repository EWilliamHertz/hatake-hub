import { Button } from '@/components/ui/button';
import { useFollowing } from '@/hooks/useFollowing';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface FollowButtonProps {
  targetUserId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
}

export const FollowButton = ({ 
  targetUserId, 
  variant = 'default',
  size = 'default',
  showIcon = true 
}: FollowButtonProps) => {
  const { user } = useAuth();
  const { isFollowing, loading, toggleFollow } = useFollowing(targetUserId);

  // Don't show follow button for own profile
  if (user?.uid === targetUserId) return null;

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={toggleFollow}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          {showIcon && <UserCheck className="h-4 w-4" />}
          Following
        </>
      ) : (
        <>
          {showIcon && <UserPlus className="h-4 w-4" />}
          Follow
        </>
      )}
    </Button>
  );
};
