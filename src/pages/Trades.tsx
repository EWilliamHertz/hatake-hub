import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs, limit, orderBy, serverTimestamp, startAt, endAt } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradingCard } from "@/components/TradingCard";
import { Plus, Search, RefreshCw, Check, X, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Types
interface TradeItem {
  id: string;
  name: string;
  set_name: string;
  image_uri?: string;
  rarity?: string;
  is_foil?: boolean;
}

interface Trade {
  id: string;
  proposerId: string;
  proposerName: string;
  receiverId: string;
  receiverName: string;
  proposerItems: TradeItem[];
  receiverItems: TradeItem[];
  proposerMoney: number;
  receiverMoney: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  updatedAt: any;
  participants: string[];
}

const Trades = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Note: This query requires a Composite Index in Firestore
    // Collection: trades
    // Fields: participants (Arrays), updatedAt (Descending)
    const q = query(
      collection(db, "trades"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade)));
      setLoading(false);
      setQueryError(null);
    }, (err) => {
      console.error("Trade fetch error:", err);
      // Fallback query if index is missing (shows trades but unordered)
      if (err.code === 'failed-precondition' || err.message.includes('index')) {
         setQueryError("Missing Index");
         const fallbackQ = query(
            collection(db, "trades"),
            where("participants", "array-contains", user.uid)
         );
         getDocs(fallbackQ).then(snap => {
             setTrades(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade)));
             setLoading(false);
         });
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleUpdateStatus = async (tradeId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "trades", tradeId), { status: newStatus, updatedAt: serverTimestamp() });
      toast.success(`Trade ${newStatus}`);
    } catch (e) {
      toast.error("Action failed");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Trades</h1>
        <Button onClick={() => setIsNewTradeOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New Trade
        </Button>
      </header>

      {queryError && (
        <div className="bg-amber-500/10 text-amber-500 p-2 text-xs text-center border-b border-amber-500/20">
          <AlertCircle className="inline h-3 w-3 mr-1" />
          Trades may be unordered (Database Indexing...)
        </div>
      )}

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center text-muted-foreground animate-pulse">Loading trades...</p>
        ) : trades.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No active trades.</p>
            <p className="text-xs mt-2 opacity-50">Create one or buy from the marketplace!</p>
          </div>
        ) : (
          trades.map((trade) => (
            <TradeCard key={trade.id} trade={trade} currentUserId={user!.uid} onUpdate={handleUpdateStatus} />
          ))
        )}
      </div>

      <NewTradeDialog open={isNewTradeOpen} onOpenChange={setIsNewTradeOpen} currentUser={user} />
    </div>
  );
};

// ... TradeCard Component remains same ...
const TradeCard = ({ trade, currentUserId, onUpdate }: { trade: Trade, currentUserId: string, onUpdate: any }) => {
  const isIncoming = trade.receiverId === currentUserId;
  const partnerName = isIncoming ? trade.proposerName : trade.receiverName;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge variant={trade.status === 'pending' ? 'secondary' : trade.status === 'accepted' ? 'default' : 'destructive'}>
            {trade.status.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {isIncoming ? "From" : "To"} <span className="font-semibold text-foreground">{partnerName}</span>
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
           {trade.updatedAt?.seconds ? new Date(trade.updatedAt.seconds * 1000).toLocaleDateString() : 'Just now'}
        </span>
      </div>

      {/* Trade Content Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm relative">
        {/* Left Side (You) */}
        <div className="space-y-2">
          <p className="font-semibold text-xs uppercase text-muted-foreground">You {isIncoming ? "Get" : "Give"}</p>
          <ScrollArea className="h-32 rounded-md border bg-muted/20 p-2">
            {isIncoming ? renderItems(trade.proposerItems, trade.proposerMoney) : renderItems(trade.receiverItems, trade.receiverMoney)}
          </ScrollArea>
        </div>

        {/* Center Divider Icon */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-1 rounded-full border">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Right Side (Them) */}
        <div className="space-y-2 text-right">
          <p className="font-semibold text-xs uppercase text-muted-foreground">{partnerName} {isIncoming ? "Gets" : "Gives"}</p>
          <ScrollArea className="h-32 rounded-md border bg-muted/20 p-2">
             {isIncoming ? renderItems(trade.receiverItems, trade.receiverMoney) : renderItems(trade.proposerItems, trade.proposerMoney)}
          </ScrollArea>
        </div>
      </div>

      {/* Actions */}
      {trade.status === 'pending' && isIncoming && (
        <div className="flex gap-2 pt-2">
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => onUpdate(trade.id, 'accepted')}>
            <Check className="h-4 w-4 mr-2" /> Accept
          </Button>
          <Button className="flex-1" variant="destructive" onClick={() => onUpdate(trade.id, 'rejected')}>
            <X className="h-4 w-4 mr-2" /> Reject
          </Button>
        </div>
      )}
    </Card>
  );
};

const renderItems = (items: TradeItem[], money: number) => (
  <div className="space-y-1">
    {items && items.length > 0 ? items.map((item, idx) => (
      <div key={idx} className="flex items-center gap-2">
        <span className="truncate">{item.name}</span>
        {item.is_foil && <Badge variant="outline" className="text-[10px] h-4 px-1">Foil</Badge>}
      </div>
    )) : null}
    {money > 0 && <div className="font-bold text-green-500">+ ${money}</div>}
    {(!items || items.length === 0) && money === 0 && <span className="text-muted-foreground italic">Nothing</span>}
  </div>
);

const NewTradeDialog = ({ open, onOpenChange, currentUser }: any) => {
  const [step, setStep] = useState<'user' | 'build'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Trade State
  const [myOffer, setMyOffer] = useState<TradeItem[]>([]);
  const [theirOffer, setTheirOffer] = useState<TradeItem[]>([]);
  const [myMoney, setMyMoney] = useState('');
  const [theirMoney, setTheirMoney] = useState('');
  const [activeCollection, setActiveCollection] = useState<any[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);

  // Improved Search Users
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || step !== 'user') {
      setUsers([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchLoading(true);
      try {
        // Search by displayName prefix
        const usersRef = collection(db, "users");
        // Using startAt/endAt for prefix search (requires name to be indexed)
        // Note: For case-insensitive search in Firestore, you typically need a separate lowercase field.
        // Falling back to client-side filter of recent users is safer without complex index setup.
        
        const q = query(usersRef, limit(20)); 
        const snap = await getDocs(q);
        const results = snap.docs
          .map(d => ({ uid: d.id, ...d.data() } as any))
          .filter(u => u.uid !== currentUser.uid && 
            (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
             u.email?.toLowerCase().includes(searchQuery.toLowerCase())));
        setUsers(results);
      } catch (e) {
        console.error("Search error", e);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // Load Collection Helper
  const loadCollection = async (userId: string) => {
    setLoadingCollection(true);
    try {
      const q = query(collection(db, "users", userId, "collection"), orderBy("addedAt", "desc"), limit(50));
      const snap = await getDocs(q);
      setActiveCollection(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
        // Fallback if index missing
        const q2 = query(collection(db, "users", userId, "collection"), limit(50));
        const snap = await getDocs(q2);
        setActiveCollection(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoadingCollection(false);
    }
  };

  const handleSelectPartner = (partner: any) => {
    setSelectedPartner(partner);
    setStep('build');
    loadCollection(currentUser.uid); // Default to showing my collection first
  };

  const toggleCard = (card: any, isMyCollection: boolean) => {
    const item: TradeItem = {
      id: card.id,
      name: card.name,
      set_name: card.set_name,
      image_uri: card.image_uris?.small || card.image_uris?.normal,
      rarity: card.rarity,
      is_foil: card.is_foil
    };

    if (isMyCollection) {
      setMyOffer(prev => prev.some(i => i.id === item.id) 
        ? prev.filter(i => i.id !== item.id) 
        : [...prev, item]);
    } else {
      setTheirOffer(prev => prev.some(i => i.id === item.id) 
        ? prev.filter(i => i.id !== item.id) 
        : [...prev, item]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPartner) return;
    try {
      await addDoc(collection(db, "trades"), {
        proposerId: currentUser.uid,
        proposerName: currentUser.displayName,
        receiverId: selectedPartner.uid,
        receiverName: selectedPartner.displayName,
        participants: [currentUser.uid, selectedPartner.uid],
        proposerItems: myOffer,
        receiverItems: theirOffer,
        proposerMoney: parseFloat(myMoney) || 0,
        receiverMoney: parseFloat(theirMoney) || 0,
        status: 'pending',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      toast.success("Trade offer sent!");
      onOpenChange(false);
      // Reset
      setStep('user');
      setMyOffer([]);
      setTheirOffer([]);
      setMyMoney('');
      setTheirMoney('');
      setSelectedPartner(null);
      setSearchQuery('');
    } catch (e) {
      toast.error("Failed to create trade");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{step === 'user' ? "Select Partner" : `Trade with ${selectedPartner?.displayName}`}</DialogTitle>
        </DialogHeader>

        {step === 'user' ? (
          <div className="p-4 space-y-4 h-full">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users by name or email..." 
                className="pl-9" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 h-[300px] overflow-y-auto">
              {searchLoading ? (
                  <p className="text-center text-sm text-muted-foreground py-4">Searching...</p>
              ) : users.length > 0 ? (
                  users.map(u => (
                    <div key={u.uid} onClick={() => handleSelectPartner(u)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer">
                      <Avatar><AvatarImage src={u.photoURL} /><AvatarFallback>{u.displayName?.[0] || 'U'}</AvatarFallback></Avatar>
                      <span>{u.displayName}</span>
                    </div>
                  ))
              ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                      {searchQuery ? "No users found" : "Type to search..."}
                  </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <Tabs defaultValue="give" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2 rounded-none">
                <TabsTrigger value="give" onClick={() => loadCollection(currentUser.uid)}>You Give ({myOffer.length})</TabsTrigger>
                <TabsTrigger value="get" onClick={() => loadCollection(selectedPartner.uid)}>You Get ({theirOffer.length})</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                <TabsContent value="give" className="mt-0 space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-card border rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <Input 
                      type="number" 
                      placeholder="Add Cash Offer ($)" 
                      value={myMoney} 
                      onChange={e => setMyMoney(e.target.value)}
                      className="border-none shadow-none focus-visible:ring-0" 
                    />
                  </div>
                  <CardGrid cards={activeCollection} selected={myOffer} onToggle={(c) => toggleCard(c, true)} loading={loadingCollection} />
                </TabsContent>

                <TabsContent value="get" className="mt-0 space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-card border rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <Input 
                      type="number" 
                      placeholder="Request Cash ($)" 
                      value={theirMoney} 
                      onChange={e => setTheirMoney(e.target.value)}
                      className="border-none shadow-none focus-visible:ring-0" 
                    />
                  </div>
                  <CardGrid cards={activeCollection} selected={theirOffer} onToggle={(c) => toggleCard(c, false)} loading={loadingCollection} />
                </TabsContent>
              </div>
            </Tabs>

            <div className="p-4 border-t bg-card flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('user')}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit}>Send Offer</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CardGrid = ({ cards, selected, onToggle, loading }: any) => {
  if (loading) return <div className="text-center p-8">Loading collection...</div>;
  if (cards.length === 0) return <div className="text-center p-8 text-muted-foreground">Collection is empty</div>;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {cards.map((card: any) => {
        const isSelected = selected.some((i: any) => i.id === card.id);
        return (
          <div key={card.id} className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary rounded-lg scale-95' : ''}`} onClick={() => onToggle(card)}>
            <TradingCard 
              id={card.id} 
              name={card.name} 
              set={card.set_name} 
              rarity={card.rarity} 
              imageUrl={card.image_uris?.small || card.image_uris?.normal}
              isFoil={card.is_foil}
            />
            {isSelected && (
              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <Check className="h-3 w-3" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Trades;