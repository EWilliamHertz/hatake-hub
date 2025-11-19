import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, Clock } from "lucide-react";
import { TradingCard } from "@/components/TradingCard";

interface MarketplaceListing {
  id: string;
  cardData: {
    name: string;
    set_name: string;
    rarity: string;
    image_uris?: { normal: string };
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

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Listen to marketplace listings in real-time
    const marketplaceRef = collection(db, 'marketplace');
    const q = query(marketplaceRef, orderBy('timestamp', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listingsData: MarketplaceListing[] = [];
      snapshot.forEach((doc) => {
        listingsData.push({ id: doc.id, ...doc.data() } as MarketplaceListing);
      });
      setListings(listingsData);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
          <div className="flex gap-3 overflow-x-auto pb-2">
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
        </div>
      </header>

      {/* Marketplace Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {listings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No listings available yet</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                {/* Card Preview */}
                <div className="p-4">
                  <TradingCard
                    id={listing.id}
                    name={listing.cardData.name}
                    set={listing.cardData.set_name}
                    rarity={listing.cardData.rarity}
                    imageUrl={listing.cardData.image_uris?.normal || ''}
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

                  <Button className="w-full">Contact Seller</Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Sold by {listing.sellerData.displayName}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
