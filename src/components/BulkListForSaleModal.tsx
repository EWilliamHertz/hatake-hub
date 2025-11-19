import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { writeBatch, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface BulkListForSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCards: Array<{
    id: string;
    name: string;
    set_name: string;
    condition?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
    };
    prices?: {
      usd?: number | null;
      usd_foil?: number | null;
    };
    is_foil?: boolean;
    quantity?: number;
  }>;
  onComplete: () => void;
}

interface CardPricing {
  cardId: string;
  percentage: number;
  fixedPrice: number | null;
  quantityToList: number;
  notes: string;
}

export const BulkListForSaleModal = ({
  open,
  onOpenChange,
  selectedCards,
  onComplete
}: BulkListForSaleModalProps) => {
  const { user } = useAuth();
  const { currency, convertPrice, formatPrice } = useCurrency();
  const [globalPercentage, setGlobalPercentage] = useState<string>('');
  const [cardPricings, setCardPricings] = useState<Map<string, CardPricing>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && selectedCards.length > 0) {
      const initialPricings = new Map<string, CardPricing>();
      selectedCards.forEach(card => {
        initialPricings.set(card.id, {
          cardId: card.id,
          percentage: 100,
          fixedPrice: null,
          quantityToList: 1,
          notes: '',
        });
      });
      setCardPricings(initialPricings);
    }
  }, [open, selectedCards]);

  const getMarketPrice = (card: typeof selectedCards[0]) => {
    if (!card.prices) return 0;
    return card.is_foil ? (card.prices.usd_foil || 0) : (card.prices.usd || 0);
  };

  const calculateFinalPrice = (cardId: string, card: typeof selectedCards[0]) => {
    const pricing = cardPricings.get(cardId);
    if (!pricing) return 0;

    if (pricing.fixedPrice !== null && pricing.fixedPrice > 0) {
      return pricing.fixedPrice;
    }

    const marketPrice = getMarketPrice(card);
    return (marketPrice * pricing.percentage) / 100;
  };

  const handleApplyGlobalPercentage = () => {
    const percentage = parseFloat(globalPercentage);
    if (isNaN(percentage) || percentage <= 0) {
      toast.error('Please enter a valid percentage');
      return;
    }

    const newPricings = new Map(cardPricings);
    selectedCards.forEach(card => {
      const existing = newPricings.get(card.id);
      if (existing) {
        newPricings.set(card.id, {
          ...existing,
          percentage,
          fixedPrice: null,
        });
      }
    });
    setCardPricings(newPricings);
    toast.success(`Applied ${percentage}% to all cards`);
  };

  const handlePercentageChange = (cardId: string, percentage: number) => {
    const newPricings = new Map(cardPricings);
    const existing = newPricings.get(cardId);
    if (existing) {
      newPricings.set(cardId, {
        ...existing,
        percentage,
        fixedPrice: null,
      });
      setCardPricings(newPricings);
    }
  };

  const handleFixedPriceChange = (cardId: string, price: number | null) => {
    const newPricings = new Map(cardPricings);
    const existing = newPricings.get(cardId);
    if (existing) {
      newPricings.set(cardId, {
        ...existing,
        fixedPrice: price,
      });
      setCardPricings(newPricings);
    }
  };

  const handleQuantityChange = (cardId: string, quantity: number) => {
    const newPricings = new Map(cardPricings);
    const existing = newPricings.get(cardId);
    if (existing) {
      newPricings.set(cardId, {
        ...existing,
        quantityToList: quantity,
      });
      setCardPricings(newPricings);
    }
  };

  const handleNotesChange = (cardId: string, notes: string) => {
    const newPricings = new Map(cardPricings);
    const existing = newPricings.get(cardId);
    if (existing) {
      newPricings.set(cardId, {
        ...existing,
        notes,
      });
      setCardPricings(newPricings);
    }
  };

  const handleRemoveCard = (cardId: string) => {
    const newPricings = new Map(cardPricings);
    newPricings.delete(cardId);
    setCardPricings(newPricings);
  };

  const handleFinalize = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (cardPricings.size === 0) {
      toast.error('No cards selected for listing');
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      cardPricings.forEach((pricing, cardId) => {
        const card = selectedCards.find(c => c.id === cardId);
        if (!card) return;

        const finalPrice = calculateFinalPrice(cardId, card);
        if (finalPrice <= 0) {
          console.warn(`Skipping card ${cardId} with invalid price`);
          return;
        }

        const cardRef = doc(db, 'users', user.uid, 'collection', cardId);
        batch.update(cardRef, {
          for_sale: true,
          sale_price: finalPrice,
          sale_quantity: pricing.quantityToList,
          sale_notes: pricing.notes,
          listed_at: new Date().toISOString(),
        });
      });

      await batch.commit();
      toast.success(`Successfully listed ${cardPricings.size} cards for sale`);
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to list cards:', error);
      toast.error('Failed to list cards for sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingCards = selectedCards.filter(card => cardPricings.has(card.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Review and Price Items for Sale</DialogTitle>
        </DialogHeader>

        {/* Global Controls */}
        <div className="px-6 py-4 bg-muted/50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="global-percentage">Apply % to All</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="global-percentage"
                  type="number"
                  placeholder="e.g., 75"
                  value={globalPercentage}
                  onChange={(e) => setGlobalPercentage(e.target.value)}
                  className="w-full"
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApplyGlobalPercentage}
                  disabled={!globalPercentage}
                >
                  %
                </Button>
              </div>
            </div>
            <div className="flex items-center md:col-span-2">
              <p className="text-sm text-muted-foreground">
                {remainingCards.length} card{remainingCards.length !== 1 ? 's' : ''} selected for listing
              </p>
            </div>
          </div>
        </div>

        {/* Card List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {remainingCards.map((card) => {
            const pricing = cardPricings.get(card.id);
            if (!pricing) return null;

            const marketPrice = getMarketPrice(card);
            const finalPrice = calculateFinalPrice(card.id, card);
            const convertedMarket = convertPrice(marketPrice);
            const convertedFinal = convertPrice(finalPrice);

            return (
              <Card key={card.id} className="p-4">
                <div className="flex gap-4">
                  {/* Card Image */}
                  <div className="flex-shrink-0">
                    {card.image_uris?.small ? (
                      <img
                        src={card.image_uris.small}
                        alt={card.name}
                        className="w-20 h-28 object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Card Details & Pricing */}
                  <div className="flex-1 space-y-3">
                    {/* Card Info */}
                    <div>
                      <h3 className="font-semibold">{card.name}</h3>
                      <p className="text-sm text-muted-foreground">{card.set_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {card.condition || 'Near Mint'} {card.is_foil ? '• Foil' : ''}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        Market: {formatPrice(convertedMarket)}
                      </p>
                    </div>

                    {/* Pricing Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Percentage Buttons */}
                      <div>
                        <Label className="text-xs">Percentage of Market</Label>
                        <div className="grid grid-cols-4 gap-1 mt-1">
                          {[85, 90, 100, 110].map((pct) => (
                            <Button
                              key={pct}
                              variant={pricing.percentage === pct ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handlePercentageChange(card.id, pct)}
                              className="text-xs"
                            >
                              {pct}%
                            </Button>
                          ))}
                        </div>
                        <Input
                          type="number"
                          placeholder="Custom %"
                          value={pricing.fixedPrice === null ? pricing.percentage : ''}
                          onChange={(e) => handlePercentageChange(card.id, parseFloat(e.target.value) || 100)}
                          className="mt-2 text-xs"
                        />
                      </div>

                      {/* Fixed Price */}
                      <div>
                        <Label className="text-xs">Or Fixed Price (USD)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={pricing.fixedPrice || ''}
                          onChange={(e) => handleFixedPriceChange(card.id, parseFloat(e.target.value) || null)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Quantity & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Quantity to List</Label>
                        <Input
                          type="number"
                          min="1"
                          max={card.quantity || 1}
                          value={pricing.quantityToList}
                          onChange={(e) => handleQuantityChange(card.id, parseInt(e.target.value) || 1)}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          of {card.quantity || 1} available
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs">Final Price</Label>
                        <p className="text-lg font-bold text-primary mt-1">
                          {formatPrice(convertedFinal)}
                        </p>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label className="text-xs">Notes (optional)</Label>
                      <Input
                        placeholder="Add notes about this listing..."
                        value={pricing.notes}
                        onChange={(e) => handleNotesChange(card.id, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCard(card.id)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={isSubmitting || remainingCards.length === 0}
              className="min-w-[200px]"
            >
              {isSubmitting ? 'Listing...' : `Finalize and List ${remainingCards.length} Cards`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
