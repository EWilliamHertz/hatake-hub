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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Grid3x3, List, Filter, Plus, Upload, DollarSign, Maximize2, CheckSquare } from "lucide-react";
import { useCardSearch } from "@/hooks/useCardSearch";
import { useCurrency } from "@/hooks/useCurrency";
import { CardResult } from "@/lib/firebase-functions";
import { parseCSV, processCSVImport, ProcessResult } from "@/lib/csvImport";
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
  const [searchExpansionFilter, setSearchExpansionFilter] = useState('all');
  const [availableSearchExpansions, setAvailableSearchExpansions] = useState<string[]>([]);
  const [uniqueSets, setUniqueSets] = useState<string[]>([]);
  const [cardSize, setCardSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('hatake_collection_card_size');
      const parsed = stored ? parseInt(stored, 10) : NaN;
      if (!isNaN(parsed) && parsed >= 120 && parsed <= 320) {
        return parsed;
      }
    }
    return 200;
  });
  const [isResizeOpen, setIsResizeOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hatake_collection_card_size', String(cardSize));
    }
  }, [cardSize]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkListForSaleOpen, setIsBulkListForSaleOpen] = useState(false);
  const [csvPreviewCards, setCsvPreviewCards] = useState<ProcessResult[]>([]);
  const [isCsvReviewOpen, setIsCsvReviewOpen] = useState(false);
  const [csvImportStatus, setCsvImportStatus] = useState<Record<number, { status: string; message: string }>>({});

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

  const handleSearch = (query: string, game: string, expansion?: string) => {
    search({ query, game: game as any, page: 1, limit: 50 });
    setSearchExpansionFilter(expansion || 'all');
    
    // Extract unique expansions from search results for filtering
    const expansions = new Set<string>();
    searchResults.forEach(card => {
      if (card.set_name) expansions.add(card.set_name);
    });
    setAvailableSearchExpansions(Array.from(expansions).sort());
  };

  // Update available expansions when search results change
  useEffect(() => {
    const expansions = new Set<string>();
    searchResults.forEach(card => {
      if (card.set_name) expansions.add(card.set_name);
    });
    setAvailableSearchExpansions(Array.from(expansions).sort());
  }, [searchResults]);

  const handleCardClick = (card: any) => {
    setSelectedCard(card);
    setIsCardDetailOpen(true);
    setIsAddDialogOpen(false);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('═══════════════════════════════════════');
    console.log('🚀 STARTING CSV IMPORT');
    console.log(`📄 File: ${file.name}`);
    console.log(`📦 Size: ${(file.size / 1024).toFixed(2)} KB`);
    console.log('═══════════════════════════════════════');

    try {
      // Step 1: Parse CSV using the dedicated helper
      console.log('📋 Step 1: Parsing CSV file...');
      const parsedCards = await parseCSV(file);
      
      if (parsedCards.length === 0) {
        console.error('❌ No valid cards found in CSV');
        toast.error('No valid cards found in CSV');
        return;
      }

      console.log(`✅ Parsed ${parsedCards.length} cards from CSV`);
      console.log('Sample parsed cards:', parsedCards.slice(0, 3));

      toast.info(`Parsing complete. Searching for ${parsedCards.length} cards and fetching prices...`);
      
      // Step 2: Process CSV import with card lookups
      console.log('🔍 Step 2: Looking up cards via ScryDex API...');
      const updateCallback = (index: number, status: 'processing' | 'success' | 'error', message: string) => {
        setCsvImportStatus(prev => ({
          ...prev,
          [index]: { status, message }
        }));
      };

      const results = await processCSVImport(parsedCards, updateCallback, 'magic');
      
      console.log('📊 Step 3: Processing results...');
      console.log(`Total results: ${results.length}`);
      
      const successfulCards = results.filter(r => r.status === 'success');
      const failedCards = results.filter(r => r.status === 'error');
      
      console.log(`✅ Successful: ${successfulCards.length}`);
      console.log(`❌ Failed: ${failedCards.length}`);
      
      if (failedCards.length > 0) {
        console.log('Failed cards:', failedCards.map(r => r.originalName));
      }
      
      // Show results in UI
      setCsvPreviewCards(results);
      setIsCsvReviewOpen(true);
      setIsImportDialogOpen(false);
      
      // Treat every successfully matched card as having usable pricing data
      const cardsWithPrices = successfulCards;
      
      console.log(`💰 Cards with pricing: ${cardsWithPrices.length}`);
      toast.success(`Found prices for ${cardsWithPrices.length} of ${parsedCards.length} cards`);
    } catch (error) {
      console.error('💥 CSV import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse CSV file');
    }
  };

  const handleRemoveFromPreview = (index: number) => {
    setCsvPreviewCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalizeImport = async () => {
    if (!user || csvPreviewCards.length === 0) return;

    console.log('═══════════════════════════════════════');
    console.log('💾 FINALIZING IMPORT TO FIRESTORE');
    console.log(`User ID: ${user.uid}`);
    console.log('═══════════════════════════════════════');

    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, `users/${user.uid}/collection`);

      const successfulCards = csvPreviewCards.filter(result => result.status === 'success' && result.card);
      
      console.log(`Writing ${successfulCards.length} cards to Firestore...`);

      for (const result of successfulCards) {
        if (!result.card) continue;
        
        const cardDoc = doc(collectionRef);
        const cardData = {
          ...result.card,
          addedAt: new Date(),
        };
        
        console.log(`  📝 Writing card: ${result.card.name}`);
        console.log(`     - Prices:`, result.card.prices);
        console.log(`     - Images:`, result.card.image_uris);
        console.log(`     - Quantity: ${result.card.quantity}`);
        console.log(`     - Condition: ${result.card.condition}`);
        console.log(`     - Foil: ${result.card.is_foil}`);
        
        batch.set(cardDoc, cardData);
      }

      console.log('🔄 Committing batch write...');
      await batch.commit();
      
      console.log('✅ Firestore write complete!');
      console.log('═══════════════════════════════════════');
      
      toast.success(`Added ${successfulCards.length} cards to your collection`);
      setCsvPreviewCards([]);
      setCsvImportStatus({});
      setIsCsvReviewOpen(false);
    } catch (error) {
      console.error('💥 Error importing cards to Firestore:', error);
      toast.error('Failed to import cards');
    }
  };

  const filteredCards = userCards.filter((card) => {
    if (selectedSet !== 'all' && card.set_name !== selectedSet) return false;
    if (selectedRarity !== 'all' && card.rarity?.toLowerCase() !== selectedRarity) return false;
    return true;
  });

  const calculateTotalValue = () => {
    return userCards.reduce((total, card) => {
      const usdPrice = card.is_foil ? card.prices?.usd_foil ?? null : card.prices?.usd ?? null;
      const converted = convertPrice(usdPrice);
      const cardValue = (converted || 0) * (card.quantity || 1);
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
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Review CSV Import</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {csvPreviewCards.length} cards detected. Remove any you don't want to import, then finalize.
                    </p>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {csvPreviewCards.map((result, idx) => (
                        <Card key={idx} className="p-3 flex items-center justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{result.originalName}</p>
                              {result.status === 'success' && (
                                <Badge variant="default" className="text-xs">Found</Badge>
                              )}
                              {result.status === 'error' && (
                                <Badge variant="destructive" className="text-xs">Not found</Badge>
                              )}
                              {result.status === 'processing' && (
                                <Badge variant="secondary" className="text-xs">Searching...</Badge>
                              )}
                            </div>
                            {result.card && (
                              <>
                                {result.card.set_name && (
                                  <p className="text-xs text-muted-foreground">
                                    {result.card.set_name}
                                    {result.card.collector_number && ` • #${result.card.collector_number}`}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Row {idx + 2} • Qty: {result.card.quantity} • {result.card.is_foil ? 'Foil' : 'Non-foil'}
                                </p>
                                {(result.card.prices?.usd || result.card.prices?.eur) && (
                                  <p className="text-xs font-medium text-primary">
                                    ${result.card.prices.usd || '—'} / €{result.card.prices.eur || '—'}
                                  </p>
                                )}
                              </>
                            )}
                            {result.error && (
                              <p className="text-xs text-destructive">{result.error}</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFromPreview(idx)}
                          >
                            Remove
                          </Button>
                        </Card>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Found prices for {csvPreviewCards.filter(r => r.status === 'success' && (r.card?.prices?.usd || r.card?.prices?.eur)).length} of {csvPreviewCards.length} cards</p>
                      </div>
                      <Button
                        disabled={csvPreviewCards.length === 0}
                        onClick={handleFinalizeImport}
                      >
                        Finalize Import
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
                    <CardSearchBar 
                      onSearch={handleSearch} 
                      loading={searchLoading}
                      availableExpansions={availableSearchExpansions}
                    />
                    {searchLoading ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Searching...</p>
                      </div>
                     ) : searchResults.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                          {searchResults
                            .filter(card => searchExpansionFilter === 'all' || card.set_name === searchExpansionFilter)
                            .map((card) => (
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
                      price={convertPrice(
                        card.is_foil ? card.prices?.usd_foil ?? null : card.prices?.usd ?? null
                      )}
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
