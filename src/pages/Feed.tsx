import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom"; // ✅ Added Link to imports
import { collection, query, orderBy, limit, onSnapshot, Timestamp, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Plus, User, Settings as SettingsIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/hatake-logo.png";
import { PostGallery } from "@/components/PostGallery";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { CommentSection } from "@/components/CommentSection";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const { user, logout } = useAuth();
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

  const handleLogout = async () => {
    await logout();
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
    return parts.map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      
      {/* Header with Avatar Menu */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex justify-between items-center shadow-sm backdrop-blur-md bg-opacity-90">
        <div className="flex items-center gap-3">
            <img src={logo} alt="Hatake logo" className="h-10 w-10 rounded-full border border-primary/20 shadow-sm" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent tracking-tight">
              HatakeSocial
            </h1>
        </div>

        <div className="flex items-center gap-3">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 cursor-pointer border-2 border-transparent hover:border-primary transition-all">
                        <AvatarImage src={user?.photoURL || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">{getInitials(user?.displayName)}</AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                        <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
                        <LogOut className="mr-2 h-4 w-4" /> Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      {/* Main Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {loading ? (
          <div className="space-y-4">
             {[1, 2, 3].map(i => (
               <Card key={i} className="p-6 h-48 animate-pulse bg-muted/20" />
             ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center border-destructive/50 bg-destructive/5">
            <p className="text-destructive font-medium mb-1">Error loading feed</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">No posts yet</h3>
                <p className="text-sm text-muted-foreground">Be the first to share something!</p>
                <Button className="mt-4" onClick={() => setIsCreatePostOpen(true)}>Create Post</Button>
            </div>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="p-0 overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 pb-2">
                {/* Post Header */}
                <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={post.authorPhotoURL} />
                    <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                        {getInitials(post.author)}
                    </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      {/* ✅ Correctly implemented Link */}
                      <Link to={`/profile/${post.authorId}`} className="font-semibold text-sm truncate hover:underline block">
                        {post.author}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                          {post.timestamp instanceof Timestamp 
                          ? post.timestamp.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : new Date(post.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                </div>

                {/* Post Content */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap mb-2 text-foreground/90">
                    {post.content}
                </div>
                
                {/* Hashtags */}
                {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {post.hashtags.map((tag, idx) => (
                            <span key={idx} className="text-xs text-blue-500 font-medium">#{tag}</span>
                        ))}
                    </div>
                )}
              </div>

              {/* Post Media Gallery (Full Width) */}
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="w-full">
                    <PostGallery 
                        mediaUrls={post.mediaUrls} 
                        mediaTypes={post.mediaTypes || []} 
                    />
                </div>
              )}

              {/* Post Actions */}
              <div className="px-4 py-3 flex items-center gap-1 border-t border-border/50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`gap-1.5 px-2 hover:bg-red-50 hover:text-red-500 ${post.likes.includes(user?.uid || '') ? 'text-red-500' : 'text-muted-foreground'}`}
                  onClick={() => handleLike(post.id, post.likes)}
                >
                  <Heart className={`h-5 w-5 ${post.likes.includes(user?.uid || '') ? 'fill-current' : ''}`} />
                  <span className="text-xs font-medium">{post.likes.length || 0}</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1.5 px-2 text-muted-foreground hover:bg-blue-50 hover:text-blue-500"
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
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-xs font-medium">{post.comments.length || 0}</span>
                </Button>
                
                <Button variant="ghost" size="sm" className="ml-auto px-2 text-muted-foreground hover:bg-muted">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              {/* Comments Section */}
              {expandedComments.has(post.id) && (
                <div className="bg-muted/30 border-t border-border/50">
                  <CommentSection postId={post.id} comments={post.comments} />
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white z-50 transition-transform active:scale-95 hover:scale-105 flex items-center justify-center"
        onClick={() => setIsCreatePostOpen(true)}
      >
        <Plus className="h-7 w-7" />
      </Button>

      <CreatePostDialog 
        open={isCreatePostOpen} 
        onOpenChange={setIsCreatePostOpen}
        onPostCreated={() => {
            toast.success("Post created!");
        }} 
      />
    </div>
  );
};

export default Feed;