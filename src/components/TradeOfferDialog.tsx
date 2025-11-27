import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  cardData?: any; // The full card data for the trade record
  prefilledPrice?: number;
}

export const TradeOfferDialog = ({ 
  open, 
  onOpenChange, 
  listingId, 
  sellerId, 
  cardName, 
  listingPrice,
  cardData,
  prefilledPrice
}: TradeOfferDialogProps) => {
  const { user } = useAuth();
  const [offerPrice, setOfferPrice] = useState(listingPrice.toString());
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (prefilledPrice !== undefined) {
      setOfferPrice(prefilledPrice.toString());
    } else {
      setOfferPrice(listingPrice.toString());
    }
  }, [prefilledPrice, listingPrice, open]);

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
      // Create a document in 'trades' to unify with the Trades page
      await addDoc(collection(db, 'trades'), {
        proposerId: user.uid,
        proposerName: user.displayName || 'Anonymous',
        receiverId: sellerId,
        receiverName: 'Seller', // ideally fetch this, but Trades page can handle displaying it if stored
        participants: [user.uid, sellerId],
        
        // Structure for a "Buy" trade: 
        // Proposer (Buyer) gives Money, gets Card
        proposerItems: [],
        proposerMoney: price,
        
        receiverItems: cardData ? [cardData] : [{
          id: listingId,
          name: cardName,
          set_name: 'Marketplace Item',
          image_uri: 'https://via.placeholder.com/40x56', // Placeholder if missing
          rarity: 'Unknown'
        }],
        receiverMoney: 0,
        
        status: 'pending',
        marketListingId: listingId, // Link back to listing
        message: message.trim(),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      toast.success('Offer sent! Check your Trades tab.');
      onOpenChange(false);
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
          <DialogTitle>{prefilledPrice ? 'Buy Item' : 'Make an Offer'}</DialogTitle>
          <DialogDescription>
            {prefilledPrice 
              ? `Purchase ${cardName} for listed price` 
              : `Submit an offer for ${cardName}`}
          </DialogDescription>
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
              {submitting ? 'Sending...' : (prefilledPrice ? 'Send Buy Request' : 'Send Offer')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};