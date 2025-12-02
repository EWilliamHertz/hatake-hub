import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, MapPin, Calendar, Grid, Image as ImageIcon, Repeat } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { TradingCard } from "@/components/TradingCard";
import { TradeOfferDialog } from "@/components/TradeOfferDialog"; // Make sure this component exists and is exported

interface UserProfile {
  displayName: string;
  photoURL: string;
  bio?: string;
  location?: string;
  bannerURL?: string;
  followers?: string[];
  following?: string[];
  isContentCreator?: boolean;
  isAdmin?: boolean;
  createdAt: any;
  badges?: string[];
}

const Profile = () => {
  const { user } = useAuth();
  const { uid } = useParams(); 
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Collection State
  const [userCollection, setUserCollection] = useState<any[]>([]);
  const [userWishlist, setUserWishlist] = useState<any[]>([]);
  const [filteredCards, setFilteredCards] = useState<any[]>([]);
  
  // View State
  const [viewMode, setViewMode] = useState<'collection' | 'wishlist'>('collection');
  const [cardSearch, setCardSearch] = useState("");
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Trade Dialog State
  const [isTradeOpen, setIsTradeOpen] = useState(false);

  const targetUid = uid || user?.uid;
  const isOwnProfile = user?.uid === targetUid;

  useEffect(() => {
    if (!targetUid) return;

    const fetchData = async () => {
      try {
        // 1. Profile
        const docRef = doc(db, "users", targetUid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }

        // 2. Collection (Fetch All)
        const colRef = collection(db, "users", targetUid, "collection");
        const colQuery = query(colRef, orderBy("addedAt", "desc")); 
        const colSnap = await getDocs(colQuery);
        const cards = colSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUserCollection(cards);

        // 3. Wishlist (Fetch All)
        const wishRef = collection(db, "users", targetUid, "wishlist");
        const wishSnap = await getDocs(wishRef);
        const wishlist = wishSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUserWishlist(wishlist);

        // Default view is collection, so set filtered to collection initially
        setFilteredCards(cards);

        // 4. Posts
        const postsRef = collection(db, "posts");
        const postsQuery = query(postsRef, where("authorId", "==", targetUid), orderBy("timestamp", "desc")); // Removed limit for now or keep it
        const postsSnap = await getDocs(postsQuery);
        setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [targetUid]);

  // Filter Logic (Search + View Mode)
  useEffect(() => {
    const sourceData = viewMode === 'collection' ? userCollection : userWishlist;
    
    if (!cardSearch) {
      setFilteredCards(sourceData);
    } else {
      const lower = cardSearch.toLowerCase();
      setFilteredCards(sourceData.filter(c => c.name?.toLowerCase().includes(lower)));
    }
  }, [cardSearch, viewMode, userCollection, userWishlist]);

  if (loading) return <div className="p-8 text-center animate-pulse">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Section */}
      <div className="h-32 md:h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative">
        {profile?.bannerURL && (
          <img src={profile.bannerURL} alt="Banner" className="w-full h-full object-cover opacity-80" />
        )}
        {isOwnProfile && (
          <Button 
            variant="secondary" 
            size="icon" 
            className="absolute top-4 right-4 rounded-full bg-black/20 hover:bg-black/40 text-white border-0"
            onClick={() => navigate('/settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="px-4 relative mb-4">
        <div className="flex justify-between items-end -mt-12 mb-4">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={profile?.photoURL || ''} />
            <AvatarFallback className="text-2xl">{profile?.displayName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          
          <div className="flex gap-2">
            {/* Trade Button (Only for other profiles) */}
            {!isOwnProfile && (
              <Button size="sm" onClick={() => setIsTradeOpen(true)} className="gap-2">
                <Repeat className="h-4 w-4" /> Trade
              </Button>
            )}

            {isOwnProfile ? (
              <Button onClick={() => navigate('/settings')} variant="outline" size="sm">
                Edit Profile
              </Button>
            ) : (
              <Button size="sm" variant="outline">Follow</Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{profile?.displayName || 'User'}</h1>
            {profile?.isContentCreator && <Badge variant="default" className="bg-blue-500">Creator</Badge>}
            {profile?.isAdmin && <Badge variant="destructive">Admin</Badge>}
          </div>

          {profile?.badges && profile.badges.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {profile.badges.map((badge, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs px-1">
                  {badge}
                </Badge>
              ))}
            </div>
          )}
          
          {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            {profile?.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {profile.location}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Joined {profile?.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString() : 'Recently'}
            </div>
          </div>

          <div className="flex gap-4 py-3 border-b border-border">
            <div className="text-center">
              <span className="font-bold block text-lg">{profile?.followers?.length || 0}</span>
              <span className="text-xs text-muted-foreground">Followers</span>
            </div>
            <div className="text-center">
              <span className="font-bold block text-lg">{profile?.following?.length || 0}</span>
              <span className="text-xs text-muted-foreground">Following</span>
            </div>
            <div className="text-center">
              <span className="font-bold block text-lg">{userCollection.length}</span>
              <span className="text-xs text-muted-foreground">Cards</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="w-full grid grid-cols-2 rounded-none h-12 bg-background border-b">
          <TabsTrigger value="cards" className="data-[state=active]:border-b-2 border-primary rounded-none"><Grid className="h-5 w-5"/></TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:border-b-2 border-primary rounded-none"><ImageIcon className="h-5 w-5"/></TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="p-4">
          
          {/* Toggle for Collection / Wishlist */}
          <div className="flex justify-center mb-4">
             <div className="bg-muted p-1 rounded-lg inline-flex">
                <button 
                   className={`px-4 py-1.5 text-sm rounded-md transition-all ${viewMode === 'collection' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                   onClick={() => setViewMode('collection')}
                >
                   Collection ({userCollection.length})
                </button>
                <button 
                   className={`px-4 py-1.5 text-sm rounded-md transition-all ${viewMode === 'wishlist' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                   onClick={() => setViewMode('wishlist')}
                >
                   Wishlist ({userWishlist.length})
                </button>
             </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Grid className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={`Search ${viewMode}...`} 
              className="pl-9"
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
            />
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 sm:gap-2">
            {filteredCards.map((card: any) => (
              <div key={card.id} className="cursor-pointer" onClick={() => {/* Open detail modal */}}>
                 <img 
                   src={card.image_uris?.small || card.image_uris?.normal || card.imageUrl} 
                   alt={card.name}
                   className="w-full aspect-[2.5/3.5] object-cover rounded border bg-muted"
                   loading="lazy"
                 />
              </div>
            ))}
          </div>
          {filteredCards.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No cards found.</p>
          )}
        </TabsContent>

        <TabsContent value="posts" className="p-4 space-y-4">
          {posts.map((post) => (
             <Card key={post.id} className="overflow-hidden">
                 {post.imageUrl && <img src={post.imageUrl} className="w-full h-48 object-cover"/>}
                 <CardContent className="p-3"><p className="text-sm line-clamp-2">{post.content}</p></CardContent>
             </Card>
          ))}
          {posts.length === 0 && <p className="text-center text-muted-foreground py-8">No posts yet.</p>}
        </TabsContent>
      </Tabs>

      {/* Trade Offer Dialog */}
      {!isOwnProfile && (
          <TradeOfferDialog 
            open={isTradeOpen} 
            onOpenChange={setIsTradeOpen} 
            partner={{ uid: targetUid, displayName: profile?.displayName }} 
          />
      )}
    </div>
  );
};

export default Profile;