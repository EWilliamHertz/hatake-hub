import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockPosts = [
  {
    id: 1,
    user: { name: "Card Master", avatar: null, initials: "CM" },
    content: "Just pulled a rare holographic Charizard! 🔥",
    timestamp: "2h ago",
    likes: 42,
    comments: 8,
  },
  {
    id: 2,
    user: { name: "Deck Builder Pro", avatar: null, initials: "DB" },
    content: "New Lorcana deck is crushing it at locals! Check out my latest build.",
    timestamp: "4h ago",
    likes: 28,
    comments: 5,
  },
  {
    id: 3,
    user: { name: "MTG Collector", avatar: null, initials: "MC" },
    content: "Finally completed my Black Lotus collection! Dreams do come true 🌟",
    timestamp: "6h ago",
    likes: 156,
    comments: 23,
  },
];

const Feed = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            HatakeSocial
          </h1>
          <p className="text-sm text-muted-foreground">Your TCG Community</p>
        </div>
      </header>

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {mockPosts.map((post) => (
          <Card key={post.id} className="p-4">
            {/* Post Header */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarImage src={post.user.avatar || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {post.user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{post.user.name}</h3>
                <p className="text-xs text-muted-foreground">{post.timestamp}</p>
              </div>
            </div>

            {/* Post Content */}
            <p className="text-sm mb-4">{post.content}</p>

            {/* Post Actions */}
            <div className="flex items-center gap-4 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" className="gap-2">
                <Heart className="h-4 w-4" />
                <span className="text-xs">{post.likes}</span>
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{post.comments}</span>
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Feed;
