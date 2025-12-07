import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Currency } from "@/hooks/useCurrency";

interface TradingCardProps {
  id: string;
  name: string;
  set: string;
  rarity: string;
  imageUrl?: string;
  isFoil?: boolean;
  price?: number | null;
  priceEur?: number | null;
  currency?: Currency;
  className?: string;
}

export const TradingCard = ({
  name,
  set,
  rarity,
  imageUrl,
  isFoil = false,
  price,
  priceEur,
  currency = 'USD',
  className,
}: TradingCardProps) => {
  // Use native EUR price from Scryfall when EUR is selected
  const displayPrice = currency === 'EUR' && priceEur != null ? priceEur : price;
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:scale-105 cursor-pointer group",
        className
      )}
    >
      {/* Card Image Container */}
      <div className="aspect-[2.5/3.5] bg-muted relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <span className="text-sm">No Image</span>
          </div>
        )}
        
        {/* Rainbow Foil Effect Overlay */}
        {isFoil && (
          <div className="rainbow-foil" />
        )}
      </div>

      {/* Card Info */}
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-sm truncate">{name}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate max-w-[60%]">{set}</span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px]",
              rarity === "Rare" && "bg-primary/20 text-primary",
              rarity === "Uncommon" && "bg-secondary/50 text-secondary-foreground",
              rarity === "Common" && "bg-muted"
            )}
          >
            {rarity || 'Common'}
          </span>
        </div>
        {displayPrice !== undefined && displayPrice !== null && (
          <div className="text-sm font-semibold text-primary">
            {currency === 'USD'
              ? '$'
              : currency === 'EUR'
              ? '€'
              : currency === 'DKK' || currency === 'SEK'
              ? 'kr'
              : '$'}
            {displayPrice.toFixed(2)}
          </div>
        )}
      </div>
    </Card>
  );
};
