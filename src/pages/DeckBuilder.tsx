import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Save } from "lucide-react";
import { TradingCard } from "@/components/TradingCard";

const DeckBuilder = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Deck Builder</h1>
              <p className="text-sm text-muted-foreground">Create your perfect deck</p>
            </div>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Save Deck
            </Button>
          </div>
        </div>
      </header>

      {/* Deck Builder Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Deck */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Current Deck</h2>
              <span className="text-sm text-muted-foreground">0 / 60 cards</span>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
              <Plus className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Drag cards here to build your deck
              </p>
            </div>
          </Card>

          {/* Card Pool */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Available Cards</h2>
            <div className="grid grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <TradingCard
                  key={i}
                  id={`${i}`}
                  name={`Card ${i}`}
                  set="Base Set"
                  rarity="Common"
                  className="cursor-grab active:cursor-grabbing"
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Deck Stats */}
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Deck Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Total Cards</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Creatures</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Spells</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Lands</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DeckBuilder;
