import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs, limit, orderBy, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateOrderStatus } from "@/lib/firebase-functions"; 
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradingCard } from "@/components/TradingCard";
import { Plus, Search, RefreshCw, Check, X, DollarSign, AlertCircle, Truck, PackageCheck, MapPin, ArrowRightLeft, Clock, History } from "lucide-react";
import { toast } from "sonner";

// Types
interface TradeItem {
  id: string;
  name: string;
  set_name: string;
  image_uri?: string;
  rarity?: string;
  is_foil?: boolean;
  price?: number; // Added optional price field for value calc
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
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'sent' | 'received'; 
  updatedAt: any;
  participants: string[];
}

const Trades = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Address View State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [viewingAddress, setViewingAddress] = useState<{name: string, address: any} | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Main Query
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
      // Fallback logic if index is missing
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

  // Handlers
  const handleUpdateStatus = async (tradeId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "trades", tradeId), { status: newStatus, updatedAt: serverTimestamp() });
      toast.success(`Trade ${newStatus}`);
    } catch (e) {
      toast.error("Action failed");
    }
  };

  const handleCloudStatusUpdate = async (tradeId: string, status: 'sent' | 'received') => {
    try {
        toast.info("Updating status...");
        await updateOrderStatus({ orderId: tradeId, status }); 
        toast.success(`Marked as ${status}!`);
    } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Failed to update status");
    }
  };

  const handleViewShipping = async (userId: string, userName: string) => {
      try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
              const userData = userDoc.data();
              const address = userData.address || {
                  street: userData.street || "Not provided",
                  city: userData.city || "Not provided",
                  zip: userData.zip || userData.postalCode || "",
                  country: userData.country || "Not provided"
              };
              setViewingAddress({ name: userName, address });
              setAddressModalOpen(true);
          } else {
              toast.error("User details not found.");
          }
      } catch (e) {
          toast.error("Failed to fetch address.");
      }
  };

  // Filter Logic
  const incomingTrades = trades.filter(t => t.receiverId === user?.uid && t.status === 'pending');
  const outgoingTrades = trades.filter(t => t.proposerId === user?.uid && t.status === 'pending');
  const activeTrades = trades.filter(t => ['accepted', 'sent', 'received'].includes(t.status));
  const historyTrades = trades.filter(t => ['completed', 'rejected', 'cancelled'].includes(t.status));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border px-4 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6 text-primary" />
          Trades
        </h1>
        <Button onClick={() => setIsNewTradeOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New Trade
        </Button>
      </header>

      {queryError && (
        <div className="bg-amber-500/10 text-amber-500 p-3 text-xs text-center border-b border-amber-500/20">
          <AlertCircle className="inline h-3 w-3 mr-1" />
          <span className="font-semibold">Database Index Required:</span> Trades are currently unordered. Open console to create index.
        </div>
      )}

      {/* Main Content with Tabs */}
      <div className="max-w-3xl mx-auto p-4">
        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="incoming" className="text-xs sm:text-sm">Incoming ({incomingTrades.length})</TabsTrigger>
            <TabsTrigger value="outgoing" className="text-xs sm:text-sm">Outgoing ({outgoingTrades.length})</TabsTrigger>
            <TabsTrigger value="active" className="text-xs sm:text-sm">Active ({activeTrades.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
          </TabsList>

          {loading ? (
             <div className="py-12 text-center text-muted-foreground animate-pulse">Loading trade data...</div>
          ) : (
            <>
              <TabsContent value="incoming" className="space-y-4">
                {incomingTrades.length === 0 ? <EmptyState message="No incoming trade requests." /> : 
                  incomingTrades.map(trade => (
                    <TradeCard key={trade.id} trade={trade} currentUserId={user!.uid} onUpdate={handleUpdateStatus} onCloudUpdate={handleCloudStatusUpdate} onViewShipping={handleViewShipping} />
                  ))
                }
              </TabsContent>

              <TabsContent value="outgoing" className="space-y-4">
                {outgoingTrades.length === 0 ? <EmptyState message="You haven't sent any trade requests." /> : 
                  outgoingTrades.map(trade => (
                    <TradeCard key={trade.id} trade={trade} currentUserId={user!.uid} onUpdate={handleUpdateStatus} onCloudUpdate={handleCloudStatusUpdate} onViewShipping={handleViewShipping} />
                  ))
                }
              </TabsContent>

              <TabsContent value="active" className="space-y-4">
                {activeTrades.length === 0 ? <EmptyState message="No active trades in progress." /> : 
                  activeTrades.map(trade => (
                    <TradeCard key={trade.id} trade={trade} currentUserId={user!.uid} onUpdate={handleUpdateStatus} onCloudUpdate={handleCloudStatusUpdate} onViewShipping={handleViewShipping} />
                  ))
                }
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {historyTrades.length === 0 ? <EmptyState message="No trade history." /> : 
                  historyTrades.map(trade => (
                    <TradeCard key={trade.id} trade={trade} currentUserId={user!.uid} onUpdate={handleUpdateStatus} onCloudUpdate={handleCloudStatusUpdate} onViewShipping={handleViewShipping} />
                  ))
                }
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <NewTradeDialog open={isNewTradeOpen} onOpenChange={setIsNewTradeOpen} currentUser={user} />
      
      {/* Shipping Address Modal */}
      <Dialog open={addressModalOpen} onOpenChange={setAddressModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Shipping Information</DialogTitle>
                <DialogDescription>Ship items to {viewingAddress?.name}</DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-muted/50 rounded-md space-y-3 text-sm">
                {viewingAddress ? (
                    <>
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{viewingAddress.name}</span>
                        </div>
                        <div className="pl-6 space-y-1 text-muted-foreground">
                            <p>{viewingAddress.address.street}</p>
                            <p>{viewingAddress.address.zip} {viewingAddress.address.city}</p>
                            <p className="font-medium text-foreground">{viewingAddress.address.country}</p>
                        </div>
                    </>
                ) : <p>Loading...</p>}
            </div>
            <Button onClick={() => setAddressModalOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
    <RefreshCw className="h-10 w-10 mx-auto mb-3 opacity-20" />
    <p>{message}</p>
  </div>
);

const TradeCard = ({ trade, currentUserId, onUpdate, onCloudUpdate, onViewShipping }: any) => {
  const isIncoming = trade.receiverId === currentUserId;
  const partnerName = isIncoming ? trade.proposerName : trade.receiverName;
  const partnerId = isIncoming ? trade.proposerId : trade.receiverId;

  // Items logic
  const myItems = isIncoming ? trade.receiverItems : trade.proposerItems;
  const theirItems = isIncoming ? trade.proposerItems : trade.receiverItems;
  const myMoney = isIncoming ? trade.receiverMoney : trade.proposerMoney;
  const theirMoney = isIncoming ? trade.proposerMoney : trade.receiverMoney;

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      {/* Header Bar */}
      <div className="bg-muted/30 p-3 flex justify-between items-center border-b">
        <div className="flex items-center gap-2">
          <Badge variant={
            trade.status === 'pending' ? 'secondary' : 
            trade.status === 'accepted' ? 'default' : 
            trade.status === 'sent' ? 'default' :
            trade.status === 'received' ? 'outline' : 
            'destructive'
          }>
            {trade.status.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {isIncoming ? "From" : "To"} <span className="font-semibold text-foreground">{partnerName}</span>
          </span>
        </div>
        <div className="flex items-center text-xs text-muted-foreground gap-1">
           <Clock className="h-3 w-3" />
           {trade.updatedAt?.seconds ? new Date(trade.updatedAt.seconds * 1000).toLocaleDateString() : 'Just now'}
        </div>
      </div>

      {/* Trade Content Grid */}
      <div className="grid grid-cols-2 text-sm">
        
        {/* Left Side (You) */}
        <div className="p-4 border-r relative">
          <p className="font-bold text-xs uppercase text-muted-foreground mb-3 flex justify-between">
            You Give
            {myMoney > 0 && <span className="text-green-600 bg-green-50 px-1.5 rounded">+${myMoney}</span>}
          </p>
          <div className="min-h-[80px]">
            {myItems && myItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {myItems.map((item: any) => (
                        <div key={item.id} className="relative aspect-[2.5/3.5] bg-muted rounded overflow-hidden border">
                            {item.image_uri ? (
                                <img src={item.image_uri} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] p-1 text-center break-all">{item.name}</div>
                            )}
                            {item.is_foil && <div className="absolute bottom-0 right-0 bg-yellow-400 text-[8px] font-bold px-1 text-black">FOIL</div>}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">
                    {myMoney > 0 ? "Only Cash" : "Nothing"}
                </div>
            )}
          </div>
        </div>

        {/* Right Side (Them) */}
        <div className="p-4">
          <p className="font-bold text-xs uppercase text-muted-foreground mb-3 flex justify-between">
            You Get
            {theirMoney > 0 && <span className="text-green-600 bg-green-50 px-1.5 rounded">+${theirMoney}</span>}
          </p>
          <div className="min-h-[80px]">
            {theirItems && theirItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {theirItems.map((item: any) => (
                        <div key={item.id} className="relative aspect-[2.5/3.5] bg-muted rounded overflow-hidden border">
                            {item.image_uri ? (
                                <img src={item.image_uri} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] p-1 text-center break-all">{item.name}</div>
                            )}
                            {item.is_foil && <div className="absolute bottom-0 right-0 bg-yellow-400 text-[8px] font-bold px-1 text-black">FOIL</div>}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">
                    {theirMoney > 0 ? "Only Cash" : "Nothing"}
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-muted/10 p-3 border-t">
        {/* Pending Actions */}
        {trade.status === 'pending' && isIncoming && (
            <div className="flex gap-2">
            <Button className="flex-1 bg-green-600 hover:bg-green-700 h-9" onClick={() => onUpdate(trade.id, 'accepted')}>
                <Check className="h-4 w-4 mr-2" /> Accept
            </Button>
            <Button className="flex-1 h-9" variant="destructive" onClick={() => onUpdate(trade.id, 'rejected')}>
                <X className="h-4 w-4 mr-2" /> Reject
            </Button>
            </div>
        )}
        {trade.status === 'pending' && !isIncoming && (
             <Button className="w-full h-9" variant="outline" disabled>
                Waiting for response...
            </Button>
        )}

        {/* Active Trade Actions */}
        {['accepted', 'sent', 'received'].includes(trade.status) && (
            <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full h-9" onClick={() => onViewShipping(partnerId, partnerName)}>
                    <MapPin className="h-4 w-4 mr-2" /> View Shipping Info
                </Button>
                
                <div className="flex gap-2">
                    <Button 
                        className={`flex-1 h-9 ${trade.status === 'sent' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}`}
                        variant="secondary" 
                        onClick={() => onCloudUpdate(trade.id, 'sent')}
                        disabled={trade.status === 'sent' || trade.status === 'received'} 
                    >
                        {trade.status === 'sent' ? <Check className="h-4 w-4 mr-2"/> : <Truck className="h-4 w-4 mr-2" />} 
                        {trade.status === 'sent' ? 'Sent' : 'Mark Sent'}
                    </Button>
                    
                    <Button 
                        className="flex-1 h-9" 
                        variant="secondary" 
                        onClick={() => onCloudUpdate(trade.id, 'received')}
                        disabled={trade.status === 'received'} 
                    >
                        <PackageCheck className="h-4 w-4 mr-2" /> Mark Received
                    </Button>
                </div>
            </div>
        )}
      </div>
    </Card>
  );
};

// ... Dialog Components (NewTradeDialog) ...
// Note: Keeping existing NewTradeDialog logic but ensuring imports match.
const NewTradeDialog = ({ open, onOpenChange, currentUser }: any) => {
  const [step, setStep] = useState<'user' | 'build'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [myOffer, setMyOffer] = useState<TradeItem[]>([]);
  const [theirOffer, setTheirOffer] = useState<TradeItem[]>([]);
  const [myMoney, setMyMoney] = useState('');
  const [theirMoney, setTheirMoney] = useState('');
  const [activeCollection, setActiveCollection] = useState<any[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || step !== 'user') {
      setUsers([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const usersRef = collection(db, "users");
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

  const loadCollection = async (userId: string) => {
    setLoadingCollection(true);
    try {
      const q = query(collection(db, "users", userId, "collection"), orderBy("addedAt", "desc"), limit(50));
      const snap = await getDocs(q);
      setActiveCollection(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
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
    loadCollection(currentUser.uid);
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
                  <CardGrid cards={activeCollection} selected={myOffer} onToggle={(c: any) => toggleCard(c, true)} loading={loadingCollection} />
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
                  <CardGrid cards={activeCollection} selected={theirOffer} onToggle={(c: any) => toggleCard(c, false)} loading={loadingCollection} />
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