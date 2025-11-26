import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  card: any;
  isExistingCard?: boolean;
}

export const CardEditModal = ({ open, onOpenChange, card, isExistingCard = false }: CardEditModalProps) => {
  const { user } = useAuth();
  const { formatPrice, convertPrice } = useCurrency();
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
    } else if (card) {
      setIsFoil(card.is_foil || false);
    }
  }, [card, isExistingCard]);

  if (!card) return null;

  const imageUrl = card.image_uris?.normal || card.image_uris?.large || card.images?.[0]?.medium || card.images?.[0]?.large;
  const currentPrice = convertPrice(isFoil ? (card.prices?.usd_foil || 0) : (card.prices?.usd || 0));
  
  const cardName = card.name || 'Unknown Card';
  const setName = card.set_name || card.set || 'Unknown Set';
  const cardId = card.api_id || card.id || `${cardName}-${setName}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setSaving(true);
    try {
      const collectionRef = doc(db, 'users', user.uid, 'collection', cardId);

      const safeFloat = (val: string | number | undefined) => {
        if (val === undefined || val === null || val === '') return null;
        const parsed = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(parsed) ? null : parsed;
      };

      const safeStr = (val: any) => (val ? String(val) : '');

      const cardData = {
        api_id: safeStr(card.api_id || card.id || cardId),
        name: safeStr(card.name),
        set_name: safeStr(card.set_name || card.set),
        rarity: safeStr(card.rarity),
        collector_number: safeStr(card.collector_number),
        image_uris: card.image_uris || {
          small: card.images?.[0]?.small || '',
          normal: card.images?.[0]?.medium || '',
          large: card.images?.[0]?.large || ''
        },
        quantity: Math.max(1, parseInt(String(quantity)) || 1),
        condition: safeStr(condition),
        notes: safeStr(notes),
        is_foil: Boolean(isFoil),
        is_signed: Boolean(isSigned),
        is_altered: Boolean(isAltered),
        is_graded: Boolean(isGraded),
        grading_company: isGraded ? safeStr(gradingCompany) : null,
        grade: isGraded ? safeFloat(grade) : null,
        purchase_price: safeFloat(purchasePrice),
        prices: {
          usd: safeFloat(card.prices?.usd),
          usd_foil: safeFloat(card.prices?.usd_foil),
          eur: safeFloat(card.prices?.eur),
          eur_foil: safeFloat(card.prices?.eur_foil),
        },
        game: safeStr(card.game || 'mtg'),
        addedAt: new Date(),
        priceLastUpdated: new Date().toISOString(),
      };

      console.log("Saving sanitized card data:", cardData);

      if (isExistingCard) {
        await updateDoc(collectionRef, cardData);
      } else {
        await setDoc(collectionRef, cardData);
      }

      if (isListingForSale && listPrice) {
        const price = safeFloat(listPrice);
        if (price && price > 0) {
          await addDoc(collection(db, 'marketplaceListings'), {
            cardData: {
              name: cardData.name,
              set_name: cardData.set_name,
              rarity: cardData.rarity,
              image_uris: cardData.image_uris
            },
            sellerId: user.uid,
            sellerData: {
              displayName: user.displayName || 'Anonymous',
              country: 'Unknown'
            },
            price: price,
            quantity: 1,
            condition: cardData.condition,
            isFoil: cardData.is_foil,
            notes: cardData.notes,
            listedAt: serverTimestamp(),
            game: cardData.game
          });
          toast.success('Card listed for sale!');
        }
      }

      toast.success(isExistingCard ? 'Card updated!' : `Added ${quantity}x ${cardData.name} to collection!`);
      onOpenChange(false);
      if (!isExistingCard) resetForm();
    } catch (error: any) {
      console.error('Error saving card:', error);
      toast.error(`Failed to save: ${error.message}`);
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
        <div className="flex h-full flex-col md:flex-row">
          <div className="w-full md:w-1/3 bg-muted p-6 flex items-center justify-center relative">
            {imageUrl ? (
              <>
                <img src={imageUrl} alt={card.name} className="max-w-full max-h-[200px] md:max-h-full rounded-lg object-contain z-10" />
                {isFoil && <div className="absolute inset-0 pointer-events-none rainbow-foil z-20 opacity-30 mix-blend-screen"></div>}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted-foreground/10 rounded-lg">
                <p className="text-muted-foreground">No image</p>
              </div>
            )}
          </div>

          <div className="w-full md:w-2/3 p-6 flex flex-col overflow-y-auto">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl">{card.name}</DialogTitle>
              <DialogDescription>
                {isExistingCard ? 'Update card details' : 'Add to collection'}
              </DialogDescription>
              <p className="text-sm text-muted-foreground">{card.set_name}</p>
              <div className="mt-2">
                {currentPrice ? (
                  <p className="text-lg font-bold text-primary">{formatPrice(currentPrice)}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Price unavailable</p>
                )}
              </div>
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

                <div className="space-y-2">
                  <Label>Special Attributes</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="foil" checked={isFoil} onCheckedChange={(checked) => setIsFoil(checked as boolean)} />
                      <label htmlFor="foil" className="text-sm cursor-pointer">Foil</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="graded" checked={isGraded} onCheckedChange={(checked) => setIsGraded(checked as boolean)} />
                      <label htmlFor="graded" className="text-sm cursor-pointer">Graded</label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="purchase-price">Purchase Price</Label>
                  <Input 
                    id="purchase-price" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={purchasePrice} 
                    onChange={(e) => setPurchasePrice(e.target.value)} 
                  />
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
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
