import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TradingCard } from "@/components/TradingCard";
import { CardSearchBar } from "@/components/CardSearchBar";
import { CardDetailModal } from "@/components/CardDetailModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Grid3x3, List, Filter, Plus, Upload } from "lucide-react";
import { useCardSearch } from "@/hooks/useCardSearch";
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
}

const Collection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
            condition: data.condition
          });
        });
        setUserCards(cards);
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">My Collection</h1>
            <div className="flex gap-2">
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
                            <TradingCard
                              id={card.id}
                              name={card.name}
                              set={card.set_name}
                              rarity={card.rarity}
                              imageUrl={card.image_uris?.normal || card.images?.[0]?.medium}
                              isFoil={false}
                            />
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

            <CardDetailModal
              open={isCardDetailOpen}
              onOpenChange={setIsCardDetailOpen}
              card={selectedCard}
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
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Sets</SelectItem>
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
              : "space-y-3"
          }>
            {filteredCards.map((card) => (
              <TradingCard
                key={card.id}
                id={card.id}
                name={card.name}
                set={card.set_name}
                rarity={card.rarity}
                imageUrl={card.image_uris?.normal || card.image_uris?.small}
                isFoil={card.is_foil}
                className={viewMode === "list" ? "flex" : ""}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Collection;
