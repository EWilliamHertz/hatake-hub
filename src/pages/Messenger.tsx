import { useEffect, useState } from "react";
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
  setDoc,
  limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt?: any;
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
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const chatUserId = searchParams.get('chat');
    if (chatUserId && user && conversations.length > 0) {
      const existing = conversations.find(c => c.participants.includes(chatUserId));
      if (existing) {
        setActiveConversationId(existing.id);
      }
    }
  }, [searchParams, user, conversations]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const ensureUserProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL || '',
            createdAt: new Date(),
          }, { merge: true });
        }
      } catch (error) {
        console.error("Error ensuring user profile:", error);
      }
    };
    ensureUserProfile();

    const conversationsRef = collection(db, "conversations");
    const q = query(
      conversationsRef, 
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const data: Conversation[] = [];
      
      for (const conversationDoc of snapshot.docs) {
        const d = conversationDoc.data() as DocumentData;
        const participants = d.participants || [];
        const otherUserId = participants.find((id: string) => id !== user.uid);
        
        let otherUserName = "Unknown";
        let otherUserPhotoURL = "";
        
        if (otherUserId) {
          try {
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              otherUserName = userData.displayName || userData.email?.split('@')[0] || "Unknown";
              otherUserPhotoURL = userData.photoURL || "";
            }
          } catch (err) {
            console.error("Error fetching user:", err);
          }
        }
        
        data.push({
          id: conversationDoc.id,
          participants,
          lastMessage: d.lastMessage || "",
          updatedAt: d.updatedAt,
          otherUserName,
          otherUserPhotoURL,
        });
      }
      
      setConversations(data);
    }, (err) => {
      console.error("Error fetching conversations:", err);
      if (err.code === 'failed-precondition') {
        console.warn("Missing index. Creating fallback query without ordering.");
      }
    });

    return () => unsub();
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !activeConversationId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, "conversations", activeConversationId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    console.log("Listening to messages for:", activeConversationId);

    const unsub = onSnapshot(q, (snapshot) => {
      const data: Message[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data() as DocumentData;
        data.push({
          id: doc.id,
          text: d.text || "",
          senderId: d.senderId,
          createdAt: d.createdAt,
        });
      });
      console.log("Messages loaded:", data.length);
      setMessages(data);
    }, (err) => {
      console.error("Error loading messages:", err);
      toast.error("Failed to load messages.");
    });

    return () => unsub();
  }, [user, activeConversationId]);

  const loadUsers = async () => {
    if (!user) return;
    
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, limit(50));
      const usersSnapshot = await getDocs(q);
      
      const allUsers: UserProfile[] = [];
      usersSnapshot.forEach((doc) => {
        if (doc.id === user.uid) return;
        const data = doc.data();
        allUsers.push({
          uid: doc.id,
          displayName: data.displayName || data.email?.split('@')[0] || "Unknown",
          photoURL: (data.photoURL || "") as string,
          email: (data.email || "") as string,
        });
      });
      
      setUsers(allUsers);
    } catch (err: any) {
      console.error("Error loading users:", err);
      toast.error("Failed to load user directory.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const startChat = async (otherUser: UserProfile) => {
    if (!user) return;

    try {
      const existingLocal = conversations.find(c => c.participants.includes(otherUser.uid));
      if (existingLocal) {
        setActiveConversationId(existingLocal.id);
        setIsNewChatOpen(false);
        return;
      }

      const conversationsRef = collection(db, "conversations");
      const q = query(conversationsRef, where("participants", "array-contains", user.uid));
      const snapshot = await getDocs(q);
      
      let existingId: string | null = null;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(otherUser.uid)) {
          existingId = doc.id;
        }
      });

      if (existingId) {
        setActiveConversationId(existingId);
      } else {
        const newRef = await addDoc(collection(db, "conversations"), {
          participants: [user.uid, otherUser.uid],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: "",
        });
        setActiveConversationId(newRef.id);
      }
      
      setIsNewChatOpen(false);
    } catch (err) {
      console.error("Error creating conversation:", err);
      toast.error("Failed to start conversation");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeConversationId || !newMessage.trim()) return;

    const msgText = newMessage.trim();
    setNewMessage("");

    try {
      const messagesRef = collection(db, "conversations", activeConversationId, "messages");
      await addDoc(messagesRef, {
        text: msgText,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "conversations", activeConversationId),
        {
          lastMessage: msgText,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
      setNewMessage(msgText);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    return (
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const showSidebar = !isMobile || (isMobile && !activeConversationId);
  const showChat = !isMobile || (isMobile && activeConversationId);

  return (
    <div className="min-h-screen bg-background pb-20 flex">
      <aside className={`${showSidebar ? 'w-full md:w-2/5' : 'hidden md:flex md:w-2/5'} border-r border-border h-[calc(100vh-5rem)] flex-col`}>
        <div className="px-4 py-4 border-b border-border flex items-center justify-between bg-card">
          <h1 className="text-xl font-bold">Messenger</h1>
          <Dialog open={isNewChatOpen} onOpenChange={(open) => {
            setIsNewChatOpen(open);
            if (open) {
              setSearchQuery("");
              loadUsers();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search user by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {loadingUsers ? (
                    <p className="text-center text-sm text-muted-foreground">Loading...</p>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">No users found.</p>
                  ) : (
                    filteredUsers.map(u => (
                      <div key={u.uid} onClick={() => startChat(u)} className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer">
                        <Avatar>
                          <AvatarImage src={u.photoURL} />
                          <AvatarFallback>{u.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.displayName}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => setActiveConversationId(c.id)}
              className={`flex items-center gap-3 p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${activeConversationId === c.id ? 'bg-muted' : ''}`}
            >
              <Avatar>
                <AvatarImage src={c.otherUserPhotoURL} />
                <AvatarFallback>{(c.otherUserName || '?').substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="font-semibold text-sm truncate">{c.otherUserName}</p>
                  {c.updatedAt && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(c.updatedAt?.toDate ? c.updatedAt.toDate() : c.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.lastMessage || "No messages yet"}</p>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <p>No conversations yet.</p>
              <Button variant="link" onClick={() => setIsNewChatOpen(true)}>Find someone to chat with</Button>
            </div>
          )}
        </div>
      </aside>

      <main className={`${showChat ? 'w-full md:w-3/5' : 'hidden md:flex md:w-3/5'} flex-col h-[calc(100vh-5rem)] bg-background`}>
        {activeConversationId ? (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3 bg-card shadow-sm">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveConversationId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={conversations.find(c => c.id === activeConversationId)?.otherUserPhotoURL} />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <span className="font-semibold">
                  {conversations.find(c => c.id === activeConversationId)?.otherUserName || "Chat"}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Say hello! 👋
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-3 rounded-xl text-sm ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-card border-t border-border">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
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
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Search className="h-8 w-8 opacity-50" />
            </div>
            <p>Select a conversation or start a new one.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Messenger;
