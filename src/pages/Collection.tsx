import { useState } from "react";
import { TradingCard } from "@/components/TradingCard";
import { Button } from "@/components/ui/button";
import { Grid3x3, List, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockCards = [
  {
    id: "1",
    name: "Charizard VMAX",
    set: "Champion's Path",
    rarity: "Rare",
    imageUrl: "",
    isFoil: true,
  },
  {
    id: "2",
    name: "Pikachu V",
    set: "Vivid Voltage",
    rarity: "Rare",
    imageUrl: "",
    isFoil: false,
  },
  {
    id: "3",
    name: "Elsa - Spirit of Winter",
    set: "The First Chapter",
    rarity: "Uncommon",
    imageUrl: "",
    isFoil: true,
  },
  {
    id: "4",
    name: "Black Lotus",
    set: "Alpha",
    rarity: "Rare",
    imageUrl: "",
    isFoil: false,
  },
  {
    id: "5",
    name: "Mox Sapphire",
    set: "Beta",
    rarity: "Rare",
    imageUrl: "",
    isFoil: true,
  },
  {
    id: "6",
    name: "Mewtwo GX",
    set: "Shining Legends",
    rarity: "Uncommon",
    imageUrl: "",
    isFoil: false,
  },
];

const Collection = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedSet, setSelectedSet] = useState<string>("all");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">My Collection</h1>
          
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
                <SelectItem value="champions-path">Champion's Path</SelectItem>
                <SelectItem value="vivid-voltage">Vivid Voltage</SelectItem>
                <SelectItem value="first-chapter">The First Chapter</SelectItem>
                <SelectItem value="alpha">Alpha</SelectItem>
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
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Collection Grid/List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className={
          viewMode === "grid"
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-3"
        }>
          {mockCards.map((card) => (
            <TradingCard
              key={card.id}
              {...card}
              className={viewMode === "list" ? "flex" : ""}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Collection;
