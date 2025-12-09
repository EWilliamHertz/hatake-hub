import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, Heart, ArrowLeftRight, DollarSign, MessageCircle, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: 'trade_offer' | 'comment' | 'like' | 'message' | 'sale';
  title: string;
  body: string;
  read: boolean;
  link?: string;
  fromUserId?: string;
  fromUserName?: string;
  fromUserPhoto?: string;
  createdAt: any;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'trade_offer': return <ArrowLeftRight className="h-5 w-5 text-primary" />;
    case 'comment': return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case 'like': return <Heart className="h-5 w-5 text-red-500" />;
    case 'message': return <MessageSquare className="h-5 w-5 text-green-500" />;
    case 'sale': return <DollarSign className="h-5 w-5 text-yellow-500" />;
    default: return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!user) return;

    // Mark as read
    if (!notification.read) {
      const notifRef = doc(db, 'users', user.uid, 'notifications', notification.id);
      await updateDoc(notifRef, { read: true });
    }

    // Navigate to link if available
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unreadNotifs = notifications.filter(n => !n.read);
    await Promise.all(
      unreadNotifs.map(n => {
        const notifRef = doc(db, 'users', user.uid, 'notifications', n.id);
        return updateDoc(notifRef, { read: true });
      })
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <CardTitle>Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} unread</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-220px)]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-sm">You'll see updates about trades, messages, and more here</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-accent/50 ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Icon or Avatar */}
                    {notification.fromUserPhoto ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={notification.fromUserPhoto} />
                        <AvatarFallback>
                          {getNotificationIcon(notification.type)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {notification.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.createdAt?.toDate ? 
                          formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) :
                          'Just now'
                        }
                      </p>
                    </div>

                    {/* Read indicator */}
                    {notification.read && (
                      <Check className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
