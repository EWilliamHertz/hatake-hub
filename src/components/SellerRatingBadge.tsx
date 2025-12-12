import { Star, Shield, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SellerRatingBadgeProps {
  rating: number;
  totalRatings: number;
  isVerified?: boolean;
  totalSales?: number;
  showDetails?: boolean;
}

export const SellerRatingBadge = ({
  rating,
  totalRatings,
  isVerified = false,
  totalSales = 0,
  showDetails = false
}: SellerRatingBadgeProps) => {
  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.round(count) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <div className="flex items-center gap-2">
      {isVerified && (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Verified seller with {totalSales}+ successful sales</p>
          </TooltipContent>
        </Tooltip>
      )}
      
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1">
            {renderStars(rating)}
            {showDetails && (
              <span className="text-xs text-muted-foreground ml-1">
                ({totalRatings})
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {rating.toFixed(1)} out of 5 ({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
