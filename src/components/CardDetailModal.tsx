import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PriceHistoryChart } from './PriceHistoryChart';
import { useCurrency } from '@/hooks/useCurrency';

interface CardDetailModalProps {
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
  } | null;
}

export const CardDetailModal = ({ open, onOpenChange, card }: CardDetailModalProps) => {
  const { user } = useAuth();
  const { currency, convertPrice, formatPrice } = useCurrency();
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('Near Mint');
  const [language, setLanguage] = useState('English');
  const [isFoil, setIsFoil] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isAltered, setIsAltered] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState('');
  const [grade, setGrade] = useState('');
  const [notes, setNotes] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [saving, setSaving] = useState(false);

  if (!card) return null;

  const imageUrl = card.image_uris?.normal || card.image_uris?.large || card.images?.[0]?.medium || card.images?.[0]?.large;
  const currentPrice = convertPrice(isFoil ? card.prices?.usd_foil : card.prices?.usd);
  const cardId = card.api_id || card.id || `${card.name}-${card.set_name}`.replace(/\s+/g, '-').toLowerCase();

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to add cards');
      return;
    }

    setSaving(true);
    try {
      const cardId = card.api_id || card.id || `${card.name}-${card.set_name}`.replace(/\s+/g, '-').toLowerCase();
      const collectionRef = doc(db, 'users', user.uid, 'collection', cardId);

      await setDoc(collectionRef, {
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
        language,
        is_foil: isFoil,
        is_signed: isSigned,
        is_altered: isAltered,
        is_graded: isGraded,
        grading_company: isGraded ? gradingCompany : null,
        grade: isGraded ? parseFloat(grade) : null,
        notes,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        prices: card.prices || {},
        game: card.game || 'mtg',
        addedAt: new Date(),
        priceLastUpdated: new Date().toISOString(),
      }, { merge: true });

      toast.success(`Added ${quantity}x ${card.name} to collection!`);
      onOpenChange(false);
      
      setQuantity(1);
      setCondition('Near Mint');
      setLanguage('English');
      setIsFoil(false);
      setIsSigned(false);
      setIsAltered(false);
      setIsGraded(false);
      setGradingCompany('');
      setGrade('');
      setNotes('');
      setPurchasePrice('');
    } catch (error) {
      console.error('Error adding card:', error);
      toast.error('Failed to add card to collection');
    } finally {
      setSaving(false);
    }
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
              <DialogDescription>Add this card to your collection with custom details</DialogDescription>
              <p className="text-sm text-muted-foreground">{card.set_name}</p>
              {currentPrice && (
                <p className="text-lg font-bold text-primary">
                  {formatPrice(currentPrice)}
                </p>
              )}
            </DialogHeader>

            <Tabs defaultValue="details" className="flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">Price History</TabsTrigger>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Japanese">Japanese</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="German">German</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="purchase-price">Purchase Price</Label>
                    <Input id="purchase-price" type="number" step="0.01" placeholder="0.00" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
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
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" placeholder="Add any notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <PriceHistoryChart cardId={cardId} game={card.game || 'mtg'} />
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Adding...' : 'Add to Collection'}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
