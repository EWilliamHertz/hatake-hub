import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, setDoc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';

interface CardEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: {
    id?: string;
    api_id?: string;
    name: string;
    set_name: string;
    rarity: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
    };
    images?: Array<{
      small: string;
      medium: string;
      large: string;
    }>;
    collector_number?: string;
    prices?: {
      usd?: number | null;
      usd_foil?: number | null;
      eur?: number | null;
      eur_foil?: number | null;
    };
    game?: string;
    quantity?: number;
    condition?: string;
    notes?: string;
    is_foil?: boolean;
    is_signed?: boolean;
    is_altered?: boolean;
    is_graded?: boolean;
    grading_company?: string;
    grade?: number;
    purchase_price?: number;
  } | null;
  isExistingCard?: boolean;
}

export const CardEditModal = ({ open, onOpenChange, card, isExistingCard = false }: CardEditModalProps) => {
  const { user } = useAuth();
  const { currency, convertPrice } = useCurrency();
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('Near Mint');
  const [notes, setNotes] = useState('');
  const [isFoil, setIsFoil] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isAltered, setIsAltered] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('');
  const [grade, setGrade] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Marketplace fields
  const [listPrice, setListPrice] = useState('');
  const [isListingForSale, setIsListingForSale] = useState(false);

  useEffect(() => {
    if (card && isExistingCard) {
      setQuantity(card.quantity || 1);
      setCondition(card.condition || 'Near Mint');
      setNotes(card.notes || '');
      setIsFoil(card.is_foil || false);
      setIsSigned(card.is_signed || false);
      setIsAltered(card.is_altered || false);
      setIsGraded(card.is_graded || false);
      setGradingCompany(card.grading_company || '');
      setGrade(card.grade?.toString() || '');
      setPurchasePrice(card.purchase_price?.toString() || '');
    }
  }, [card, isExistingCard]);

  if (!card) return null;

  const imageUrl = card.image_uris?.normal || card.image_uris?.large || card.images?.[0]?.medium || card.images?.[0]?.large;
  const currentPrice = convertPrice(isFoil ? card.prices?.usd_foil : card.prices?.usd);
  const cardId = card.api_id || card.id || `${card.name}-${card.set_name}`.replace(/\s+/g, '-').toLowerCase();

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setSaving(true);
    try {
      const collectionRef = doc(db, 'users', user.uid, 'collection', cardId);

      const cardData = {
        api_id: card.api_id || card.id || cardId,
        name: card.name,
        set_name: card.set_name,
        rarity: card.rarity,
        collector_number: card.collector_number || '',
        image_uris: card.image_uris || {
          small: card.images?.[0]?.small || '',
          normal: card.images?.[0]?.medium || '',
          large: card.images?.[0]?.large || ''
        },
        quantity,
        condition,
        notes,
        is_foil: isFoil,
        is_signed: isSigned,
        is_altered: isAltered,
        is_graded: isGraded,
        grading_company: isGraded ? gradingCompany : null,
        grade: isGraded ? parseFloat(grade) : null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        prices: card.prices || {},
        game: card.game || 'mtg',
        addedAt: new Date(),
        priceLastUpdated: new Date().toISOString(),
      };

      if (isExistingCard) {
        await updateDoc(collectionRef, cardData);
      } else {
        await setDoc(collectionRef, cardData);
      }

      // If listing for sale, add to marketplace
      if (isListingForSale && listPrice) {
        await addDoc(collection(db, 'marketplace'), {
          cardData: {
            name: card.name,
            set_name: card.set_name,
            rarity: card.rarity,
            image_uris: card.image_uris
          },
          sellerId: user.uid,
          sellerData: {
            displayName: user.displayName || 'Anonymous',
            country: 'Unknown'
          },
          price: parseFloat(listPrice),
          condition,
          isFoil,
          notes,
          timestamp: serverTimestamp()
        });
        toast.success('Card listed for sale!');
      }

      toast.success(isExistingCard ? 'Card updated!' : `Added ${quantity}x ${card.name} to collection!`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving card:', error);
      toast.error('Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !isExistingCard) return;

    if (!confirm('Are you sure you want to remove this card from your collection?')) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'collection', cardId));
      toast.success('Card removed from collection');
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to remove card');
    }
  };

  const resetForm = () => {
    setQuantity(1);
    setCondition('Near Mint');
    setNotes('');
    setIsFoil(false);
    setIsSigned(false);
    setIsAltered(false);
    setIsGraded(false);
    setGradingCompany('');
    setGrade('');
    setPurchasePrice('');
    setListPrice('');
    setIsListingForSale(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex h-full">
          <div className="w-1/3 bg-muted p-6 flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={card.name} className="max-w-full max-h-full rounded-lg object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted-foreground/10 rounded-lg">
                <p className="text-muted-foreground">No image</p>
              </div>
            )}
          </div>

          <div className="w-2/3 p-6 flex flex-col overflow-y-auto">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl">{card.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{card.set_name}</p>
              {currentPrice && (
                <p className="text-lg font-bold text-primary">
                  {currency === 'usd' ? '$' : '€'}{currentPrice.toFixed(2)}
                </p>
              )}
            </DialogHeader>

            <Tabs defaultValue="details" className="flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Card Details</TabsTrigger>
                <TabsTrigger value="marketplace">List for Sale</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input id="quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger id="condition"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Near Mint">Near Mint</SelectItem>
                        <SelectItem value="Lightly Played">Lightly Played</SelectItem>
                        <SelectItem value="Moderately Played">Moderately Played</SelectItem>
                        <SelectItem value="Heavily Played">Heavily Played</SelectItem>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="purchase-price">Purchase Price (optional)</Label>
                  <Input id="purchase-price" type="number" step="0.01" placeholder="0.00" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Special Attributes</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="foil" checked={isFoil} onCheckedChange={(checked) => setIsFoil(checked as boolean)} />
                      <label htmlFor="foil" className="text-sm cursor-pointer">Foil</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="signed" checked={isSigned} onCheckedChange={(checked) => setIsSigned(checked as boolean)} />
                      <label htmlFor="signed" className="text-sm cursor-pointer">Signed</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="altered" checked={isAltered} onCheckedChange={(checked) => setIsAltered(checked as boolean)} />
                      <label htmlFor="altered" className="text-sm cursor-pointer">Altered</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="graded" checked={isGraded} onCheckedChange={(checked) => setIsGraded(checked as boolean)} />
                      <label htmlFor="graded" className="text-sm cursor-pointer">Graded</label>
                    </div>
                  </div>
                </div>

                {isGraded && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="grading-company">Grading Company</Label>
                      <Select value={gradingCompany} onValueChange={setGradingCompany}>
                        <SelectTrigger id="grading-company"><SelectValue placeholder="Select company" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PSA">PSA</SelectItem>
                          <SelectItem value="BGS">BGS</SelectItem>
                          <SelectItem value="CGC">CGC</SelectItem>
                          <SelectItem value="SGC">SGC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="grade">Grade</Label>
                      <Input id="grade" type="number" step="0.5" min="1" max="10" placeholder="e.g., 9.5" value={grade} onChange={(e) => setGrade(e.target.value)} />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notes (displayed in collection & marketplace)</Label>
                  <Textarea id="notes" placeholder="Add notes about this card..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </TabsContent>

              <TabsContent value="marketplace" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="list-for-sale" checked={isListingForSale} onCheckedChange={(checked) => setIsListingForSale(checked as boolean)} />
                    <label htmlFor="list-for-sale" className="text-sm font-medium cursor-pointer">List this card for sale</label>
                  </div>
                </div>

                {isListingForSale && (
                  <>
                    <div>
                      <Label htmlFor="list-price">Selling Price ($)</Label>
                      <Input 
                        id="list-price" 
                        type="number" 
                        step="0.01" 
                        placeholder={currentPrice ? currentPrice.toFixed(2) : "0.00"} 
                        value={listPrice} 
                        onChange={(e) => setListPrice(e.target.value)} 
                      />
                      {currentPrice && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Market value: ${currentPrice.toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="bg-muted p-3 rounded-lg space-y-1">
                      <p className="text-sm font-medium">Listing Preview:</p>
                      <p className="text-xs text-muted-foreground">{card.name} - {condition}</p>
                      {isFoil && <p className="text-xs text-primary">Foil</p>}
                      {notes && <p className="text-xs text-muted-foreground italic">{notes}</p>}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-6 pt-4 border-t">
              {isExistingCard && (
                <Button variant="destructive" onClick={handleDelete}>
                  Remove
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : isExistingCard ? 'Update Card' : 'Add to Collection'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
