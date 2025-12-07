import { useRef, useEffect, useState, CSSProperties, ComponentType } from "react";
import { TradingCard } from "./TradingCard";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Currency } from "@/hooks/useCurrency";

// Dynamic import for react-window to handle type issues
let List: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const reactWindow = require("react-window");
  List = reactWindow.FixedSizeList;
} catch (e) {
  console.warn("react-window not available, using fallback");
}

interface CardData {
  id: string;
  name: string;
  set_name: string;
  rarity: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
  };
  is_foil?: boolean;
  quantity?: number;
  prices?: {
    usd?: number | null;
    usd_foil?: number | null;
    eur?: number | null;
    eur_foil?: number | null;
  };
}

interface VirtualizedCardGridProps {
  cards: CardData[];
  cardSize: number;
  currency: Currency;
  convertPrice: (price: number | null | undefined) => number | null;
  selectionMode?: boolean;
  selectedCardIds?: Set<string>;
  onCardClick?: (card: CardData) => void;
  onCardSelect?: (cardId: string, selected: boolean) => void;
}

export const VirtualizedCardGrid = ({
  cards,
  cardSize,
  currency,
  convertPrice,
  selectionMode = false,
  selectedCardIds = new Set(),
  onCardClick,
  onCardSelect,
}: VirtualizedCardGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Calculate grid dimensions
  const gap = 16;
  const columnWidth = cardSize + gap;
  const rowHeight = cardSize * 1.6 + gap;
  const columnCount = Math.max(1, Math.floor((dimensions.width - gap) / columnWidth));
  const rowCount = Math.ceil(cards.length / columnCount);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: window.innerHeight - 250,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const renderCard = (card: CardData) => {
    const isSelected = selectedCardIds.has(card.id);
    const price = card.is_foil ? card.prices?.usd_foil : card.prices?.usd;
    const priceEur = card.is_foil ? card.prices?.eur_foil : card.prices?.eur;

    return (
      <div
        key={card.id}
        style={{ width: cardSize }}
        className={`relative cursor-pointer flex-shrink-0 ${
          selectionMode && isSelected ? "ring-2 ring-primary rounded-lg" : ""
        }`}
        onClick={() => {
          if (selectionMode && onCardSelect) {
            onCardSelect(card.id, !isSelected);
          } else if (onCardClick) {
            onCardClick(card);
          }
        }}
      >
        {selectionMode && (
          <div className="absolute top-2 left-2 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                if (onCardSelect) {
                  onCardSelect(card.id, checked === true);
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        <TradingCard
          id={card.id}
          name={card.name}
          set={card.set_name}
          rarity={card.rarity}
          imageUrl={card.image_uris?.normal || card.image_uris?.small}
          isFoil={card.is_foil}
          price={convertPrice(price ?? null)}
          priceEur={priceEur ?? null}
          currency={currency}
        />
      </div>
    );
  };

  // Row renderer
  const Row = ({ index: rowIndex, style }: { index: number; style: CSSProperties }) => {
    const startIndex = rowIndex * columnCount;
    const endIndex = Math.min(startIndex + columnCount, cards.length);
    const rowCards = cards.slice(startIndex, endIndex);

    return (
      <div style={style} className="flex gap-4 px-2">
        {rowCards.map(renderCard)}
      </div>
    );
  };

  if (cards.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No cards in your collection yet</p>
      </Card>
    );
  }

  // Fallback to non-virtualized grid if react-window isn't available
  if (!List) {
    return (
      <div ref={containerRef} className="w-full grid gap-4 px-2" style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`
      }}>
        {cards.map(renderCard)}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <List
          height={dimensions.height}
          itemCount={rowCount}
          itemSize={rowHeight}
          width={dimensions.width}
          overscanCount={2}
        >
          {Row}
        </List>
      )}
    </div>
  );
};

export default VirtualizedCardGrid;
