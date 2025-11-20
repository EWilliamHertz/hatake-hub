import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  };
  sellerId: string;
  sellerData: {
    displayName: string;
    country: string;
  };
  price: number;
  condition: string;
  isFoil: boolean;
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

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Listen to marketplace listings in real-time (Firestorm collection: marketplaceListings)
    const marketplaceRef = collection(db, 'marketplaceListings');
    const q = query(marketplaceRef, orderBy('timestamp', 'desc'), limit(50));
    
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
  }, [user, navigate]);

  const handleMakeOffer = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setIsOfferDialogOpen(true);
  };

  const filteredListings = listings.filter((listing) => {
    const gameMatch = filterGame === "all" || listing.cardData.name.toLowerCase().includes(filterGame.toLowerCase());
    const rarityMatch = filterRarity === "all" || listing.cardData.rarity.toLowerCase() === filterRarity.toLowerCase();
    return gameMatch && rarityMatch;
  });

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
          <div className="flex gap-2">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                {/* Card Preview */}
                <div className="p-4">
                  <TradingCard
                    id={listing.id}
                    name={listing.cardData.name}
                    set={listing.cardData.set_name}
                    rarity={listing.cardData.rarity}
                    imageUrl={listing.cardData.image_uris?.normal || listing.cardData.image_uris?.small}
                    isFoil={listing.isFoil}
                  />
                </div>

                {/* Listing Details */}
                <div className="p-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        ${listing.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {listing.condition} • {listing.sellerData.country}
                      </div>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Secure
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="w-full" onClick={() => handleMakeOffer(listing)}>
                      Make Offer
                    </Button>
                    <Button className="w-full">Buy Now</Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Sold by {listing.sellerData.displayName}
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
          listingId={selectedListing.id}
          sellerId={selectedListing.sellerId}
          cardName={selectedListing.cardData.name}
          listingPrice={selectedListing.price}
        />
      )}
    </div>
  );
};

export default Marketplace;
