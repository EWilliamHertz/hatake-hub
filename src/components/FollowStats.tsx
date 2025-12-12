import { useFollowing } from '@/hooks/useFollowing';

interface FollowStatsProps {
  userId: string;
  className?: string;
}

export const FollowStats = ({ userId, className = '' }: FollowStatsProps) => {
  const { followersCount, followingCount } = useFollowing(userId);

  return (
    <div className={`flex gap-4 text-sm ${className}`}>
      <div className="text-center">
        <span className="font-semibold text-foreground">{followersCount}</span>
        <span className="text-muted-foreground ml-1">Followers</span>
      </div>
      <div className="text-center">
        <span className="font-semibold text-foreground">{followingCount}</span>
        <span className="text-muted-foreground ml-1">Following</span>
      </div>
    </div>
  );
};
