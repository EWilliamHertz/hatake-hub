import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, TrendingUp, Clock, Filter } from "lucide-react";
import { TradingCard } from "@/components/TradingCard";
import { TradeOfferDialog } from "@/components/TradeOfferDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MarketplaceListing {
  id: string;
  cardData: {
    name: string;
    set_name: string;
    rarity: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
    };
    prices?: {
      usd?: number | null;
      usd_foil?: number | null;
      eur?: number | null;
      eur_foil?: number | null;
    };
    is_foil?: boolean;
    foil?: boolean;
  };
  sellerId: string;
  sellerData: {
    displayName: string;
    country: string;
  };
  price: number;
  priceEur?: number;
  condition: string;
  isFoil?: boolean;
  is_foil?: boolean;
  foil?: boolean;
  sale_quantity?: number;
  quantity?: number;
  game?: string;
  currency?: string;
}

const Marketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [filterGame, setFilterGame] = useState<string>("all");
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [filterCondition, setFilterCondition] = useState<string>("all");
  const [filterSet, setFilterSet] = useState<string>("all");
  const [filterFoilOnly, setFilterFoilOnly] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [prefilledOffer, setPrefilledOffer] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Listen to marketplace listings in real-time
    const marketplaceRef = collection(db, 'marketplaceListings');
    const q = query(marketplaceRef, orderBy('listedAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const listingsData: MarketplaceListing[] = [];
        snapshot.forEach((doc) => {
          listingsData.push({ id: doc.id, ...doc.data() } as MarketplaceListing);
        });
        setListings(listingsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Marketplace error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleMakeOffer = (listing: MarketplaceListing) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setPrefilledOffer(undefined); // Let user type their price
    setSelectedListing(listing);
    setIsOfferDialogOpen(true);
  };

  const handleBuy = (listing: MarketplaceListing) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // "Buy" pre-fills the full price to expedite the process
    setPrefilledOffer(listing.price);
    setSelectedListing(listing);
    setIsOfferDialogOpen(true);
  };

  const filteredListings = listings.filter((listing) => {
    const gameValue = (listing.game || (listing.cardData as any).game || "").toLowerCase();
    const gameMatch = filterGame === "all" || gameValue === filterGame.toLowerCase();
    const rarityMatch = filterRarity === "all" || listing.cardData.rarity.toLowerCase() === filterRarity.toLowerCase();
    const conditionMatch = filterCondition === "all" || listing.condition.toLowerCase() === filterCondition.toLowerCase();
    const setMatch = filterSet === "all" || listing.cardData.set_name === filterSet;
    const isFoilCard = listing.isFoil || listing.is_foil || listing.foil || listing.cardData?.is_foil || listing.cardData?.foil || false;
    const foilMatch = !filterFoilOnly || isFoilCard;
    const price = listing.price;
    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    const minMatch = min === null || price >= min;
    const maxMatch = max === null || price <= max;
    return gameMatch && rarityMatch && conditionMatch && setMatch && foilMatch && minMatch && maxMatch;
  });

  const availableSets = Array.from(new Set(listings.map(l => l.cardData.set_name).filter(Boolean)));

  const totalListings = filteredListings.length;
  const totalValue = filteredListings.reduce((sum, l) => sum + (l.price || 0) * (l.sale_quantity || l.quantity || 1), 0);
  const averagePrice = totalListings > 0 ? totalValue / totalListings : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
          <div className="flex gap-3 overflow-x-auto pb-2 mb-3">
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Hot Deals
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              New Listings
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Secure Transactions
            </Badge>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={filterRarity} onValueChange={setFilterRarity}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Rarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rarities</SelectItem>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="uncommon">Uncommon</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="mythic">Mythic</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterGame} onValueChange={setFilterGame}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  <SelectItem value="mtg">Magic: The Gathering</SelectItem>
                  <SelectItem value="pokemon">Pokémon</SelectItem>
                  <SelectItem value="yugioh">Yu-Gi-Oh!</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  <SelectItem value="near_mint">Near Mint</SelectItem>
                  <SelectItem value="lightly_played">Lightly Played</SelectItem>
                  <SelectItem value="moderately_played">Moderately Played</SelectItem>
                  <SelectItem value="heavily_played">Heavily Played</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSet} onValueChange={setFilterSet}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Set/Expansion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sets</SelectItem>
                  {availableSets.map(set => (
                    <SelectItem key={set} value={set}>{set}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background">
                <Checkbox 
                  id="foil-only" 
                  checked={filterFoilOnly}
                  onCheckedChange={(checked) => setFilterFoilOnly(checked === true)}
                />
                <label htmlFor="foil-only" className="text-sm cursor-pointer">Foil Only</label>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                className="h-10 w-24 rounded-md border border-border bg-background px-2 text-sm"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <input
                type="number"
                className="h-10 w-24 rounded-md border border-border bg-background px-2 text-sm"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{totalListings} listings</span>
            <span>Average price: ${averagePrice.toFixed(2)}</span>
            <span>Total value: ${totalValue.toFixed(2)}</span>
          </div>
        </div>
      </header>

      {/* Marketplace Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading marketplace...</p>
          </Card>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive mb-2">Error loading marketplace</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </Card>
        ) : filteredListings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No listings match your filters</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                {/* Card Preview */}
                <div className="p-2">
                  <div className="relative">
                    <TradingCard
                      id={listing.id}
                      name={listing.cardData.name}
                      set={listing.cardData.set_name}
                      rarity={listing.cardData.rarity}
                      imageUrl={listing.cardData.image_uris?.normal || listing.cardData.image_uris?.small}
                      isFoil={listing.isFoil || listing.is_foil || listing.foil || listing.cardData?.is_foil || listing.cardData?.foil || false}
                    />
                    {(listing.sale_quantity || listing.quantity) && (listing.sale_quantity || listing.quantity)! > 1 && (
                      <Badge className="absolute top-1 right-1 text-xs">
                        x{listing.sale_quantity || listing.quantity}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Listing Details */}
                <div className="p-2 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-primary">
                      ${listing.price.toFixed(2)}
                    </div>
                    {(listing.isFoil || listing.is_foil || listing.foil || listing.cardData?.foil) && (
                      <Badge variant="secondary" className="text-xs">Foil</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {listing.condition}
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <Button size="sm" variant="outline" className="w-full text-xs h-8" onClick={() => handleMakeOffer(listing)}>
                      Offer
                    </Button>
                    <Button size="sm" className="w-full text-xs h-8" onClick={() => handleBuy(listing)}>
                      Buy
                    </Button>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center truncate">
                    {listing.sellerData.displayName}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedListing && (
        <TradeOfferDialog
          open={isOfferDialogOpen}
          onOpenChange={setIsOfferDialogOpen}
          partner={{
            uid: selectedListing.sellerId,
            displayName: selectedListing.sellerData.displayName
          }}
        />
      )}
    </div>
  );
};

export default Marketplace;