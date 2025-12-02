import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, DollarSign, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc, serverTimestamp, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TradingCard } from "./TradingCard";

interface TradeOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: { uid: string, displayName: string }; // ✅ Added optional partner prop
}

export const TradeOfferDialog = ({ open, onOpenChange, partner }: TradeOfferDialogProps) => {
  const { user } = useAuth();
  
  // If a partner is passed, we skip the "User Search" step and go straight to building the trade
  const [step, setStep] = useState<'user' | 'build'>(partner ? 'build' : 'user');
  const [selectedPartner, setSelectedPartner] = useState<any>(partner || null);

  // Reset when opening with a new partner
  useEffect(() => {
    if (open && partner) {
        setSelectedPartner(partner);
        setStep('build');
    } else if (open && !partner) {
        setStep('user');
        setSelectedPartner(null);
    }
  }, [open, partner]);

  // ... (Existing State for Search/Offer)
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  
  const [myOffer, setMyOffer] = useState<any[]>([]);
  const [theirOffer, setTheirOffer] = useState<any[]>([]);
  const [myMoney, setMyMoney] = useState('');
  const [theirMoney, setTheirMoney] = useState('');
  
  const [activeCollection, setActiveCollection] = useState<any[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);

  // User Search (Only needed if no partner passed)
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || step !== 'user') {
      setUsers([]);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        const usersRef = collection(db, "users");
        // Simple client-side filter for demo (Replace with Algolia/Index for scale)
        const q = query(usersRef, limit(20)); 
        const snap = await getDocs(q);
        const results = snap.docs
          .map(d => ({ uid: d.id, ...d.data() } as any))
          .filter(u => u.uid !== user?.uid && 
            (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())));
        setUsers(results);
      } catch (e) {
        console.error("Search error", e);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const loadCollection = async (userId: string) => {
    setLoadingCollection(true);
    try {
      const q = query(collection(db, "users", userId, "collection"), limit(50));
      const snap = await getDocs(q);
      setActiveCollection(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoadingCollection(false);
    }
  };

  const handleSelectPartner = (p: any) => {
    setSelectedPartner(p);
    setStep('build');
    loadCollection(user!.uid); // Load my cards initially
  };

  const toggleCard = (card: any, isMyCollection: boolean) => {
     // Logic to add card to offer arrays (simplified)
     const targetSet = isMyCollection ? setMyOffer : setTheirOffer;
     const sourceArr = isMyCollection ? myOffer : theirOffer;
     
     if (sourceArr.some(c => c.id === card.id)) {
         targetSet(prev => prev.filter(c => c.id !== card.id));
     } else {
         targetSet(prev => [...prev, {
             id: card.id,
             name: card.name,
             image_uri: card.image_uris?.small || card.imageUrl,
             is_foil: card.is_foil
         }]);
     }
  };

  const handleSubmit = async () => {
    if (!selectedPartner || !user) return;
    try {
      await addDoc(collection(db, "trades"), {
        proposerId: user.uid,
        proposerName: user.displayName,
        receiverId: selectedPartner.uid,
        receiverName: selectedPartner.displayName,
        participants: [user.uid, selectedPartner.uid],
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
    } catch (e) {
      toast.error("Failed to create trade");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>
            {step === 'user' ? "Select Partner" : `Trade with ${selectedPartner?.displayName}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'user' ? (
          <div className="p-4 space-y-4 h-full">
            <Input 
                placeholder="Search user..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="space-y-2 h-[300px] overflow-y-auto">
               {users.map(u => (
                   <div key={u.uid} onClick={() => handleSelectPartner(u)} className="p-2 hover:bg-muted rounded cursor-pointer border">
                       {u.displayName}
                   </div>
               ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <Tabs defaultValue="give" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2 rounded-none">
                <TabsTrigger value="give" onClick={() => loadCollection(user!.uid)}>You Give ({myOffer.length})</TabsTrigger>
                <TabsTrigger value="get" onClick={() => loadCollection(selectedPartner.uid)}>You Get ({theirOffer.length})</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                 <div className="mb-4 flex gap-2">
                    <DollarSign className="h-4 w-4" />
                    <Input 
                        type="number" 
                        placeholder="Cash Value" 
                        value={activeCollection === myOffer ? myMoney : theirMoney} // Simplified binding logic needed here
                        onChange={e => activeCollection === myOffer ? setMyMoney(e.target.value) : setTheirMoney(e.target.value)}
                    />
                 </div>

                 {loadingCollection ? <p>Loading...</p> : (
                     <div className="grid grid-cols-3 gap-2">
                        {activeCollection.map(card => {
                            const isSelected = (activeCollection === myOffer ? myOffer : theirOffer).some(c => c.id === card.id);
                            return (
                                <div key={card.id} onClick={() => toggleCard(card, activeCollection === myOffer)} className={`relative border rounded ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                                    <img src={card.image_uris?.small || card.imageUrl} className="w-full" />
                                    {isSelected && <div className="absolute top-0 right-0 bg-primary text-white p-1"><Check className="h-3 w-3"/></div>}
                                </div>
                            )
                        })}
                     </div>
                 )}
              </div>
            </Tabs>
            <div className="p-4 border-t flex gap-2">
                {!partner && <Button variant="outline" onClick={() => setStep('user')}>Back</Button>}
                <Button className="flex-1" onClick={handleSubmit}>Send Offer</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};