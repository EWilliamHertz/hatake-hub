import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TradingCard } from "@/components/TradingCard";
import { CardSearchBar } from "@/components/CardSearchBar";
import { CardEditModal } from "@/components/CardEditModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Grid3x3, List, Filter, Plus, Upload, DollarSign } from "lucide-react";
import { useCardSearch } from "@/hooks/useCardSearch";
import { useCurrency } from "@/hooks/useCurrency";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserCard {
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
  game?: string;
  collector_number?: string;
  condition?: string;
  prices?: {
    usd?: number | null;
    usd_foil?: number | null;
  };
}

const Collection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currency, setCurrency, convertPrice } = useCurrency();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedSet, setSelectedSet] = useState<string>("all");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { cards: searchResults, loading: searchLoading, search } = useCardSearch();
  const [uniqueSets, setUniqueSets] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Listen to user's collection in real-time
    const collectionRef = collection(db, 'users', user.uid, 'collection');
    const q = query(collectionRef);
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const cards: UserCard[] = [];
        const sets = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data();
          cards.push({
            id: doc.id,
            name: data.name || '',
            set_name: data.set_name || '',
            rarity: data.rarity || '',
            image_uris: data.image_uris,
            is_foil: data.is_foil || false,
            quantity: data.quantity || 1,
            game: data.game,
            collector_number: data.collector_number,
            condition: data.condition,
            prices: data.prices
          });
          if (data.set_name) sets.add(data.set_name);
        });
        setUserCards(cards);
        setUniqueSets(Array.from(sets).sort());
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Collection error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, navigate]);

  const handleSearch = (query: string, game: string) => {
    search({ query, game: game as any, page: 1, limit: 50 });
  };

  const handleCardClick = (card: any) => {
    setSelectedCard(card);
    setIsCardDetailOpen(true);
    setIsAddDialogOpen(false);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIndex = headers.findIndex(h => h.includes('name') || h === 'card name');
      const quantityIndex = headers.findIndex(h => h.includes('quantity') || h.includes('count'));
      const setIndex = headers.findIndex(h => h.includes('set') || h.includes('edition'));
      const foilIndex = headers.findIndex(h => h.includes('foil') || h.includes('finish'));

      if (nameIndex === -1) {
        toast.error('CSV must have a "Name" or "Card Name" column');
        return;
      }

      let imported = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const cardName = values[nameIndex];
        
        if (!cardName) continue;

        try {
          // You could enhance this to actually search and add the cards
          // For now, just count how many we would import
          imported++;
        } catch (error) {
          errors.push(`Line ${i + 1}: ${cardName}`);
        }
      }

      toast.success(`Parsed ${imported} cards from CSV. Click on search results to add them.`);
      setIsImportDialogOpen(false);
    } catch (error) {
      console.error('CSV import error:', error);
      toast.error('Failed to parse CSV file');
    }
  };

  const filteredCards = userCards.filter((card) => {
    if (selectedSet !== 'all' && card.set_name !== selectedSet) return false;
    if (selectedRarity !== 'all' && card.rarity?.toLowerCase() !== selectedRarity) return false;
    return true;
  });

  const calculateTotalValue = () => {
    return userCards.reduce((total, card) => {
      const price = card.is_foil ? card.prices?.usd_foil : card.prices?.usd;
      const cardValue = (price || 0) * (card.quantity || 1);
      return total + cardValue;
    }, 0);
  };

  const totalValue = calculateTotalValue();
  const convertedValue = convertPrice(totalValue);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">My Collection</h1>
              <p className="text-sm text-muted-foreground">
                {filteredCards.length} {filteredCards.length === 1 ? 'card' : 'cards'}
              </p>
              {convertedValue !== null && convertedValue > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <p className="text-lg font-bold text-primary">
                    {currency === 'usd' ? '$' : '€'}{convertedValue.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <Button
                  variant={currency === 'usd' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrency('usd')}
                >
                  USD
                </Button>
                <Button
                  variant={currency === 'eur' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrency('eur')}
                >
                  EUR
                </Button>
              </div>

              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import from CSV</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file from Manabox or other collection apps. The file should include at least a "Name" column.
                    </p>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Cards
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Search & Add Cards</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <CardSearchBar onSearch={handleSearch} loading={searchLoading} />
                    {searchLoading ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Searching...</p>
                      </div>
                     ) : searchResults.length > 0 ? (
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                         {searchResults.map((card) => (
                           <div key={card.id} className="cursor-pointer" onClick={() => handleCardClick(card)}>
                             <Card className="p-3 hover:bg-accent transition-colors">
                               <img 
                                 src={card.image_uris?.normal || card.images?.[0]?.medium} 
                                 alt={card.name}
                                 className="w-full aspect-[2.5/3.5] object-cover rounded mb-2"
                               />
                               <h3 className="font-semibold text-sm truncate">{card.name}</h3>
                               <p className="text-xs text-muted-foreground">{card.set_name}</p>
                               {card.prices && (
                                 <div className="mt-2 space-y-1">
                                   {card.prices.usd && (
                                     <div className="flex justify-between text-xs">
                                       <span className="text-muted-foreground">Regular:</span>
                                       <span className="font-semibold">${card.prices.usd.toFixed(2)}</span>
                                     </div>
                                   )}
                                   {card.prices.usd_foil && (
                                     <div className="flex justify-between text-xs">
                                       <span className="text-muted-foreground">Foil:</span>
                                       <span className="font-semibold text-primary">${card.prices.usd_foil.toFixed(2)}</span>
                                     </div>
                                   )}
                                 </div>
                               )}
                             </Card>
                           </div>
                         ))}
                       </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Search for cards to add to your collection</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <CardEditModal
              open={isCardDetailOpen}
              onOpenChange={(open) => {
                setIsCardDetailOpen(open);
                if (!open) setSelectedCard(null);
              }}
              card={selectedCard}
              isExistingCard={!!selectedCard?.quantity}
            />
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters */}
            <Select value={selectedSet} onValueChange={setSelectedSet}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Set/Edition" />
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-[300px] overflow-y-auto">
                <SelectItem value="all">All Sets</SelectItem>
                {uniqueSets.map((set) => (
                  <SelectItem key={set} value={set}>{set}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRarity} onValueChange={setSelectedRarity}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Rarity" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Rarities</SelectItem>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="uncommon">Uncommon</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="mythic">Mythic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Collection Grid/List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading collection...</p>
          </Card>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive mb-2">Error loading collection</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </Card>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Your collection is empty</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Card
            </Button>
          </div>
        ) : (
          <div className={
            viewMode === "grid"
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "space-y-2"
          }>
            {viewMode === "grid" ? (
              filteredCards.map((card) => (
                <div 
                  key={card.id} 
                  className="cursor-pointer" 
                  onClick={() => {
                    setSelectedCard(card);
                    setIsCardDetailOpen(true);
                  }}
                >
                  <TradingCard
                    id={card.id}
                    name={card.name}
                    set={card.set_name}
                    rarity={card.rarity}
                    imageUrl={card.image_uris?.normal || card.image_uris?.small}
                    isFoil={card.is_foil}
                    price={convertPrice(card.is_foil ? card.prices?.usd_foil : card.prices?.usd)}
                    currency={currency}
                  />
                </div>
              ))
            ) : (
              filteredCards.map((card) => (
                <Card 
                  key={card.id} 
                  className="p-3 hover:bg-accent transition-colors cursor-pointer group relative"
                  onClick={() => {
                    setSelectedCard(card);
                    setIsCardDetailOpen(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-16 bg-muted rounded overflow-hidden">
                        <img 
                          src={card.image_uris?.small || card.image_uris?.normal} 
                          alt={card.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Hover image */}
                      <div className="absolute left-full ml-2 top-0 hidden group-hover:block z-50 pointer-events-none">
                        <img 
                          src={card.image_uris?.normal || card.image_uris?.large} 
                          alt={card.name}
                          className="w-48 rounded-lg shadow-lg border-2 border-border"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{card.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{card.set_name}</span>
                        <span>•</span>
                        <span>{card.rarity}</span>
                        {card.is_foil && (
                          <>
                            <span>•</span>
                            <span className="text-primary">Foil</span>
                          </>
                        )}
                      </div>
                      {card.condition && (
                        <p className="text-xs text-muted-foreground mt-1">{card.condition}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {convertPrice(card.is_foil ? card.prices?.usd_foil : card.prices?.usd) && (
                        <span className="text-sm font-bold text-primary">
                          {currency === 'usd' ? '$' : '€'}
                          {convertPrice(card.is_foil ? card.prices?.usd_foil : card.prices?.usd)?.toFixed(2)}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">x{card.quantity || 1}</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Collection;
