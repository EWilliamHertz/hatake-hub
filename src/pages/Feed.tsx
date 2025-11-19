import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot, Timestamp, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/hatake-logo.png";
import { PostGallery } from "@/components/PostGallery";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { CommentSection } from "@/components/CommentSection";
import { toast } from "sonner";

interface Post {
  id: string;
  content: string;
  authorId: string;
  author: string;
  authorPhotoURL?: string;
  timestamp: Timestamp | Date;
  likes: string[];
  comments: Array<{
    author: string;
    authorId: string;
    authorPhotoURL?: string;
    content: string;
    timestamp: Timestamp;
  }>;
  hashtags?: string[];
  mediaUrls?: string[];
  mediaTypes?: string[];
}

const Feed = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Listen to posts in real-time
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('timestamp', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const postsData: Post[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          postsData.push({
            id: doc.id,
            content: data.content || '',
            authorId: data.authorId || '',
            author: data.author || 'Unknown',
            authorPhotoURL: data.authorPhotoURL,
            timestamp: data.timestamp || new Date(),
            likes: Array.isArray(data.likes) ? data.likes : [],
            comments: Array.isArray(data.comments) ? data.comments : [],
            hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
            mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls : [],
            mediaTypes: Array.isArray(data.mediaTypes) ? data.mediaTypes : []
          });
        });
        setPosts(postsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Feed error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleLike = async (postId: string, likes: string[]) => {
    if (!user) return;
    
    const postRef = doc(db, 'posts', postId);
    const isLiked = likes.includes(user.uid);
    
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error updating like:', error);
      toast.error('Failed to update like');
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    return parts
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Hatake logo" className="h-16 w-16 rounded-lg" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  HatakeSocial
                </h1>
                <p className="text-sm text-muted-foreground">Your TCG Community</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={() => setIsCreatePostOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Post
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <CreatePostDialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen} />

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading feed...</p>
          </Card>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive mb-2">Error loading feed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="p-4">
              {/* Post Header */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src={post.authorPhotoURL} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(post.author)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{post.author}</h3>
                  <p className="text-xs text-muted-foreground">
                    {post.timestamp instanceof Timestamp 
                      ? post.timestamp.toDate().toLocaleDateString()
                      : new Date(post.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Post Content */}
              <div className="text-sm mb-4 whitespace-pre-wrap">
                {post.content}
              </div>

              {/* Post Media Gallery */}
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <PostGallery 
                  mediaUrls={post.mediaUrls} 
                  mediaTypes={post.mediaTypes || []} 
                />
              )}

              <div className="flex items-center gap-4 pt-3 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => handleLike(post.id, post.likes)}
                >
                  <Heart className={`h-4 w-4 ${post.likes.includes(user?.uid || '') ? 'fill-primary text-primary' : ''}`} />
                  <span className="text-xs">{post.likes.length || 0}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => {
                    const newExpanded = new Set(expandedComments);
                    if (newExpanded.has(post.id)) {
                      newExpanded.delete(post.id);
                    } else {
                      newExpanded.add(post.id);
                    }
                    setExpandedComments(newExpanded);
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">{post.comments.length || 0}</span>
                </Button>
                <Button variant="ghost" size="sm" className="ml-auto">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments Section */}
              {expandedComments.has(post.id) && (
                <div className="pt-3 border-t border-border mt-3">
                  <CommentSection postId={post.id} comments={post.comments} />
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Feed;
