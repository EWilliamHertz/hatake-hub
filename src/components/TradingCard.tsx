import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface TradingCardProps {
  id: string;
  name: string;
  set: string;
  rarity: string;
  imageUrl?: string;
  isFoil?: boolean;
  className?: string;
}

export const TradingCard = ({
  name,
  set,
  rarity,
  imageUrl,
  isFoil = false,
  className,
}: TradingCardProps) => {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:scale-105 cursor-pointer",
        isFoil && "foil-effect",
        className
      )}
    >
      {/* Foil Badge */}
      {isFoil && (
        <div className="absolute top-2 right-2 z-10 bg-gold/20 backdrop-blur-sm rounded-full p-1.5 border border-gold">
          <Star className="h-4 w-4 text-gold fill-gold" />
        </div>
      )}

      {/* Card Image */}
      <div className="aspect-[2.5/3.5] bg-muted relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <span className="text-sm">No Image</span>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-sm truncate">{name}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{set}</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full",
            rarity === "Rare" && "bg-primary/20 text-primary",
            rarity === "Uncommon" && "bg-secondary/50 text-secondary-foreground",
            rarity === "Common" && "bg-muted"
          )}>
            {rarity}
          </span>
        </div>
      </div>
    </Card>
  );
};
