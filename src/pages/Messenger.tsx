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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

const Messenger = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("participants", "array-contains", user.uid));

    const unsub = onSnapshot(q, (snapshot) => {
      const data: Chat[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data() as DocumentData;
        data.push({
          id: doc.id,
          participants: d.participants || [],
          lastMessage: d.lastMessage || "",
          updatedAt: d.updatedAt,
          otherUserName: d.otherUserName,
          otherUserPhotoURL: d.otherUserPhotoURL,
        });
      });
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChatId || !newMessage.trim()) return;

    const messagesRef = collection(db, "chats", activeChatId, "messages");
    await addDoc(messagesRef, {
      text: newMessage.trim(),
      senderId: user.uid,
      createdAt: serverTimestamp(),
    });

    setNewMessage("");
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

  return (
    <div className="min-h-screen bg-background pb-20 flex">
      {/* Chats list */}
      <aside className="w-2/5 border-r border-border hidden md:block">
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-xl font-bold">Messenger</h1>
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
        <div className="px-4 py-4 border-b border-border md:hidden">
          <h1 className="text-xl font-bold">Messenger</h1>
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
