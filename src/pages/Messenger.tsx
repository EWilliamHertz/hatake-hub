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
import { Plus, Search } from "lucide-react";

interface Chat {
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
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("participants", "array-contains", user.uid));

    const unsub = onSnapshot(q, async (snapshot) => {
      const data: Chat[] = [];
      
      for (const chatDoc of snapshot.docs) {
        const d = chatDoc.data() as DocumentData;
        const participants = d.participants || [];
        const otherUserId = participants.find((id: string) => id !== user.uid);
        
        let otherUserName = "Unknown";
        let otherUserPhotoURL = "";
        
        if (otherUserId) {
          try {
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              otherUserName = userData.displayName || "Unknown";
              otherUserPhotoURL = userData.photoURL || "";
            }
          } catch (err) {
            console.error("Error fetching user:", err);
          }
        }
        
        data.push({
          id: chatDoc.id,
          participants,
          lastMessage: d.lastMessage || "",
          updatedAt: d.updatedAt,
          otherUserName,
          otherUserPhotoURL,
        });
      }
      
      setChats(data);
    });

    return () => unsub();
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !activeChatId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, "chats", activeChatId, "messages");
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
  }, [user, activeChatId]);

  const loadUsers = async () => {
    if (!user) return;
    
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const allUsers: UserProfile[] = [];
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id !== user.uid) {
          allUsers.push({
            uid: doc.id,
            displayName: data.displayName || "Unknown",
            photoURL: data.photoURL || "",
            email: data.email || "",
          });
        }
      });
      
      setUsers(allUsers);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  const startChat = async (otherUser: UserProfile) => {
    if (!user) return;

    try {
      // Check if chat already exists
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef, where("participants", "array-contains", user.uid));
      const snapshot = await getDocs(q);
      
      let existingChatId: string | null = null;
      
      snapshot.forEach((doc) => {
        const participants = doc.data().participants || [];
        if (participants.includes(otherUser.uid)) {
          existingChatId = doc.id;
        }
      });
      
      if (existingChatId) {
        setActiveChatId(existingChatId);
        setIsNewChatOpen(false);
        return;
      }
      
      // Create new chat
      const newChatRef = await addDoc(collection(db, "chats"), {
        participants: [user.uid, otherUser.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "",
      });
      
      setActiveChatId(newChatRef.id);
      setIsNewChatOpen(false);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChatId || !newMessage.trim()) return;

    try {
      const messagesRef = collection(db, "chats", activeChatId, "messages");
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      // Update chat's last message
      await setDoc(
        doc(db, "chats", activeChatId),
        {
          lastMessage: newMessage.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
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

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20 flex">
      {/* Chats list */}
      <aside className="w-2/5 border-r border-border hidden md:block">
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-bold">Messenger</h1>
          <Dialog open={isNewChatOpen} onOpenChange={(open) => {
            setIsNewChatOpen(open);
            setSearchQuery("");
            if (open) loadUsers();
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
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {searchQuery ? "No users found" : "Loading users..."}
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
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`w-full text-left px-4 py-3 border-b border-border flex items-center gap-3 hover:bg-muted ${
                activeChatId === chat.id ? "bg-muted" : ""
              }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={chat.otherUserPhotoURL} />
                <AvatarFallback>
                  {(chat.otherUserName || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {chat.otherUserName || "Chat"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {chat.lastMessage}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(chat.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Messages */}
      <main className="flex-1 flex flex-col">
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-bold md:hidden">Messenger</h1>
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
          {activeChatId ? (
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
              Select a chat to start messaging.
            </div>
          )}
        </div>

        {activeChatId && (
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
