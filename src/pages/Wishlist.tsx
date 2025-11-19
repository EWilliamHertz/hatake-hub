import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TradingCard } from "@/components/TradingCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Heart } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";

interface WishlistCard {
  id: string;
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
    eur?: number | null;
  };
  game?: string;
}

const Wishlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistCards, setWishlistCards] = useState<WishlistCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { currency, setCurrency, convertPrice } = useCurrency();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const wishlistRef = collection(db, 'users', user.uid, 'wishlist');
    const q = query(wishlistRef);
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const cards: WishlistCard[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          cards.push({
            id: doc.id,
            name: data.name || '',
            set_name: data.set_name || '',
            rarity: data.rarity || '',
            image_uris: data.image_uris,
            prices: data.prices,
            game: data.game
          });
        });
        setWishlistCards(cards);
        setLoading(false);
      },
      (err) => {
        console.error('Wishlist error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, navigate]);

  const handleRemove = async (cardId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'wishlist', cardId));
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Error removing card:', error);
      toast.error('Failed to remove card');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary fill-primary" />
              Wishlist
            </h1>
            <div className="flex gap-2">
              <Button
                variant={currency === 'usd' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrency('usd')}
              >
                USD
              </Button>
              <Button
                variant={currency === 'eur' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrency('eur')}
              >
                EUR
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {wishlistCards.length} {wishlistCards.length === 1 ? 'card' : 'cards'}
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading wishlist...</p>
          </Card>
        ) : wishlistCards.length === 0 ? (
          <Card className="p-8 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Your wishlist is empty</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add cards from search results to start building your wishlist
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {wishlistCards.map((card) => (
              <div key={card.id} className="relative group">
                <TradingCard
                  id={card.id}
                  name={card.name}
                  set={card.set_name}
                  rarity={card.rarity}
                  imageUrl={card.image_uris?.normal || card.image_uris?.large}
                  price={convertPrice(card.prices?.usd)}
                  currency={currency}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(card.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
