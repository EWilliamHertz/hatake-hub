import { useState, useEffect } from 'react';
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
import { useHaptic } from '@/hooks/use-haptic';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

interface CardEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: any;
  isExistingCard?: boolean;
}

export const CardEditModal = ({ open, onOpenChange, card, isExistingCard = false }: CardEditModalProps) => {
  const { user } = useAuth();
  const { formatPrice, convertPrice } = useCurrency();
  const { trigger: haptic } = useHaptic(); // Haptic feedback hook

  // State
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
    haptic('medium'); // Vibrate on click
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

      haptic('success');
      toast.success(isExistingCard ? 'Card updated!' : `Added ${quantity}x ${cardData.name} to collection!`);
      onOpenChange(false);
      if (!isExistingCard) resetForm();
    } catch (error: any) {
      haptic('error');
      console.error('Error saving card:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    haptic('warning');
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
    <ResponsiveDialog
        isOpen={open}
        setIsOpen={onOpenChange}
        title={card.name}
        description={card.set_name}
    >
        <div className="flex flex-col gap-6">
            {/* Image Section - Flexible height */}
            <div className="w-full flex items-center justify-center relative bg-muted/30 rounded-lg p-4">
                {imageUrl ? (
                    <>
                        <img src={imageUrl} alt={card.name} className="max-h-[250px] w-auto object-contain rounded-lg shadow-md z-10" />
                        {isFoil && <div className="absolute inset-0 pointer-events-none rainbow-foil z-20 opacity-30 mix-blend-screen rounded-lg"></div>}
                    </>
                ) : (
                    <div className="h-[200px] w-full flex items-center justify-center bg-muted rounded-lg">
                        <p className="text-muted-foreground">No image</p>
                    </div>
                )}
                <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
                    {currentPrice ? formatPrice(currentPrice) : 'N/A'}
                </div>
            </div>

            {/* Form Content */}
            <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="details" onClick={() => haptic('light')}>Details</TabsTrigger>
                    <TabsTrigger value="marketplace" onClick={() => haptic('light')}>Marketplace</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <div className="flex items-center">
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-10 w-10 rounded-r-none"
                                    onClick={() => { haptic('light'); setQuantity(Math.max(1, quantity - 1)); }}
                                >-</Button>
                                <Input 
                                    className="h-10 text-center rounded-none border-x-0 focus-visible:ring-0" 
                                    type="number" 
                                    value={quantity} 
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} 
                                />
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-10 w-10 rounded-l-none"
                                    onClick={() => { haptic('light'); setQuantity(quantity + 1); }}
                                >+</Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="condition">Condition</Label>
                            <Select value={condition} onValueChange={setCondition}>
                                <SelectTrigger id="condition" className="h-10"><SelectValue /></SelectTrigger>
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

                    <div className="space-y-3 p-4 border rounded-lg bg-card">
                        <Label className="text-xs uppercase text-muted-foreground font-bold">Finishes</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="foil" checked={isFoil} onCheckedChange={(c) => { haptic('light'); setIsFoil(!!c); }} />
                                <label htmlFor="foil" className="text-sm font-medium">Foil</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="signed" checked={isSigned} onCheckedChange={(c) => { haptic('light'); setIsSigned(!!c); }} />
                                <label htmlFor="signed" className="text-sm font-medium">Signed</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="altered" checked={isAltered} onCheckedChange={(c) => { haptic('light'); setIsAltered(!!c); }} />
                                <label htmlFor="altered" className="text-sm font-medium">Altered</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="graded" checked={isGraded} onCheckedChange={(c) => { haptic('light'); setIsGraded(!!c); }} />
                                <label htmlFor="graded" className="text-sm font-medium">Graded</label>
                            </div>
                        </div>
                    </div>

                    {isGraded && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                            <div>
                                <Label>Company</Label>
                                <Select value={gradingCompany} onValueChange={setGradingCompany}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PSA">PSA</SelectItem>
                                        <SelectItem value="BGS">BGS</SelectItem>
                                        <SelectItem value="CGC">CGC</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Grade</Label>
                                <Input type="number" placeholder="9.5" value={grade} onChange={(e) => setGrade(e.target.value)} />
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="marketplace" className="space-y-4">
                    <div className="p-4 border rounded-lg bg-accent/10 border-accent/20">
                        <div className="flex items-center space-x-2 mb-4">
                            <Checkbox id="list-for-sale" checked={isListingForSale} onCheckedChange={(c) => setIsListingForSale(!!c)} />
                            <label htmlFor="list-for-sale" className="font-semibold">List for Sale</label>
                        </div>
                        
                        {isListingForSale && (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <div>
                                    <Label>Your Price</Label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                        <Input 
                                            type="number" 
                                            className="pl-7" 
                                            placeholder="0.00"
                                            value={listPrice} 
                                            onChange={(e) => setListPrice(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Listing as: {condition} {isFoil ? 'Foil' : ''}
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
                {isExistingCard && (
                    <Button variant="destructive" onClick={handleDelete} className="flex-1">Remove</Button>
                )}
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-white">
                    {saving ? 'Saving...' : 'Save Card'}
                </Button>
            </div>
        </div>
    </ResponsiveDialog>
  );
};