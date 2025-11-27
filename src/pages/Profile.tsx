import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, MapPin, Calendar, Grid, Layers, Image as ImageIcon, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TradingCard } from "@/components/TradingCard";

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
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [collectionPreview, setCollectionPreview] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Profile
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }

        // 2. Fetch Collection Preview (First 6 items)
        const colRef = collection(db, "users", user.uid, "collection");
        const colQuery = query(colRef, orderBy("addedAt", "desc"), limit(6));
        const colSnap = await getDocs(colQuery);
        setCollectionPreview(colSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 3. Fetch User Posts
        const postsRef = collection(db, "posts");
        const postsQuery = query(postsRef, where("authorId", "==", user.uid), orderBy("timestamp", "desc"), limit(10));
        const postsSnap = await getDocs(postsQuery);
        setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) return <div className="p-8 text-center animate-pulse">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Banner Image */}
      <div className="h-32 md:h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative">
        {profile?.bannerURL && (
          <img src={profile.bannerURL} alt="Banner" className="w-full h-full object-cover opacity-80" />
        )}
        <Button 
          variant="secondary" 
          size="icon" 
          className="absolute top-4 right-4 rounded-full bg-black/20 hover:bg-black/40 text-white border-0"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Profile Header */}
      <div className="px-4 relative mb-4">
        <div className="flex justify-between items-end -mt-12 mb-4">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={profile?.photoURL || user?.photoURL || ''} />
            <AvatarFallback className="text-2xl">{profile?.displayName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <Button onClick={() => navigate('/settings')} variant="outline" size="sm">
            Edit Profile
          </Button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{profile?.displayName || user?.displayName}</h1>
            {profile?.isContentCreator && <Badge variant="default" className="bg-blue-500">Creator</Badge>}
            {profile?.isAdmin && <Badge variant="destructive">Admin</Badge>}
          </div>
          
          {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            {profile?.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {profile.location}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Joined {profile?.createdAt?.toDate().toLocaleDateString() || 'Recently'}
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
              <span className="font-bold block text-lg">{collectionPreview.length}</span>
              <span className="text-xs text-muted-foreground">Cards</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="collection" className="w-full">
        <TabsList className="w-full grid grid-cols-4 rounded-none h-12 bg-background border-b">
          <TabsTrigger value="collection" className="data-[state=active]:border-b-2 border-primary rounded-none"><Grid className="h-5 w-5"/></TabsTrigger>
          <TabsTrigger value="decks" className="data-[state=active]:border-b-2 border-primary rounded-none"><Layers className="h-5 w-5"/></TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:border-b-2 border-primary rounded-none"><ImageIcon className="h-5 w-5"/></TabsTrigger>
          <TabsTrigger value="wishlist" className="data-[state=active]:border-b-2 border-primary rounded-none"><Heart className="h-5 w-5"/></TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Recent Adds</h3>
            <Button variant="link" onClick={() => navigate('/collection')} className="text-xs">View All</Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {collectionPreview.map((card: any) => (
              <TradingCard 
                key={card.id} 
                {...card} 
                imageUrl={card.image_uris?.small || card.image_uris?.normal} // Adapt to your data structure
              />
            ))}
            {collectionPreview.length === 0 && <p className="col-span-3 text-center text-muted-foreground text-sm py-8">No cards yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="posts" className="p-4 space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
                {post.imageUrl && <img src={post.imageUrl} className="w-full h-48 object-cover"/>}
                <CardContent className="p-3">
                    <p className="text-sm line-clamp-2">{post.content}</p>
                </CardContent>
            </Card>
          ))}
          {posts.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No posts yet.</p>}
        </TabsContent>

        <TabsContent value="decks" className="p-4 text-center text-muted-foreground">
          <Layers className="h-10 w-10 mx-auto mb-2 opacity-20"/>
          <p>Decks feature coming soon.</p>
        </TabsContent>

        <TabsContent value="wishlist" className="p-4 text-center text-muted-foreground">
          <Heart className="h-10 w-10 mx-auto mb-2 opacity-20"/>
          <p>Wishlist empty.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;