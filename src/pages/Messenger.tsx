import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  DocumentData,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  limit,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, ArrowLeft, Send, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface ParticipantInfo {
  displayName: string;
  photoURL: string;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt?: any;
  participantInfo?: Record<string, ParticipantInfo>;
  // Legacy support: messages might be stored in an array on the document itself
  messages?: any[]; 
  
  // Computed for display
  otherUserId?: string;
  otherUserName?: string;
  otherUserPhotoURL?: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
}

const Messenger = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Handle ?chat=userId
  useEffect(() => {
    const chatUserId = searchParams.get('chat');
    if (chatUserId && user) {
      const existing = conversations.find(c => c.participants.includes(chatUserId));
      if (existing) {
        setActiveConversationId(existing.id);
      }
    }
  }, [searchParams, user, conversations]);

  // Load Conversations
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Note: Removed orderBy("updatedAt") from query to avoid index errors. 
    // Sorting is done client-side.
    const q = query(
      collection(db, "conversations"), 
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs: Conversation[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const otherId = data.participants.find((p: string) => p !== user.uid);
        
        // Use participantInfo from DB if available, otherwise fallback to defaults
        let otherName = "Unknown User";
        let otherPhoto = "";

        if (otherId && data.participantInfo && data.participantInfo[otherId]) {
          otherName = data.participantInfo[otherId].displayName || "User";
          otherPhoto = data.participantInfo[otherId].photoURL || "";
        }

        convs.push({
          id: docSnap.id,
          participants: data.participants || [],
          lastMessage: data.lastMessage || "",
          updatedAt: data.updatedAt,
          messages: data.messages, // Keep legacy messages array
          participantInfo: data.participantInfo,
          otherUserId: otherId,
          otherUserName: otherName,
          otherUserPhotoURL: otherPhoto
        });
      });

      // Sort by updatedAt desc (newest first)
      convs.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return timeB - timeA;
      });

      setConversations(convs);
    }, (error) => {
      console.error("Error fetching conversations:", error);
      toast.error("Could not load chats");
    });

    return () => unsubscribe();
  }, [user, navigate]);

  // Load Messages (Combines Legacy Array + New Subcollection)
  useEffect(() => {
    if (!activeConversationId || !user) {
      setMessages([]);
      return;
    }

    // 1. Get legacy messages from the conversation document itself
    const activeConv = conversations.find(c => c.id === activeConversationId);
    let combinedMessages: Message[] = [];

    if (activeConv && Array.isArray(activeConv.messages)) {
      combinedMessages = activeConv.messages.map((m: any, idx: number) => ({
        id: `legacy-${idx}`,
        text: m.content || m.text || "",
        senderId: m.senderId,
        createdAt: m.timestamp // Firestore timestamp or string
      }));
    }

    // 2. Listen for NEW messages in subcollection
    const q = query(
      collection(db, "conversations", activeConversationId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];

      // Combine and sort
      const finalMessages = [...combinedMessages, ...newMessages].sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return tA - tB;
      });

      setMessages(finalMessages);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [activeConversationId, conversations]); // Re-run if conversations update (legacy messages might update)

  const loadUsers = async () => {
    if (!user) return;
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, limit(50)); // Global search
      const snapshot = await getDocs(q);
      
      const userList: UserProfile[] = [];
      snapshot.forEach(doc => {
        if (doc.id !== user.uid) {
          userList.push({ uid: doc.id, ...doc.data() } as UserProfile);
        }
      });
      setUsers(userList);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to search users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const startChat = async (otherUser: UserProfile) => {
    if (!user) return;

    // Check local
    const existing = conversations.find(c => c.participants.includes(otherUser.uid));
    if (existing) {
      setActiveConversationId(existing.id);
      setIsNewChatOpen(false);
      return;
    }

    try {
      // Prepare participant info map for faster reads
      const participantInfo = {
        [user.uid]: {
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || ''
        },
        [otherUser.uid]: {
          displayName: otherUser.displayName,
          photoURL: otherUser.photoURL
        }
      };

      const docRef = await addDoc(collection(db, "conversations"), {
        participants: [user.uid, otherUser.uid],
        participantInfo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "",
        isGroupChat: false,
        messages: [] // Initialize empty legacy array to prevent errors if old code reads it
      });
      
      setActiveConversationId(docRef.id);
      setIsNewChatOpen(false);
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to start chat");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeConversationId || !newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage(""); // Clear input immediately

    try {
      // 1. Add to subcollection (New way - Robust)
      await addDoc(collection(db, "conversations", activeConversationId, "messages"), {
        text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      // 2. Update parent document summary
      const conversationRef = doc(db, "conversations", activeConversationId);
      await updateDoc(conversationRef, {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send");
      setNewMessage(text); // Restore text on failure
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      
      const now = new Date();
      const isToday = date.getDate() === now.getDate() && 
                      date.getMonth() === now.getMonth() && 
                      date.getFullYear() === now.getFullYear();
      
      return isToday 
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return "";
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const lower = searchQuery.toLowerCase();
    return u.displayName?.toLowerCase().includes(lower) || u.email?.toLowerCase().includes(lower);
  });

  // Mobile Layout Toggles
  const showSidebar = !isMobile || (isMobile && !activeConversationId);
  const showChat = !isMobile || (isMobile && activeConversationId);

  return (
    <div className="min-h-screen bg-background pb-20 flex">
      {/* --- SIDEBAR LIST --- */}
      <aside className={`${showSidebar ? 'w-full md:w-1/3 lg:w-1/4' : 'hidden md:flex md:w-1/3 lg:w-1/4'} border-r border-border flex flex-col bg-card`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-bold">Messenger</h1>
          <Dialog open={isNewChatOpen} onOpenChange={(val) => {
            setIsNewChatOpen(val);
            if (val) loadUsers();
          }}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search users..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {loadingUsers ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6" /></div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">No users found</p>
                  ) : (
                    filteredUsers.map(u => (
                      <button 
                        key={u.uid} 
                        onClick={() => startChat(u)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Avatar>
                          <AvatarImage src={u.photoURL} />
                          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="font-medium text-sm">{u.displayName}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveConversationId(c.id)}
              className={`w-full flex items-center gap-3 p-4 border-b border-border hover:bg-muted/50 transition-colors text-left ${activeConversationId === c.id ? 'bg-muted' : ''}`}
            >
              <Avatar>
                <AvatarImage src={c.otherUserPhotoURL} />
                <AvatarFallback>{(c.otherUserName?.[0] || '?').toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-semibold text-sm truncate">{c.otherUserName}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                    {formatTime(c.updatedAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {c.lastMessage || <span className="italic">No messages</span>}
                </p>
              </div>
            </button>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No active conversations.
            </div>
          )}
        </div>
      </aside>

      {/* --- CHAT WINDOW --- */}
      <main className={`${showChat ? 'w-full flex' : 'hidden md:flex'} flex-1 flex-col bg-background h-[calc(100vh-4rem)] relative`}>
        {activeConversationId ? (
          <>
            {/* Chat Header */}
            <header className="h-16 border-b border-border flex items-center px-4 gap-3 shadow-sm z-10 bg-card/50 backdrop-blur">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden -ml-2"
                onClick={() => setActiveConversationId(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              {conversations.find(c => c.id === activeConversationId) && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={conversations.find(c => c.id === activeConversationId)?.otherUserPhotoURL} />
                    <AvatarFallback>?</AvatarFallback>
                  </Avatar>
                  <span className="font-semibold">
                    {conversations.find(c => c.id === activeConversationId)?.otherUserName}
                  </span>
                </div>
              )}
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                      msg.senderId === user?.uid 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card border-t border-border">
              <form onSubmit={handleSend} className="flex gap-2 max-w-3xl mx-auto">
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8 opacity-20" />
            </div>
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Messenger;