import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TradingCard } from "@/components/TradingCard";
import { CardSearchBar } from "@/components/CardSearchBar";
import { CardEditModal } from "@/components/CardEditModal";
import { BulkEditModal } from "@/components/BulkEditModal";
import { BulkListForSaleModal } from "@/components/BulkListForSaleModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Grid3x3, List, Filter, Plus, Upload, DollarSign, Maximize2, CheckSquare } from "lucide-react";
import { useCardSearch } from "@/hooks/useCardSearch";
import { useCurrency } from "@/hooks/useCurrency";
import { searchScryDex, CardResult } from "@/lib/firebase-functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
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
  const { currency, setCurrency, convertPrice, formatPrice } = useCurrency();
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
  const [cardSize, setCardSize] = useState<number>(200);
  const [isResizeOpen, setIsResizeOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkListForSaleOpen, setIsBulkListForSaleOpen] = useState(false);
  const [csvPreviewCards, setCsvPreviewCards] = useState<Array<{
    id: string;
    name: string;
    quantity: number;
    set_name: string;
    set_code?: string;
    collector_number?: string;
    scryfall_id?: string;
    is_foil: boolean;
    rowIndex: number;
  }>>([]);
  const [isCsvReviewOpen, setIsCsvReviewOpen] = useState(false);

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
      if (lines.length <= 1) {
        toast.error('CSV appears to be empty');
        return;
      }

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIndex = headers.findIndex(h => h.includes('name') || h === 'card name');
      const quantityIndex = headers.findIndex(h => h.includes('quantity') || h.includes('count'));
      const setCodeIndex = headers.findIndex(
        (h) => h === 'set code' || h === 'set_code' || h === 'set'
      );
      const setNameIndex = headers.findIndex(
        (h) => h === 'set name' || h === 'set_name' || h.includes('edition')
      );
      const collectorNumberIndex = headers.findIndex(
        (h) => h === 'collector number' || h === 'collector_number' || h === 'number'
      );
      const scryfallIdIndex = headers.findIndex(
        (h) => h === 'scryfall id' || h === 'scryfall_id'
      );
      const foilIndex = headers.findIndex(h => h.includes('foil') || h.includes('finish'));

      if (nameIndex === -1) {
        toast.error('CSV must have a "Name" or "Card Name" column');
        return;
      }

      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // Escaped quote
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }

        if (current.length > 0) {
          result.push(current.trim());
        }

        return result;
      };

      const parsedCards = lines.slice(1).map((line, idx) => {
        const cleanedLine = line.replace(/\r/g, "");
        const values = parseCsvLine(cleanedLine);
        if (!values.length) return null;
        const name = values[nameIndex];
        if (!name) return null;

        const quantityRaw = quantityIndex >= 0 ? values[quantityIndex] : "1";
        const quantity = parseInt((quantityRaw || "1").replace(/\D/g, ""), 10) || 1;
        const setCode = setCodeIndex >= 0 ? values[setCodeIndex] : "";
        const setName = setNameIndex >= 0 ? values[setNameIndex] : "";
        const collectorNumber = collectorNumberIndex >= 0 ? values[collectorNumberIndex] : "";
        const scryfallId = scryfallIdIndex >= 0 ? values[scryfallIdIndex] : "";
        const foilValue = foilIndex >= 0 ? (values[foilIndex] || "").toLowerCase() : "";
        const isFoil = foilValue.includes("foil");

        return {
          id: `${name}-${idx}`,
          name,
          quantity,
          set_name: setName,
          set_code: setCode,
          collector_number: collectorNumber,
          scryfall_id: scryfallId,
          is_foil: isFoil,
          rowIndex: idx + 2,
        };
      }).filter(Boolean) as Array<{
        id: string;
        name: string;
        quantity: number;
        set_name: string;
        set_code?: string;
        collector_number?: string;
        scryfall_id?: string;
        is_foil: boolean;
        rowIndex: number;
      }>;

      if (parsedCards.length === 0) {
        toast.error('No valid cards found in CSV');
        return;
      }

      setCsvPreviewCards(parsedCards);
      setIsCsvReviewOpen(true);
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
                    {formatPrice(convertedValue)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Select value={currency} onValueChange={(val) => setCurrency(val as any)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="DKK">DKK</SelectItem>
                  <SelectItem value="SEK">SEK</SelectItem>
                </SelectContent>
              </Select>

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

              {/* CSV Review Modal */}
              <Dialog open={isCsvReviewOpen} onOpenChange={setIsCsvReviewOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Review CSV Import</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {csvPreviewCards.length} cards detected. Remove any you don't want to import, then finalize.
                    </p>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {csvPreviewCards.map((card) => (
                        <Card key={card.id} className="p-3 flex items-center justify-between gap-3">
                           <div className="space-y-1">
                             <p className="font-medium text-sm">{card.name}</p>
                             {card.set_name && (
                               <p className="text-xs text-muted-foreground">
                                 {card.set_name}
                                 {card.collector_number && ` • #${card.collector_number}`}
                               </p>
                             )}
                             <p className="text-xs text-muted-foreground">
                               Row {card.rowIndex} • Qty: {card.quantity} • {card.is_foil ? 'Foil' : 'Non-foil'}
                             </p>
                           </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCsvPreviewCards(prev => prev.filter(c => c.id !== card.id))}
                          >
                            Remove
                          </Button>
                        </Card>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <p className="text-xs text-muted-foreground">
                        Only basic info (name, quantity, set, foil) will be saved for unmatched cards. When possible, prices and images will be fetched automatically.
                      </p>
                      <Button
                        disabled={csvPreviewCards.length === 0}
                        onClick={async () => {
                          if (!user) return;
                          try {
                            const results = await Promise.all(
                              csvPreviewCards.map(async (card) => {
                                try {
                                  const searchResult = await searchScryDex({
                                    query: card.name,
                                    game: 'magic',
                                    limit: 10,
                                  });

                                  if (!searchResult.success || !searchResult.data.length) {
                                    return { card, matchedCard: null };
                                  }

                                  let matched: CardResult | null = searchResult.data[0];

                                  // Best: match by Scryfall ID (api_id)
                                  if (card.scryfall_id) {
                                    const byScryfallId = searchResult.data.find(
                                      (c) => c.api_id === card.scryfall_id
                                    );
                                    if (byScryfallId) {
                                      matched = byScryfallId;
                                    }
                                  }

                                  // Try to match by set code + collector number (most precise)
                                  if (card.set_code && card.collector_number) {
                                    const byCodeAndNumber = searchResult.data.find(
                                      (c) =>
                                        c.expansion?.id?.toLowerCase() === card.set_code?.toLowerCase() &&
                                        c.collector_number === card.collector_number
                                    );
                                    if (byCodeAndNumber) matched = byCodeAndNumber;
                                  }
                                  // Fallback: match by set code only
                                  else if (card.set_code) {
                                    const byCode = searchResult.data.find(
                                      (c) => c.expansion?.id?.toLowerCase() === card.set_code?.toLowerCase()
                                    );
                                    if (byCode) matched = byCode;
                                  }
                                  // Fallback: match by set name
                                  else if (card.set_name) {
                                    const byName = searchResult.data.find(
                                      (c) => c.set_name?.toLowerCase() === card.set_name.toLowerCase()
                                    );
                                    if (byName) matched = byName;
                                  }

                                  return { card, matchedCard: matched };
                                } catch (err) {
                                  console.error('CSV search error for card', card.name, err);
                                  return { card, matchedCard: null };
                                }
                              })
                            );

                            const batch = writeBatch(db);

                            results.forEach(({ card, matchedCard }) => {
                              const docRef = doc(collection(db, 'users', user.uid, 'collection'));

                              const data: any = {
                                name: matchedCard?.name || card.name,
                                set_name: matchedCard?.set_name || card.set_name,
                                quantity: card.quantity,
                                condition: 'Near Mint',
                                language: 'English',
                                is_foil: card.is_foil,
                                is_signed: false,
                                is_altered: false,
                                is_graded: false,
                                grading_company: null,
                                grade: null,
                                notes: '',
                                purchase_price: null,
                                game: matchedCard?.game || 'mtg',
                                addedAt: new Date(),
                                priceLastUpdated: new Date().toISOString(),
                              };

                              if (matchedCard?.api_id || matchedCard?.id) {
                                data.api_id = matchedCard.api_id || matchedCard.id;
                              }

                              if (matchedCard?.rarity) {
                                data.rarity = matchedCard.rarity;
                              }

                              if (matchedCard?.collector_number || card.collector_number) {
                                data.collector_number = matchedCard?.collector_number || card.collector_number;
                              }

                              if (matchedCard?.image_uris || matchedCard?.images) {
                                data.image_uris = matchedCard.image_uris
                                  ? matchedCard.image_uris
                                  : {
                                      small: matchedCard.images[0]?.small || '',
                                      normal: matchedCard.images[0]?.medium || '',
                                      large: matchedCard.images[0]?.large || '',
                                    };
                              }

                              if (matchedCard?.prices) {
                                data.prices = matchedCard.prices;
                              }

                              batch.set(docRef, data);
                            });

                            await batch.commit();
                            toast.success(`Imported ${csvPreviewCards.length} cards into your collection`);
                            setCsvPreviewCards([]);
                            setIsCsvReviewOpen(false);
                          } catch (error) {
                            console.error('CSV finalize error:', error);
                            toast.error('Failed to import cards');
                          }
                        }}
                      >
                        Import {csvPreviewCards.length} Cards
                      </Button>
                    </div>
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
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="font-semibold text-sm truncate">{card.name}</h3>
                                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                                    {card.set_name}
                                    {(card.collector_number || card.number) && ` • #${card.collector_number || card.number}`}
                                  </p>
                                </div>
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

            {/* Resize Control */}
            {viewMode === "grid" && (
              <Dialog open={isResizeOpen} onOpenChange={setIsResizeOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Maximize2 className="h-4 w-4" />
                    Resize
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adjust Card Size</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        Card Size: {cardSize}px
                      </label>
                      <Slider
                        value={[cardSize]}
                        onValueChange={(val) => setCardSize(val[0])}
                        min={120}
                        max={320}
                        step={20}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => setIsResizeOpen(false)}>Done</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Selection & Bulk Edit */}
            {!selectionMode ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setSelectionMode(true)}
              >
                <CheckSquare className="h-4 w-4" />
                Select
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedCardIds(new Set());
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allIds = new Set(filteredCards.map((card) => card.id));
                    setSelectedCardIds(allIds);
                  }}
                >
                  Select All ({filteredCards.length})
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  disabled={selectedCardIds.size === 0}
                  onClick={() => setIsBulkListForSaleOpen(true)}
                >
                  <DollarSign className="h-4 w-4" />
                  List for Sale ({selectedCardIds.size})
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  disabled={selectedCardIds.size === 0}
                  onClick={() => setIsBulkEditOpen(true)}
                >
                  Edit {selectedCardIds.size} Cards
                </Button>
              </>
            )}

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
          <div>
            {viewMode === "grid" ? (
              <div 
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`
                }}
              >
                {filteredCards.map((card) => (
                  <div 
                    key={card.id} 
                    className="relative cursor-pointer" 
                    onClick={(e) => {
                      if (selectionMode) {
                        e.stopPropagation();
                        const newSelected = new Set(selectedCardIds);
                        if (newSelected.has(card.id)) {
                          newSelected.delete(card.id);
                        } else {
                          newSelected.add(card.id);
                        }
                        setSelectedCardIds(newSelected);
                      } else {
                        setSelectedCard(card);
                        setIsCardDetailOpen(true);
                      }
                    }}
                  >
                    {selectionMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedCardIds.has(card.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedCardIds);
                            if (checked) {
                              newSelected.add(card.id);
                            } else {
                              newSelected.delete(card.id);
                            }
                            setSelectedCardIds(newSelected);
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
                      price={convertPrice(card.is_foil ? card.prices?.usd_foil : card.prices?.usd)}
                      currency={currency}
                    />
                  </div>
                ))}
              </div>
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
                          {formatPrice(convertPrice(card.is_foil ? card.prices?.usd_foil : card.prices?.usd) as number)}
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

      {/* Bulk Edit Modal */}
      <BulkEditModal
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedCards={Array.from(selectedCardIds).map(id => {
          const card = userCards.find(c => c.id === id);
          return { id, name: card?.name || '' };
        })}
        onComplete={() => {
          setSelectedCardIds(new Set());
          setSelectionMode(false);
        }}
      />

      <BulkListForSaleModal
        open={isBulkListForSaleOpen}
        onOpenChange={setIsBulkListForSaleOpen}
        selectedCards={Array.from(selectedCardIds).map(id => {
          const card = userCards.find(c => c.id === id);
          return card!;
        }).filter(Boolean)}
        onComplete={() => {
          setSelectedCardIds(new Set());
          setSelectionMode(false);
        }}
      />
    </div>
  );
};

export default Collection;
