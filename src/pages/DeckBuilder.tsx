import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save, FileUp, Trash2 } from "lucide-react";
import { TradingCard } from "@/components/TradingCard";
import { CardSearchBar } from "@/components/CardSearchBar";
import { useCardSearch } from "@/hooks/useCardSearch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface DeckCard {
  id: string;
  name: string;
  set_name: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
  };
  quantity: number;
  isCommander?: boolean;
  isSideboard?: boolean;
}

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
}

const DeckBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deckFormat, setDeckFormat] = useState<"commander" | "eternal">("commander");
  const [deckName, setDeckName] = useState("My Deck");
  const [mainDeck, setMainDeck] = useState<DeckCard[]>([]);
  const [sideboard, setSideboard] = useState<DeckCard[]>([]);
  const [commander, setCommander] = useState<DeckCard | null>(null);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const { cards: searchResults, loading: searchLoading, search } = useCardSearch();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Load user's collection
    const collectionRef = collection(db, 'users', user.uid, 'collection');
    const q = query(collectionRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cards: UserCard[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        cards.push({
          id: doc.id,
          name: data.name || '',
          set_name: data.set_name || '',
          rarity: data.rarity || '',
          image_uris: data.image_uris,
        });
      });
      setUserCards(cards);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const handleSearch = (query: string, game: string) => {
    search({ query, game: game as any, page: 1, limit: 50 });
  };

  const addCardToDeck = (card: any, location: "main" | "sideboard" | "commander") => {
    const newCard: DeckCard = {
      id: card.id || card.api_id,
      name: card.name,
      set_name: card.set_name || card.expansion?.name || '',
      image_uris: card.image_uris || card.images?.[0],
      quantity: 1,
      isCommander: location === "commander",
      isSideboard: location === "sideboard",
    };

    if (location === "commander") {
      setCommander(newCard);
      toast.success(`${card.name} set as Commander`);
    } else if (location === "sideboard") {
      const existing = sideboard.find(c => c.id === newCard.id);
      if (existing) {
        setSideboard(sideboard.map(c => c.id === newCard.id ? { ...c, quantity: c.quantity + 1 } : c));
      } else {
        setSideboard([...sideboard, newCard]);
      }
      toast.success(`${card.name} added to sideboard`);
    } else {
      const existing = mainDeck.find(c => c.id === newCard.id);
      if (existing) {
        setMainDeck(mainDeck.map(c => c.id === newCard.id ? { ...c, quantity: c.quantity + 1 } : c));
      } else {
        setMainDeck([...mainDeck, newCard]);
      }
      toast.success(`${card.name} added to deck`);
    }
    
    setIsAddDialogOpen(false);
  };

  const removeCard = (cardId: string, location: "main" | "sideboard" | "commander") => {
    if (location === "commander") {
      setCommander(null);
    } else if (location === "sideboard") {
      const card = sideboard.find(c => c.id === cardId);
      if (card && card.quantity > 1) {
        setSideboard(sideboard.map(c => c.id === cardId ? { ...c, quantity: c.quantity - 1 } : c));
      } else {
        setSideboard(sideboard.filter(c => c.id !== cardId));
      }
    } else {
      const card = mainDeck.find(c => c.id === cardId);
      if (card && card.quantity > 1) {
        setMainDeck(mainDeck.map(c => c.id === cardId ? { ...c, quantity: c.quantity - 1 } : c));
      } else {
        setMainDeck(mainDeck.filter(c => c.id !== cardId));
      }
    }
  };

  const handleImportDecklist = () => {
    // Simple decklist parser
    const lines = importText.split('\n').filter(l => l.trim());
    const parsedCards: DeckCard[] = [];
    
    lines.forEach(line => {
      const match = line.match(/^(\d+)x?\s+(.+?)(?:\s+\((.+?)\))?$/);
      if (match) {
        const [, quantity, name, set] = match;
        parsedCards.push({
          id: `${name}-${set || 'unknown'}`,
          name: name.trim(),
          set_name: set?.trim() || '',
          quantity: parseInt(quantity),
        });
      }
    });

    setMainDeck(parsedCards);
    setImportText("");
    toast.success(`Imported ${parsedCards.length} cards`);
  };

  const totalMainDeckCards = mainDeck.reduce((sum, card) => sum + card.quantity, 0);
  const totalSideboardCards = sideboard.reduce((sum, card) => sum + card.quantity, 0);
  const maxMainDeck = deckFormat === "commander" ? 99 : 60;
  const maxSideboard = 15;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Input
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="text-2xl font-bold border-none bg-transparent focus-visible:ring-0 px-0"
                placeholder="Deck Name"
              />
              <div className="flex gap-4 mt-2">
                <Select value={deckFormat} onValueChange={(v: any) => setDeckFormat(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commander">Commander (99+1)</SelectItem>
                    <SelectItem value="eternal">Eternal (60+15)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
          <div className="space-y-4">
            {/* Commander Section (if Commander format) */}
            {deckFormat === "commander" && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Commander</h2>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Set Commander
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Cards to Deck</DialogTitle>
                      </DialogHeader>
                      <Tabs defaultValue="collection">
                        <TabsList className="w-full">
                          <TabsTrigger value="collection" className="flex-1">From Collection</TabsTrigger>
                          <TabsTrigger value="search" className="flex-1">Search Cards</TabsTrigger>
                          <TabsTrigger value="import" className="flex-1">Import Decklist</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="collection" className="space-y-4">
                          <div className="grid grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
                            {userCards.map((card) => (
                              <div key={card.id} className="cursor-pointer" onClick={() => addCardToDeck(card, "commander")}>
                                <TradingCard
                                  id={card.id}
                                  name={card.name}
                                  set={card.set_name}
                                  rarity={card.rarity}
                                  imageUrl={card.image_uris?.normal}
                                />
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="search" className="space-y-4">
                          <CardSearchBar onSearch={handleSearch} loading={searchLoading} />
                          <div className="grid grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
                            {searchResults.map((card) => (
                              <div key={card.id} className="cursor-pointer" onClick={() => addCardToDeck(card, "commander")}>
                                <TradingCard
                                  id={card.id}
                                  name={card.name}
                                  set={card.set_name}
                                  rarity={card.rarity}
                                  imageUrl={card.image_uris?.normal}
                                />
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="import" className="space-y-4">
                          <Textarea
                            placeholder="Paste your decklist here...&#10;Example:&#10;1 Sol Ring&#10;1 Command Tower (CMR)&#10;4 Lightning Bolt"
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            rows={15}
                          />
                          <Button onClick={handleImportDecklist} className="w-full">
                            <FileUp className="h-4 w-4 mr-2" />
                            Import Decklist
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
                {commander ? (
                  <div className="relative group">
                    <TradingCard
                      id={commander.id}
                      name={commander.name}
                      set={commander.set_name}
                      rarity="Mythic"
                      imageUrl={commander.image_uris?.normal}
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeCard(commander.id, "commander")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">No commander selected</p>
                  </div>
                )}
              </Card>
            )}

            {/* Main Deck */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Main Deck</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{totalMainDeckCards} / {maxMainDeck}</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Card
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Cards to Main Deck</DialogTitle>
                      </DialogHeader>
                      <Tabs defaultValue="collection">
                        <TabsList className="w-full">
                          <TabsTrigger value="collection" className="flex-1">From Collection</TabsTrigger>
                          <TabsTrigger value="search" className="flex-1">Search Cards</TabsTrigger>
                          <TabsTrigger value="import" className="flex-1">Import Decklist</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="collection">
                          <div className="grid grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
                            {userCards.map((card) => (
                              <div key={card.id} className="cursor-pointer" onClick={() => addCardToDeck(card, "main")}>
                                <TradingCard
                                  id={card.id}
                                  name={card.name}
                                  set={card.set_name}
                                  rarity={card.rarity}
                                  imageUrl={card.image_uris?.normal}
                                />
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="search">
                          <CardSearchBar onSearch={handleSearch} loading={searchLoading} />
                          <div className="grid grid-cols-4 gap-3 max-h-[500px] overflow-y-auto mt-4">
                            {searchResults.map((card) => (
                              <div key={card.id} className="cursor-pointer" onClick={() => addCardToDeck(card, "main")}>
                                <TradingCard
                                  id={card.id}
                                  name={card.name}
                                  set={card.set_name}
                                  rarity={card.rarity}
                                  imageUrl={card.image_uris?.normal}
                                />
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="import">
                          <Textarea
                            placeholder="Paste your decklist here...&#10;Example:&#10;4 Sol Ring&#10;2 Command Tower (CMR)&#10;4 Lightning Bolt"
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            rows={15}
                          />
                          <Button onClick={handleImportDecklist} className="w-full mt-4">
                            <FileUp className="h-4 w-4 mr-2" />
                            Import Decklist
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2 max-h-[400px] overflow-y-auto">
                {mainDeck.length === 0 ? (
                  <div className="col-span-6 border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">No cards in main deck</p>
                  </div>
                ) : (
                  mainDeck.map((card) => (
                    <div key={card.id} className="relative group">
                      <TradingCard
                        id={card.id}
                        name={card.name}
                        set={card.set_name}
                        rarity="Common"
                        imageUrl={card.image_uris?.normal}
                      />
                      <div className="absolute top-1 left-1 bg-background rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-border">
                        {card.quantity}
                      </div>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                        onClick={() => removeCard(card.id, "main")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Sideboard (Eternal format only) */}
            {deckFormat === "eternal" && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Sideboard</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{totalSideboardCards} / {maxSideboard}</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Card
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add Cards to Sideboard</DialogTitle>
                        </DialogHeader>
                        <Tabs defaultValue="collection">
                          <TabsList className="w-full">
                            <TabsTrigger value="collection" className="flex-1">From Collection</TabsTrigger>
                            <TabsTrigger value="search" className="flex-1">Search Cards</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="collection">
                            <div className="grid grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
                              {userCards.map((card) => (
                                <div key={card.id} className="cursor-pointer" onClick={() => addCardToDeck(card, "sideboard")}>
                                  <TradingCard
                                    id={card.id}
                                    name={card.name}
                                    set={card.set_name}
                                    rarity={card.rarity}
                                    imageUrl={card.image_uris?.normal}
                                  />
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="search">
                            <CardSearchBar onSearch={handleSearch} loading={searchLoading} />
                            <div className="grid grid-cols-4 gap-3 max-h-[500px] overflow-y-auto mt-4">
                              {searchResults.map((card) => (
                                <div key={card.id} className="cursor-pointer" onClick={() => addCardToDeck(card, "sideboard")}>
                                  <TradingCard
                                    id={card.id}
                                    name={card.name}
                                    set={card.set_name}
                                    rarity={card.rarity}
                                    imageUrl={card.image_uris?.normal}
                                  />
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
                  {sideboard.length === 0 ? (
                    <div className="col-span-6 border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <p className="text-muted-foreground text-sm">No cards in sideboard</p>
                    </div>
                  ) : (
                    sideboard.map((card) => (
                      <div key={card.id} className="relative group">
                        <TradingCard
                          id={card.id}
                          name={card.name}
                          set={card.set_name}
                          rarity="Common"
                          imageUrl={card.image_uris?.normal}
                        />
                        <div className="absolute top-1 left-1 bg-background rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-border">
                          {card.quantity}
                        </div>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                          onClick={() => removeCard(card.id, "sideboard")}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Deck Stats */}
          <Card className="p-6 h-fit">
            <h2 className="text-lg font-semibold mb-4">Deck Statistics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Format</span>
                <span className="font-semibold">{deckFormat === "commander" ? "Commander" : "Eternal"}</span>
              </div>
              {deckFormat === "commander" && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Commander</span>
                  <span className="font-semibold">{commander ? "1" : "0"} / 1</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Main Deck</span>
                <span className={`font-semibold ${totalMainDeckCards === maxMainDeck ? 'text-green-500' : ''}`}>
                  {totalMainDeckCards} / {maxMainDeck}
                </span>
              </div>
              {deckFormat === "eternal" && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sideboard</span>
                  <span className={`font-semibold ${totalSideboardCards === maxSideboard ? 'text-green-500' : ''}`}>
                    {totalSideboardCards} / {maxSideboard}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Unique Cards</span>
                <span className="font-semibold">{mainDeck.length + sideboard.length}</span>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Deck Complete</span>
                  <span className={`font-semibold ${
                    (deckFormat === "commander" && commander && totalMainDeckCards === 99) ||
                    (deckFormat === "eternal" && totalMainDeckCards === 60)
                      ? 'text-green-500'
                      : 'text-yellow-500'
                  }`}>
                    {(deckFormat === "commander" && commander && totalMainDeckCards === 99) ||
                     (deckFormat === "eternal" && totalMainDeckCards === 60)
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilder;
