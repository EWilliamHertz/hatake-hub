import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface TradeOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  sellerId: string;
  cardName: string;
  listingPrice: number;
}

export const TradeOfferDialog = ({ open, onOpenChange, listingId, sellerId, cardName, listingPrice }: TradeOfferDialogProps) => {
  const { user } = useAuth();
  const [offerPrice, setOfferPrice] = useState(listingPrice.toString());
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const price = parseFloat(offerPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'trade_offers'), {
        listingId,
        sellerId,
        buyerId: user.uid,
        buyerName: user.displayName || 'Anonymous',
        cardName,
        offerPrice: price,
        message: message.trim(),
        status: 'pending',
        timestamp: serverTimestamp()
      });

      toast.success('Offer sent!');
      onOpenChange(false);
      setOfferPrice('');
      setMessage('');
    } catch (error) {
      console.error('Error sending offer:', error);
      toast.error('Failed to send offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make an Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Card</Label>
            <p className="text-sm text-muted-foreground">{cardName}</p>
          </div>

          <div>
            <Label htmlFor="offer-price">Your Offer ($)</Label>
            <Input
              id="offer-price"
              type="number"
              step="0.01"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Listing price: ${listingPrice.toFixed(2)}
            </p>
          </div>

          <div>
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message to the seller..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? 'Sending...' : 'Send Offer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
