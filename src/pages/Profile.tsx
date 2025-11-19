import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TradingCard } from "@/components/TradingCard";
import { UserPlus, UserMinus, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  displayName: string;
  photoURL: string;
  bio?: string;
  followers?: string[];
  following?: string[];
}

interface Post {
  id: string;
  content: string;
  timestamp: any;
  likes: string[];
}

const Profile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setProfile(data);
          setIsFollowing(data.followers?.includes(user?.uid || '') || false);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    // Fetch user's posts
    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, where('authorId', '==', userId), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const postsData: Post[] = [];
      snapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(postsData);
    });

    // Fetch user's collection (first 12 cards)
    const collectionRef = collection(db, 'users', userId, 'collection');
    const collectionQuery = query(collectionRef, limit(12));
    const unsubscribeCards = onSnapshot(collectionQuery, (snapshot) => {
      const cardsData: any[] = [];
      snapshot.forEach((doc) => {
        cardsData.push({ id: doc.id, ...doc.data() });
      });
      setCards(cardsData);
      setLoading(false);
    });

    fetchProfile();

    return () => {
      unsubscribePosts();
      unsubscribeCards();
    };
  }, [userId, user]);

  const handleFollow = async () => {
    if (!user || !userId) return;

    try {
      // This would require a cloud function to properly update both users' following/followers arrays
      toast.info('Following feature requires backend setup');
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
    }
  };

  const handleMessage = () => {
    if (!userId) return;
    navigate(`/messenger?chat=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">User not found</p>
        </Card>
      </div>
    );
  }

  const isOwnProfile = user?.uid === userId;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Profile Header */}
      <Card className="max-w-4xl mx-auto m-4 p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.photoURL} />
            <AvatarFallback>{profile.displayName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            <p className="text-sm text-muted-foreground mb-2">{profile.bio || 'TCG Enthusiast'}</p>
            <div className="flex gap-4 text-sm mb-4">
              <span><strong>{profile.followers?.length || 0}</strong> followers</span>
              <span><strong>{profile.following?.length || 0}</strong> following</span>
              <span><strong>{cards.length}</strong> cards</span>
            </div>
            {!isOwnProfile && (
              <div className="flex gap-2">
                <Button onClick={handleFollow} variant={isFollowing ? 'outline' : 'default'}>
                  {isFollowing ? <UserMinus className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
                <Button onClick={handleMessage} variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Collection Preview */}
      <div className="max-w-4xl mx-auto m-4">
        <h2 className="text-xl font-bold mb-4 px-4">Collection</h2>
        {cards.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 px-4">
            {cards.map((card) => (
              <TradingCard
                key={card.id}
                id={card.id}
                name={card.name}
                set={card.set_name}
                rarity={card.rarity}
                imageUrl={card.image_uris?.normal || card.image_uris?.large}
                isFoil={card.is_foil}
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center mx-4">
            <p className="text-muted-foreground">No cards in collection</p>
          </Card>
        )}
      </div>

      {/* Recent Posts */}
      <div className="max-w-4xl mx-auto m-4">
        <h2 className="text-xl font-bold mb-4 px-4">Recent Posts</h2>
        {posts.length > 0 ? (
          <div className="space-y-4 px-4">
            {posts.map((post) => (
              <Card key={post.id} className="p-4">
                <p className="whitespace-pre-wrap">{post.content}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{post.likes.length} likes</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center mx-4">
            <p className="text-muted-foreground">No posts yet</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profile;
