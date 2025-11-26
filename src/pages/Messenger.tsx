import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Ensure current user has a profile in Firestore
    const ensureUserProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          console.log("Creating user profile for:", user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL || '',
            createdAt: new Date(),
          });
        }
      } catch (error) {
        console.error("Error ensuring user profile:", error);
      }
    };
    ensureUserProfile();

    const conversationsRef = collection(db, "conversations");
    const q = query(conversationsRef, where("participants", "array-contains", user.uid));

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
      setMessages(data);
    });

    return () => unsub();
  }, [user, activeConversationId]);

  const loadUsers = async () => {
    if (!user) return;
    
    setLoadingUsers(true);
    try {
      console.log("Loading users from conversations...");
      
      // Get all users from existing conversations
      const conversationsRef = collection(db, "conversations");
      const q = query(conversationsRef, where("participants", "array-contains", user.uid));
      const conversationsSnapshot = await getDocs(q);
      
      const userIds = new Set<string>();
      conversationsSnapshot.forEach((doc) => {
        const participants = doc.data().participants || [];
        participants.forEach((id: string) => {
          if (id !== user.uid) {
            userIds.add(id);
          }
        });
      });
      
      // Fetch user profiles
      const allUsers: UserProfile[] = [];
      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const displayName = data.displayName || data.email?.split('@')[0] || "Unknown User";
            allUsers.push({
              uid: userDoc.id,
              displayName,
              photoURL: (data.photoURL || "") as string,
              email: (data.email || "") as string,
            });
          }
        } catch (err) {
          console.error(`Error fetching user ${userId}:`, err);
        }
      }
      
      console.log(`Loaded ${allUsers.length} users from conversations:`, allUsers.map(u => u.displayName));
      setUsers(allUsers);
    } catch (err: any) {
      console.error("Error loading users:", err);
      toast.error("Failed to load users from conversations");
    } finally {
      setLoadingUsers(false);
    }
  };

  const startChat = async (otherUser: UserProfile) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const conversationsRef = collection(db, "conversations");
      const q = query(conversationsRef, where("participants", "array-contains", user.uid));
      const snapshot = await getDocs(q);
      
      let existingConversationId: string | null = null;
      
      snapshot.forEach((doc) => {
        const participants = doc.data().participants || [];
        if (participants.includes(otherUser.uid)) {
          existingConversationId = doc.id;
        }
      });
      
      if (existingConversationId) {
        setActiveConversationId(existingConversationId);
        setIsNewChatOpen(false);
        return;
      }
      
      // Create new conversation
      const newConversationRef = await addDoc(collection(db, "conversations"), {
        participants: [user.uid, otherUser.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "",
      });
      
      setActiveConversationId(newConversationRef.id);
      setIsNewChatOpen(false);
    } catch (err) {
      console.error("Error creating conversation:", err);
      toast.error("Failed to start conversation");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeConversationId || !newMessage.trim()) return;

    try {
      const messagesRef = collection(db, "conversations", activeConversationId, "messages");
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      // Update conversation's last message
      await setDoc(
        doc(db, "conversations", activeConversationId),
        {
          lastMessage: newMessage.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Load all users on component mount for easier search
  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [user]);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true; // Show all users when no search query
    const haystack = `${u.displayName} ${u.email}`.toLowerCase();
    return haystack.includes(searchQuery.toLowerCase().trim());
  });

  return (
    <div className="min-h-screen bg-background pb-20 flex">
      {/* Chats list */}
      <aside className={`w-full md:w-2/5 border-r border-border ${showMobileChat ? 'hidden md:block' : 'block'}`}>
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-bold">Messenger</h1>
          <Dialog open={isNewChatOpen} onOpenChange={(open) => {
            setIsNewChatOpen(open);
            setSearchQuery("");
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a New Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {loadingUsers ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Loading users...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {searchQuery ? `No users found matching "${searchQuery}"` : "No users available"}
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.uid}
                        onClick={() => startChat(u)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.photoURL} />
                          <AvatarFallback>
                            {u.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
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
        <div className="overflow-y-auto h-[calc(100vh-5rem)]">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => {
                setActiveConversationId(conversation.id);
                setShowMobileChat(true);
              }}
              className={`w-full text-left px-4 py-3 border-b border-border flex items-center gap-3 hover:bg-muted ${
                activeConversationId === conversation.id ? "bg-muted" : ""
              }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={conversation.otherUserPhotoURL} />
                <AvatarFallback>
                  {(conversation.otherUserName || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {conversation.otherUserName || "Chat"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {conversation.lastMessage}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(conversation.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Messages */}
      <main className={`flex-1 flex-col ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="md:hidden" 
              onClick={() => setShowMobileChat(false)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold md:hidden">
              {activeConversationId 
                ? conversations.find(c => c.id === activeConversationId)?.otherUserName || 'Chat'
                : 'Messenger'}
            </h1>
          </div>
          <Dialog open={isNewChatOpen} onOpenChange={(open) => {
            setIsNewChatOpen(open);
            if (open) loadUsers();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="md:hidden">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a New Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => startChat(u)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.photoURL} />
                        <AvatarFallback>
                          {u.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{u.displayName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {activeConversationId ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.senderId === user?.uid ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                    msg.senderId === user?.uid
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p>{msg.text}</p>
                  <p className="text-[10px] opacity-70 mt-1 text-right">
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to start messaging.
            </div>
          )}
        </div>

        {activeConversationId && (
          <form
            onSubmit={handleSend}
            className="border-t border-border px-3 py-2 flex gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <Button type="submit" disabled={!newMessage.trim()}>
              Send
            </Button>
          </form>
        )}
      </main>
    </div>
  );
};

export default Messenger;
