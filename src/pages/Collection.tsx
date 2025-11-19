import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TradingCard } from "@/components/TradingCard";
import { CardSearchBar } from "@/components/CardSearchBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Grid3x3, List, Filter, Plus } from "lucide-react";
import { useCardSearch } from "@/hooks/useCardSearch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  image_url: string;
  is_foil: boolean;
  condition?: string;
  forSale?: boolean;
  salePrice?: number;
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
          cards.push({ id: doc.id, ...doc.data() } as UserCard);
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

  const handleAddCard = async (card: any) => {
    // Would add card to Firestore collection
    toast.success(`${card.name} added to collection!`);
    setIsAddDialogOpen(false);
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {searchResults.map((card) => (
                      <div key={card.id} className="cursor-pointer" onClick={() => handleAddCard(card)}>
                        <TradingCard
                          id={card.id}
                          name={card.name}
                          set={card.set_name}
                          rarity={card.rarity}
                          imageUrl={card.image_uris.normal}
                          isFoil={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                imageUrl={card.image_url}
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
