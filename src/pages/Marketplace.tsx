import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, Clock } from "lucide-react";
import { TradingCard } from "@/components/TradingCard";

const mockListings = [
  {
    id: "1",
    card: {
      id: "1",
      name: "Charizard VMAX",
      set: "Champion's Path",
      rarity: "Rare",
      isFoil: true,
    },
    price: 299.99,
    seller: "CardMaster",
    escrow: true,
  },
  {
    id: "2",
    card: {
      id: "2",
      name: "Black Lotus",
      set: "Alpha",
      rarity: "Rare",
      isFoil: false,
    },
    price: 25000.00,
    seller: "VintageCollector",
    escrow: true,
  },
  {
    id: "3",
    card: {
      id: "3",
      name: "Elsa - Spirit of Winter",
      set: "The First Chapter",
      rarity: "Uncommon",
      isFoil: true,
    },
    price: 45.99,
    seller: "LorcanaFan",
    escrow: false,
  },
];

const Marketplace = () => {
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
              Escrow Protected
            </Badge>
          </div>
        </div>
      </header>

      {/* Marketplace Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockListings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden">
              {/* Card Preview */}
              <div className="p-4">
                <TradingCard {...listing.card} />
              </div>

              {/* Listing Details */}
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      ${listing.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Seller: {listing.seller}
                    </div>
                  </div>
                  {listing.escrow && (
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Escrow
                    </Badge>
                  )}
                </div>

                <Button className="w-full">Buy Now</Button>

                {listing.escrow && (
                  <p className="text-xs text-muted-foreground text-center">
                    Protected by secure escrow service
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
