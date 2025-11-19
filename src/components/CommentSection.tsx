import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

interface Comment {
  author: string;
  authorId: string;
  authorPhotoURL?: string;
  content: string;
  timestamp: Timestamp;
}

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
}

export const CommentSection = ({ postId, comments }: CommentSectionProps) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePostComment = async () => {
    if (!user || !newComment.trim()) return;

    setPosting(true);
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        comments: arrayUnion({
          author: user.displayName || 'Anonymous',
          authorId: user.uid,
          authorPhotoURL: user.photoURL || '',
          content: newComment.trim(),
          timestamp: Timestamp.now()
        })
      });
      setNewComment('');
      toast.success('Comment posted!');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-3">
      {comments.length > 0 && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {comments.map((comment, index) => (
            <div key={index} className="flex gap-2 text-sm">
              <Avatar className="h-6 w-6">
                <AvatarImage src={comment.authorPhotoURL} />
                <AvatarFallback className="text-xs">{getInitials(comment.author)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <span className="font-semibold">{comment.author}</span>
                <span className="text-muted-foreground ml-2">{comment.content}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
          disabled={posting}
        />
        <Button 
          size="icon" 
          onClick={handlePostComment} 
          disabled={!newComment.trim() || posting}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
